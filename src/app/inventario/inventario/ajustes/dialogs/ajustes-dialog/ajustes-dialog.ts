import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AjusteFormulario,
  AjusteInventario,
  AlmacenInventarioRef,
  ExistenciaInventario,
  ProductoInventarioRef,
  UsuarioInventarioRef,
} from '../../../gestion-inventario';

export interface AjustesDialogData {
  mode?: 'add' | 'view';
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
  formulario: AjusteFormulario;
  existenciaAnterior = 0;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<AjustesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AjustesDialogData,
  ) {
    const actual = data.ajuste;
    this.formulario = {
      fecha: actual?.fecha || this.fechaLocal(),
      productoId: actual?.productoId ?? data.productoId ?? data.productos[0]?.id ?? 0,
      almacenId: actual?.almacenId ?? data.almacenId ?? 0,
      ajuste: actual?.ajuste ?? 0,
      motivo: actual?.motivo || '',
      usuarioId: actual?.usuarioId ?? data.usuarios[0]?.id ?? null,
    };
    if (!this.formulario.almacenId) {
      this.formulario.almacenId = this.almacenesCompatibles[0]?.id ?? 0;
    }
    if (!this.usuariosCompatibles.some(usuario => usuario.id === this.formulario.usuarioId)) {
      this.formulario.usuarioId = this.usuariosCompatibles[0]?.id ?? null;
    }
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

  get almacenesCompatibles(): AlmacenInventarioRef[] {
    const producto = this.data.productos.find(
      item => item.id === Number(this.formulario.productoId),
    );
    return producto
      ? this.data.almacenes.filter(almacen => almacen.idEmpresa === producto.idEmpresa)
      : this.data.almacenes;
  }

  get usuariosCompatibles(): UsuarioInventarioRef[] {
    const producto = this.data.productos.find(
      item => item.id === Number(this.formulario.productoId),
    );
    return producto
      ? this.data.usuarios.filter(usuario => usuario.idEmpresa === producto.idEmpresa)
      : this.data.usuarios;
  }

  cambiarProducto(): void {
    if (!this.almacenesCompatibles.some(
      almacen => almacen.id === Number(this.formulario.almacenId),
    )) {
      this.formulario.almacenId = this.almacenesCompatibles[0]?.id ?? 0;
    }
    if (!this.usuariosCompatibles.some(usuario => usuario.id === this.formulario.usuarioId)) {
      this.formulario.usuarioId = this.usuariosCompatibles[0]?.id ?? null;
    }
    this.actualizarExistencia();
  }

  cambiarAlmacen(): void {
    if (!this.productosCompatibles.some(
      producto => producto.id === Number(this.formulario.productoId),
    )) {
      this.formulario.productoId = this.productosCompatibles[0]?.id ?? 0;
    }
    this.cambiarProducto();
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
    if (!this.formulario.productoId || !this.formulario.almacenId || !this.formulario.fecha) {
      this.error = 'Selecciona el producto, el almacén y la fecha.';
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
    this.dialogRef.close({ ...this.formulario, fecha: this.formulario.fecha.slice(0, 10), ajuste });
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 10);
  }
}
