import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../../../shared/services/autenticacion';
import {
  AjusteFormulario,
  AjusteInventario,
  AlmacenInventarioRef,
  ExistenciaInventario,
  ProductoInventarioRef,
  UsuarioInventarioRef,
} from '../../../gestion-inventario';

export interface AjustesDialogData {
  mode?: 'add' | 'edit' | 'view';
  ajuste?: AjusteInventario;
  productos: ProductoInventarioRef[];
  almacenes: AlmacenInventarioRef[];
  usuarios: UsuarioInventarioRef[];
  existencias: ExistenciaInventario[];
  productoId?: number;
  almacenId?: number;
}

@Component({
  selector: 'app-ajustes-dialog',
  imports: [...SHARED_IMPORTS],
  templateUrl: './ajustes-dialog.html',
  styleUrl: './ajustes-dialog.css',
})
export class AjustesDialog {
  private readonly autenticacion = inject(Autenticacion);
  formulario: AjusteFormulario;
  existenciaAnterior = 0;
  productoBusqueda = '';
  productosFiltrados: ProductoInventarioRef[] = [];
  fechaAutomatica = '';
  responsableNombre = '';
  error = '';

  constructor(
    private dialogRef: MatDialogRef<AjustesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AjustesDialogData,
  ) {
    const actual = data.ajuste;
    const productoId = actual?.productoId ?? data.productoId ?? 0;
    const producto = data.productos.find(item => item.id === productoId);
    const usuarioSesion = this.usuarioSesion(producto?.idEmpresa);
    const sesion = this.autenticacion.sesion();
    this.fechaAutomatica = this.soloLectura && actual ? actual.fecha : this.fechaLocal();
    this.responsableNombre = this.soloLectura && actual ? actual.usuario : sesion?.nombre || '';
    this.formulario = {
      fecha: this.fechaAutomatica,
      productoId,
      almacenId: actual?.almacenId ?? data.almacenId ?? 0,
      ajuste: actual?.ajuste ?? 0,
      motivo: actual?.motivo || '',
      usuarioId: this.soloLectura ? actual?.usuarioId ?? null : usuarioSesion?.id ?? null,
      usuarioNombre: this.responsableNombre,
    };
    if (!this.formulario.almacenId && this.formulario.productoId) {
      this.formulario.almacenId = this.almacenesCompatibles[0]?.id ?? 0;
    }
    this.productoBusqueda = this.etiquetaProducto(producto);
    this.actualizarProductosFiltrados();
    if (actual) this.existenciaAnterior = actual.existencia;
    else this.actualizarExistencia();
  }

  get soloLectura(): boolean {
    return this.data.mode === 'view';
  }

  get titulo(): string {
    return this.soloLectura ? `Detalle del ajuste ${this.data.ajuste?.id || ''}` : 'Nuevo ajuste de inventario';
  }

  get nuevaExistencia(): number {
    return this.existenciaAnterior + (Number(this.formulario.ajuste) || 0);
  }

  get pasoCantidad(): number {
    return this.data.productos.find(
      (item) => item.id === Number(this.formulario.productoId),
    )?.permiteDecimales ? .01 : 1;
  }

  get productosCompatibles(): ProductoInventarioRef[] {
    const almacen = this.data.almacenes.find(
      item => item.id === Number(this.formulario.almacenId),
    );
    return almacen
      ? this.data.productos.filter(producto => producto.idEmpresa === almacen.idEmpresa)
      : this.data.productos;
  }

  private actualizarProductosFiltrados(): void {
    const termino = this.normalizar(this.productoBusqueda);
    if (termino.length < 2) {
      this.productosFiltrados = [];
      return;
    }
    const almacen = this.data.almacenes.find(
      item => item.id === Number(this.formulario.almacenId),
    );
    const encontrados: ProductoInventarioRef[] = [];
    for (const producto of this.data.productos) {
      if (almacen && producto.idEmpresa !== almacen.idEmpresa) continue;
      if (termino && !this.normalizar(`${producto.sku} ${producto.nombre}`).includes(termino)) continue;
      encontrados.push(producto);
      if (encontrados.length === 50) break;
    }
    this.productosFiltrados = encontrados;
  }

  get almacenesCompatibles(): AlmacenInventarioRef[] {
    const producto = this.data.productos.find(
      item => item.id === Number(this.formulario.productoId),
    );
    return producto
      ? this.data.almacenes.filter(almacen => almacen.idEmpresa === producto.idEmpresa)
      : this.data.almacenes;
  }

