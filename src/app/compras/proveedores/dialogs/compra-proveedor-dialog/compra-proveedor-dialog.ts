import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '../../../../shared/material/importaciones-material';

export interface ProveedorCompra {
  nombre: string;
  razonSocial: string;
  direccionFiscal: string;
  categoria: string;
  contacto: string;
  correo: string;
  telefono: string;
  calificacion: number;
  ultimaCompra: string;
  totalCompra: string;
  tiempoSurtido: string;
  unidadCompra: string;
  diasLimiteCancelacion: number;
}

interface ProductoCompra {
  id: number;
  nombre: string;
  codigo: string;
  precio: number;
  cantidad: number;
  unidad: string;
  impuesto: number;
  cantidadMaxima: number;
}

export interface CompraRegistrada {
  total: number;
  fecha: Date;
}

@Component({
  selector: 'app-compra-proveedor-dialog',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR],
  templateUrl: './compra-proveedor-dialog.html',
  styleUrl: './compra-proveedor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraProveedorDialog {
  readonly proveedor = inject<ProveedorCompra>(MAT_DIALOG_DATA);
  private readonly referencia = inject(MatDialogRef<CompraProveedorDialog, CompraRegistrada>);
  private readonly constructorFormulario = inject(FormBuilder);
  readonly busquedaProducto = signal('');

  readonly catalogoProductos: readonly ProductoCompra[] = [
    { id: 1, nombre: 'Cable HDMI 2m', codigo: 'PRO-00125', precio: 120, cantidad: 1, unidad: 'Pieza', impuesto: 16, cantidadMaxima: 40 },
    { id: 2, nombre: 'Mouse Óptico USB', codigo: 'PRO-00098', precio: 85, cantidad: 1, unidad: 'Pieza', impuesto: 16, cantidadMaxima: 25 },
    { id: 3, nombre: 'Teclado USB Estándar', codigo: 'PRO-00075', precio: 150, cantidad: 1, unidad: 'Pieza', impuesto: 16, cantidadMaxima: 20 },
    { id: 4, nombre: 'Laptop Dell Latitude 5540', codigo: 'PRO-00210', precio: 17800, cantidad: 1, unidad: 'Pieza', impuesto: 16, cantidadMaxima: 8 },
    { id: 5, nombre: 'Caja de papel carta', codigo: 'PRO-00302', precio: 890, cantidad: 1, unidad: 'Caja', impuesto: 16, cantidadMaxima: 50 },
  ];

  readonly formulario = this.constructorFormulario.nonNullable.group({
    fecha: [new Date(), Validators.required],
    folio: [''],
    almacen: ['Almacén Central', Validators.required],
    condicionesPago: ['Crédito a 30 días', Validators.required],
    notas: [''],
  });

  readonly productos = signal<ProductoCompra[]>([]);

  readonly productosEncontrados = computed(() => {
    const termino = this.normalizar(this.busquedaProducto());
    if (!termino) return [];
    const agregados = new Set(this.productos().map((producto) => producto.id));
    return this.catalogoProductos.filter((producto) =>
      !agregados.has(producto.id) && this.normalizar(`${producto.nombre} ${producto.codigo}`).includes(termino),
    );
  });

  fechaLimiteCancelacion(): Date {
    const fecha = new Date(this.formulario.controls.fecha.value);
    fecha.setDate(fecha.getDate() + this.proveedor.diasLimiteCancelacion);
    return fecha;
  }

  readonly subtotal = computed(() =>
    this.productos().reduce((total, producto) => total + producto.precio * producto.cantidad, 0),
  );
  readonly impuestos = computed(() =>
    this.productos().reduce(
      (total, producto) => total + producto.precio * producto.cantidad * (producto.impuesto / 100),
      0,
    ),
  );
  readonly total = computed(() => this.subtotal() + this.impuestos());

  cambiarCantidad(id: number, cambio: number): void {
    this.productos.update((productos) =>
      productos.map((producto) =>
        producto.id === id
          ? { ...producto, cantidad: Math.min(producto.cantidadMaxima, Math.max(1, producto.cantidad + cambio)) }
          : producto,
      ),
    );
  }

  actualizarProducto(id: number, campo: 'precio' | 'unidad' | 'impuesto', valor: string | number): void {
    this.productos.update((productos) =>
      productos.map((producto) => (producto.id === id ? { ...producto, [campo]: valor } : producto)),
    );
  }

  buscarProducto(valor: string): void {
    this.busquedaProducto.set(valor);
  }

  agregarProducto(producto: ProductoCompra): void {
    this.productos.update((productos) => [...productos, { ...producto }]);
    this.busquedaProducto.set('');
  }

  eliminarProducto(id: number): void {
    this.productos.update((productos) => productos.filter((producto) => producto.id !== id));
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
  }

  cancelar(): void {
    this.referencia.close();
  }

  guardar(): void {
    if (this.formulario.invalid || !this.productos().length) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.referencia.close({ total: this.total(), fecha: this.formulario.controls.fecha.value });
  }
}
