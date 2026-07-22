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
      almacenId: actual?.almacenId ?? data.almacenId ?? data.almacenes[0]?.id ?? 0,
      ajuste: actual?.ajuste ?? 0,
      motivo: actual?.motivo || '',
      usuarioId: actual?.usuarioId ?? data.usuarios[0]?.id ?? null,
    };
    if (actual) this.existenciaAnterior = actual.anterior;
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

  actualizarExistencia(): void {
    if (this.soloLectura) return;
    this.existenciaAnterior = this.data.existencias.find(
      (item) => item.productoId === Number(this.formulario.productoId)
        && item.almacenId === Number(this.formulario.almacenId),
    )?.stock ?? 0;
  }

  guardar(): void {
    this.error = '';
    if (!this.formulario.productoId || !this.formulario.almacenId || !this.formulario.fecha) {
      this.error = 'Selecciona el producto, el almacén y la fecha.';
      return;
    }
    if (!Number(this.formulario.ajuste)) {
      this.error = 'La cantidad del ajuste debe ser diferente de cero.';
      return;
    }
    if (this.nuevaExistencia < 0) {
      this.error = 'La existencia resultante no puede ser negativa.';
      return;
    }
    if (!this.formulario.motivo.trim()) {
      this.error = 'Escribe el motivo del ajuste para conservar la trazabilidad.';
      return;
    }
    this.dialogRef.close({ ...this.formulario, ajuste: Number(this.formulario.ajuste) });
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 16);
  }
}
