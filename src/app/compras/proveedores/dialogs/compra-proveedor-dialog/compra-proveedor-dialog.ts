import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '../../../../shared/material/importaciones-material';
import {
  AlmacenCompra,
  ProductoCompra,
  ProveedorCompra,
} from '../../../../shared/services/catalogo-compras';

export interface DatosCompraProveedorDialog {
  proveedor: ProveedorCompra;
  productos: ProductoCompra[];
  almacenes: AlmacenCompra[];
}

export interface PartidaCompraProveedor {
  productoId: number;
  nombre: string;
  sku: string;
  cantidad: number;
  precioUnitario: number;
  impuestoPorcentaje: number;
}

export interface DestinoCompraProveedor {
  almacenId: number;
  almacen: string;
  partidas: PartidaCompraProveedor[];
}

export interface CompraRegistrada {
  total: number;
  fecha: Date;
  fechaEntrega: string;
  notas: string;
  condiciones: 'Contado';
  destinos: DestinoCompraProveedor[];
}

interface DestinoProducto {
  almacenId: number;
  cantidad: number;
}

interface ProductoPedido extends ProductoCompra {
  impuesto: number;
  destinos: DestinoProducto[];
}

@Component({
  selector: 'app-compra-proveedor-dialog',
  imports: [CurrencyPipe, ReactiveFormsModule, IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR],
  templateUrl: './compra-proveedor-dialog.html',
  styleUrl: './compra-proveedor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraProveedorDialog {
  readonly datos = inject<DatosCompraProveedorDialog>(MAT_DIALOG_DATA);
  readonly proveedor = this.datos.proveedor;
  readonly catalogoProductos = this.datos.productos;
  readonly almacenes = this.datos.almacenes;
  private readonly referencia = inject(
    MatDialogRef<CompraProveedorDialog, CompraRegistrada>,
  );
  private readonly constructorFormulario = inject(FormBuilder);
  readonly busquedaProducto = signal('');
  readonly productos = signal<ProductoPedido[]>([]);

  readonly formulario = this.constructorFormulario.nonNullable.group({
    fechaEntrega: [this.fechaInicial(), Validators.required],
    notas: [''],
  });

  readonly productosEncontrados = computed(() => {
    const termino = this.normalizar(this.busquedaProducto());
    if (!termino) return [];
    const agregados = new Set(this.productos().map(producto => producto.id));
    return this.catalogoProductos.filter(producto =>
      !agregados.has(producto.id)
      && this.normalizar(
        `${producto.nombre} ${producto.sku} ${producto.codigo} ${producto.skuProveedor}`,
      ).includes(termino));
  });

  readonly subtotal = computed(() =>
    this.productos().reduce(
      (total, producto) =>
        total + producto.precio * this.cantidadTotal(producto),
      0,
    ),
  );
  readonly impuestos = computed(() =>
    this.productos().reduce(
      (total, producto) =>
        total
        + producto.precio
          * this.cantidadTotal(producto)
          * (producto.impuesto / 100),
      0,
    ),
  );
  readonly total = computed(() => this.subtotal() + this.impuestos());
  readonly productosValidos = computed(() =>
    this.productos().length > 0
    && this.productos().every(producto => this.productoValido(producto)),
  );

  buscarProducto(valor: string): void {
    this.busquedaProducto.set(valor);
  }

  agregarProducto(producto: ProductoCompra): void {
    if (
      !this.proveedor.activo
      || !this.almacenes.length
      || this.productos().some(item => item.id === producto.id)
    ) {
      return;
    }
    this.productos.update(productos => [
      ...productos,
      {
        ...producto,
        impuesto: 16,
        destinos: [{
          almacenId: this.almacenes[0].id,
          cantidad: Math.max(1, producto.cantidadMinima),
        }],
      },
    ]);
    this.busquedaProducto.set('');
  }

  eliminarProducto(idProducto: number): void {
    this.productos.update(productos =>
      productos.filter(producto => producto.id !== idProducto));
  }

  agregarDestino(idProducto: number): void {
    this.productos.update(productos => productos.map(producto => {
      if (producto.id !== idProducto) return producto;
      const usados = new Set(producto.destinos.map(destino => destino.almacenId));
      const almacen = this.almacenes.find(item => !usados.has(item.id));
      if (!almacen) return producto;
      return {
        ...producto,
        destinos: [...producto.destinos, { almacenId: almacen.id, cantidad: 1 }],
      };
    }));
  }

  quitarDestino(idProducto: number, indice: number): void {
    this.productos.update(productos => productos.map(producto =>
      producto.id === idProducto && producto.destinos.length > 1
        ? {
            ...producto,
            destinos: producto.destinos.filter((_, actual) => actual !== indice),
          }
        : producto));
  }

  actualizarAlmacen(
    idProducto: number,
    indice: number,
    almacenId: number,
  ): void {
    this.productos.update(productos => productos.map(producto => {
      if (
        producto.id !== idProducto
        || producto.destinos.some(
          (destino, actual) =>
            actual !== indice && destino.almacenId === Number(almacenId),
        )
      ) {
        return producto;
      }
      return {
        ...producto,
        destinos: producto.destinos.map((destino, actual) =>
          actual === indice
            ? { ...destino, almacenId: Number(almacenId) }
            : destino),
      };
    }));
  }

  actualizarCantidad(
    idProducto: number,
    indice: number,
    cantidad: number,
  ): void {
    const valor = Math.max(1, Math.floor(Number(cantidad) || 1));
    this.productos.update(productos => productos.map(producto =>
      producto.id === idProducto
        ? {
            ...producto,
            destinos: producto.destinos.map((destino, actual) =>
              actual === indice ? { ...destino, cantidad: valor } : destino),
          }
        : producto));
  }

  actualizarPrecio(idProducto: number, precio: number): void {
    const valor = Math.max(0, Number(precio) || 0);
    this.productos.update(productos => productos.map(producto =>
      producto.id === idProducto ? { ...producto, precio: valor } : producto));
  }

  actualizarImpuesto(idProducto: number, impuesto: number): void {
    const valor = Number(impuesto);
    if (![0, 8, 16].includes(valor)) return;
    this.productos.update(productos => productos.map(producto =>
      producto.id === idProducto ? { ...producto, impuesto: valor } : producto));
  }

  cantidadTotal(producto: ProductoPedido): number {
    return producto.destinos.reduce(
      (total, destino) => total + destino.cantidad,
      0,
    );
  }

  puedeAgregarDestino(producto: ProductoPedido): boolean {
    return producto.destinos.length < this.almacenes.length;
  }

  almacenDisponible(
    producto: ProductoPedido,
    almacenId: number,
    indiceActual: number,
  ): boolean {
    return !producto.destinos.some(
      (destino, indice) =>
        indice !== indiceActual && destino.almacenId === almacenId,
    );
  }

  stockEnAlmacen(producto: ProductoPedido, almacenId: number): number {
    return producto.existencias.find(
      existencia => existencia.almacenId === almacenId,
    )?.stock ?? 0;
  }

  resumenExistencias(producto: ProductoCompra): string {
    if (!producto.existencias.length) return 'Sin stock registrado';
    return producto.existencias
      .map(existencia => `${existencia.almacen}: ${existencia.stock}`)
      .join(' · ');
  }

  importeProducto(producto: ProductoPedido): number {
    return producto.precio
      * this.cantidadTotal(producto)
      * (1 + producto.impuesto / 100);
  }

  cancelar(): void {
    this.referencia.close();
  }

  guardar(): void {
    if (
      !this.proveedor.activo
      || this.formulario.invalid
      || !this.productosValidos()
    ) {
      this.formulario.markAllAsTouched();
      return;
    }
    const destinos = new Map<number, DestinoCompraProveedor>();
    for (const producto of this.productos()) {
      for (const asignacion of producto.destinos) {
        const almacen = this.almacenes.find(
          item => item.id === asignacion.almacenId,
        );
        if (!almacen) return;
        const destino = destinos.get(almacen.id) || {
          almacenId: almacen.id,
          almacen: almacen.nombre,
          partidas: [],
        };
        destino.partidas.push({
          productoId: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          cantidad: asignacion.cantidad,
          precioUnitario: producto.precio,
          impuestoPorcentaje: producto.impuesto,
        });
        destinos.set(almacen.id, destino);
      }
    }
    this.referencia.close({
      total: this.total(),
      fecha: new Date(),
      fechaEntrega: this.formatearFecha(this.formulario.controls.fechaEntrega.value),
      notas: this.formulario.controls.notas.value.trim(),
      condiciones: 'Contado',
      destinos: [...destinos.values()],
    });
  }

  private productoValido(producto: ProductoPedido): boolean {
    const almacenes = producto.destinos.map(destino => destino.almacenId);
    return producto.precio > 0
      && producto.destinos.length > 0
      && new Set(almacenes).size === almacenes.length
      && producto.destinos.every(destino =>
        this.almacenes.some(almacen => almacen.id === destino.almacenId)
        && Number.isInteger(destino.cantidad)
        && destino.cantidad > 0)
      && this.cantidadTotal(producto) >= producto.cantidadMinima;
  }

  private fechaInicial(): Date {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 7);
    return fecha;
  }

  private formatearFecha(fecha: Date): string {
    const valor = new Date(fecha);
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim();
  }
}