  cambiarProducto(): void {
    if (!this.almacenesCompatibles.some(
      almacen => almacen.id === Number(this.formulario.almacenId),
    )) {
      this.formulario.almacenId = this.almacenesCompatibles[0]?.id ?? 0;
    }
    const producto = this.data.productos.find(
      item => item.id === Number(this.formulario.productoId),
    );
    const sesion = this.autenticacion.sesion();
    this.formulario.usuarioId = this.usuarioSesion(producto?.idEmpresa)?.id ?? null;
    this.formulario.usuarioNombre = sesion?.nombre || '';
    this.responsableNombre = sesion?.nombre || '';
    this.productoBusqueda = this.etiquetaProducto(producto);
    this.actualizarProductosFiltrados();
    this.actualizarExistencia();
  }

  cambiarAlmacen(): void {
    if (this.formulario.productoId && !this.productosCompatibles.some(
      producto => producto.id === Number(this.formulario.productoId),
    )) {
      this.formulario.productoId = 0;
      this.productoBusqueda = '';
      this.existenciaAnterior = 0;
    }
    if (this.formulario.productoId) this.cambiarProducto();
    else this.actualizarProductosFiltrados();
  }

  filtrarProducto(valor: string): void {
    this.productoBusqueda = valor;
    this.actualizarProductosFiltrados();
    const seleccionado = this.data.productos.find(
      item => item.id === Number(this.formulario.productoId),
    );
    if (this.etiquetaProducto(seleccionado) === valor) return;
    this.formulario.productoId = 0;
    this.existenciaAnterior = 0;
  }

  seleccionarProducto(producto: ProductoInventarioRef): void {
    this.formulario.productoId = producto.id;
    this.productoBusqueda = this.etiquetaProducto(producto);
    this.cambiarProducto();
  }

  etiquetaProducto(producto?: ProductoInventarioRef): string {
    return producto ? `${producto.sku} · ${producto.nombre}` : '';
  }

  actualizarExistencia(): void {
    if (this.soloLectura) return;
    this.existenciaAnterior = this.data.existencias.find(
      (item) => item.productoId === Number(this.formulario.productoId)
        && item.almacenId === Number(this.formulario.almacenId),
    )?.stock ?? 0;
  }

  guardar(): void {
    this.error = '';
    const producto = this.data.productos.find(
      (item) => item.id === Number(this.formulario.productoId),
    );
    const almacen = this.data.almacenes.find(
      item => item.id === Number(this.formulario.almacenId),
    );
    const valor = Number(this.formulario.ajuste);
    if (producto && !producto.permiteDecimales && !Number.isInteger(valor)) {
      this.error = `La unidad ${producto.unidad} de ${producto.nombre} sólo acepta cantidades enteras.`;
      return;
    }
    const ajuste = producto?.permiteDecimales
      ? Math.round(valor * 100) / 100
      : Math.round(valor);
    if (!this.formulario.productoId || !this.formulario.almacenId) {
      this.error = 'Selecciona el producto y el almacén.';
      return;
    }
    if (!producto || !almacen || producto.idEmpresa !== almacen.idEmpresa) {
      this.error = 'El producto y el almacén deben pertenecer a la misma empresa.';
      return;
    }
    if (!Number.isFinite(ajuste) || !ajuste) {
      this.error = 'La cantidad del ajuste debe ser diferente de cero.';
      return;
    }
    if (this.existenciaAnterior + ajuste < 0) {
      this.error = 'La existencia resultante no puede ser negativa.';
      return;
    }
    if (!this.formulario.motivo.trim()) {
      this.error = 'Escribe el motivo del ajuste para conservar la trazabilidad.';
      return;
    }
    const sesion = this.autenticacion.sesion();
    if (!sesion) {
      this.error = 'No fue posible identificar al usuario responsable del ajuste.';
      return;
    }
    const responsable = this.usuarioSesion(producto.idEmpresa);
    this.dialogRef.close({
      ...this.formulario,
      fecha: this.fechaLocal(),
      ajuste,
      usuarioId: responsable?.id ?? null,
      usuarioNombre: sesion.nombre,
    });
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 10);
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private usuarioSesion(idEmpresa?: number): UsuarioInventarioRef | undefined {
    const sesion = this.autenticacion.sesion();
    if (!sesion) return undefined;
    return this.data.usuarios.find(usuario =>
      usuario.idEmpresa === idEmpresa
      && usuario.id === Number(sesion.id));
  }
}
