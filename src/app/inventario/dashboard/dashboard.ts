import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SHARED_IMPORTS } from '../../shared/imports/shared-imports';
import { DatosDb } from '../../shared/services/datos-db';
import { ContextoInventario, GestionInventario } from '../inventario/gestion-inventario';

interface PrecioDb {
  id_producto: string;
  precio_costo: string;
  precio_venta: string;
  fecha_inicio: string;
}

interface ProductoResumen { name: string; stock: number; }

@Component({
  selector: 'app-dashboard',
  imports: [...SHARED_IMPORTS],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  stockProducts: ProductoResumen[] = [];
  recentMovements: Array<{ name: string; type: string; qty: string }> = [];
  inventoryValue = { totalValue: '$0.00', totalCost: '$0.00', margin: '$0.00' };
  reorderProducts: Array<{ name: string; duration: string; tone: string }> = [];
  expiringProducts: Array<{ name: string; expiration: string }> = [];
  reservedProducts: Array<{ name: string; reservedQty: number }> = [];
  loading = true;

  constructor(private gestionInventario: GestionInventario, private db: DatosDb) {}

  ngOnInit(): void {
    forkJoin({
      contexto: this.gestionInventario.cargar(),
      precios: this.db.leer<PrecioDb>('productos_precios.txt'),
    }).subscribe(({ contexto, precios }) => {
      this.construirResumen(contexto, precios);
      this.loading = false;
    });
  }

  private construirResumen(contexto: ContextoInventario, precios: PrecioDb[]): void {
    const stockPorProducto = new Map<number, number>();
    for (const item of contexto.existencias) {
      stockPorProducto.set(item.productoId, (stockPorProducto.get(item.productoId) ?? 0) + item.stock);
    }

    this.stockProducts = contexto.productos
      .filter((producto) => stockPorProducto.has(producto.id))
      .map((producto) => ({ name: producto.nombre, stock: stockPorProducto.get(producto.id) ?? 0 }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 4);

    this.recentMovements = contexto.movimientos.slice(0, 4).map((item) => ({
      name: item.producto,
      type: item.cantidad >= 0 ? 'Entrada' : 'Salida',
      qty: `${item.cantidad >= 0 ? '+' : ''}${this.formatearCantidad(item.cantidad)}`,
    }));

    const preciosActuales = this.preciosActuales(precios);
    let totalValue = 0;
    let totalCost = 0;
    for (const [productoId, stock] of stockPorProducto) {
      const precio = preciosActuales.get(productoId);
      totalValue += stock * (Number(precio?.precio_venta) || 0);
      totalCost += stock * (Number(precio?.precio_costo) || 0);
    }
    this.inventoryValue = {
      totalValue: this.moneda(totalValue),
      totalCost: this.moneda(totalCost),
      margin: this.moneda(totalValue - totalCost),
    };

    this.reorderProducts = contexto.existencias
      .filter((item) => item.reorden > 0 && item.stock <= item.reorden)
      .sort((a, b) => (a.stock / a.reorden) - (b.stock / b.reorden))
      .slice(0, 4)
      .map((item) => ({
        name: item.producto,
        duration: item.stock <= 0 ? 'Agotado' : `${this.formatearCantidad(item.stock)} / ${this.formatearCantidad(item.reorden)} uds`,
        tone: item.stock <= item.critico ? 'danger' : 'warning',
      }));

    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 90);
    this.expiringProducts = contexto.existencias
      .map((item) => ({ item, fecha: this.fechaValida(item.caducidad) }))
      .filter(({ fecha }) => fecha !== null && fecha >= hoy && fecha <= limite)
      .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime())
      .slice(0, 4)
      .map(({ item, fecha }) => ({ name: item.producto, expiration: this.fecha(fecha!) }));

    const apartados = new Map<string, number>();
    for (const transferencia of contexto.transferencias.filter((item) => item.estado !== 'Recibida' && item.estado !== 'Cancelada')) {
      apartados.set(transferencia.producto, (apartados.get(transferencia.producto) ?? 0) + transferencia.cantidad);
    }
    this.reservedProducts = [...apartados]
      .map(([name, reservedQty]) => ({ name, reservedQty }))
      .sort((a, b) => b.reservedQty - a.reservedQty)
      .slice(0, 4);
  }

  private preciosActuales(precios: PrecioDb[]): Map<number, PrecioDb> {
    const resultado = new Map<number, PrecioDb>();
    for (const precio of precios) {
      const id = Number(precio.id_producto);
      const actual = resultado.get(id);
      if (!actual || precio.fecha_inicio >= actual.fecha_inicio) resultado.set(id, precio);
    }
    return resultado;
  }

  private fechaValida(valor: string): Date | null {
    if (!valor || valor === '—' || valor.includes('â€')) return null;
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatearCantidad(valor: number): string {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor);
  }

  private moneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
  }

  private fecha(valor: Date): string {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(valor);
  }
}
