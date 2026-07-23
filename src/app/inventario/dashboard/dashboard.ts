import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { SHARED_IMPORTS } from '../../shared/imports/shared-imports';
import {
  CatalogoProductos,
  ProductoCatalogo,
} from '../../shared/services/catalogo-productos';
import {
  ContextoInventario,
  GestionInventario,
} from '../inventario/gestion-inventario';

interface ProductoStock {
  id: number;
  sku: string;
  name: string;
  stock: number;
  unidad: string;
}

interface MovimientoResumen {
  id: string;
  productoId: number;
  name: string;
  type: string;
  qty: string;
  fecha: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [...SHARED_IMPORTS, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  stockProducts: ProductoStock[] = [];
  recentMovements: MovimientoResumen[] = [];
  reorderProducts: Array<{
    id: number;
    name: string;
    almacen: string;
    stock: string;
    tone: string;
  }> = [];
  outOfStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    status: string;
  }> = [];
  reservedProducts: Array<{
    id: number;
    name: string;
    reservedQty: number;
    unidad: string;
  }> = [];
  inventoryValue = {
    totalValue: '$0.00',
    totalCost: '$0.00',
    margin: '$0.00',
    marginPercent: '0%',
  };
  error = '';

  constructor(
    private gestion: GestionInventario,
    private catalogo: CatalogoProductos,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.error = '';
    combineLatest({
      contexto: this.gestion.cargar(),
      productosCatalogo: this.catalogo.cargar(),
    }).subscribe({
      next: ({ contexto, productosCatalogo }) =>
        this.construir(contexto, productosCatalogo),
      error: () => this.error = 'No fue posible leer los archivos de la base de datos del inventario.',
    });
  }

  private construir(
    contexto: ContextoInventario,
    productosCatalogo: ProductoCatalogo[],
  ): void {
    if (!contexto.productos.length) {
      this.error = 'No se encontraron productos registrados.';
      return;
    }
    const productos = new Map(contexto.productos.map((producto) => [producto.id, producto]));
    const stock = new Map<number, number>();
    for (const existencia of contexto.existencias) {
      stock.set(
        existencia.productoId,
        (stock.get(existencia.productoId) || 0) + existencia.stock,
      );
    }

    this.stockProducts = contexto.productos
      .map((producto) => ({
        id: producto.id,
        sku: producto.sku,
        name: producto.nombre,
        stock: stock.get(producto.id) || 0,
        unidad: producto.unidad,
      }))
      .filter((producto) => producto.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    this.recentMovements = [...contexto.movimientos]
      .sort((a, b) =>
        this.fechaMs(b.fecha) - this.fechaMs(a.fecha) || this.numeroId(b.id) - this.numeroId(a.id))
      .slice(0, 5)
      .map((movimiento) => ({
        id: movimiento.id,
        productoId: movimiento.productoId,
        name: movimiento.producto,
        type: movimiento.tipo,
        qty: `${movimiento.cantidad >= 0 ? '+' : ''}${this.cantidad(movimiento.cantidad)}`,
        fecha: this.formatearFecha(movimiento.fecha),
      }));

    const precios = new Map(
      productosCatalogo
        .filter(producto => producto.estado)
        .map(producto => [producto.id, { venta: producto.precio, costo: producto.costo }]),
    );
    let venta = 0;
    let costo = 0;
    for (const producto of contexto.productos) {
      const existencia = stock.get(producto.id) || 0;
      const precio = precios.get(producto.id);
      venta += existencia * this.numero(precio?.venta);
      costo += existencia * this.numero(precio?.costo);
    }
    const utilidad = venta - costo;
    this.inventoryValue = {
      totalValue: this.moneda(venta),
      totalCost: this.moneda(costo),
      margin: this.moneda(utilidad),
      marginPercent: costo ? `${((utilidad / costo) * 100).toFixed(1)}%` : '0%',
    };

    this.reorderProducts = contexto.existencias
      .filter((existencia) =>
        existencia.inicializada
        && existencia.reorden > 0
        && existencia.stock <= existencia.reorden)
      .sort((a, b) =>
        (a.stock / Math.max(a.reorden, 1)) - (b.stock / Math.max(b.reorden, 1)))
      .slice(0, 5)
      .map((existencia) => ({
        id: existencia.productoId,
        name: existencia.producto,
        almacen: existencia.almacen,
        stock: `${this.cantidad(existencia.stock)} / ${this.cantidad(existencia.reorden)} ${existencia.unidad}`,
        tone: existencia.stock <= existencia.critico ? 'danger' : 'warning',
      }));

    this.outOfStockProducts = contexto.productos
      .filter((producto) => (stock.get(producto.id) || 0) <= 0)
      .map((producto) => {
        const existencias = contexto.existencias.filter(
          (item) => item.productoId === producto.id,
        );
        return {
          id: producto.id,
          name: producto.nombre,
          sku: producto.sku,
          status: existencias.some((item) => item.inicializada) ? 'Agotado' : 'Sin inicializar',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);

    const comprometido = new Map<number, number>();
    for (const transferencia of contexto.transferencias.filter(
      (item) => this.gestion.comprometeStockTransferencia(item.estado),
    )) {
      for (const partida of transferencia.partidas) {
        const cantidad = this.gestion.cantidadComprometida(partida);
        comprometido.set(
          partida.productoId,
          (comprometido.get(partida.productoId) || 0) + cantidad,
        );
      }
    }
    this.reservedProducts = [...comprometido]
      .map(([id, reservedQty]) => {
        const producto = productos.get(id);
        return {
          id,
          name: producto?.nombre || `Producto #${id}`,
          reservedQty,
          unidad: producto?.unidad || 'uds',
        };
      })
      .filter((item) => item.reservedQty > 0)
      .sort((a, b) => b.reservedQty - a.reservedQty)
      .slice(0, 5);
  }

  private numero(valor: string | number | undefined): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private cantidad(valor: number): string {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor);
  }

  private moneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(valor);
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 10);
  }

  private fechaMs(valor: string): number {
    if (!valor) return 0;
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }

  private formatearFecha(valor: string): string {
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime())
      ? valor
      : new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(fecha);
  }

  private numeroId(id: string): number {
    const numeros = id.match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : 0;
  }
}
