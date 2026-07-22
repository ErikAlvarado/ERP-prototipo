import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AlmacenInventarioRef,
  ExistenciaInventario,
  ProductoInventarioRef,
  TransferenciaFormulario,
  TransferenciaInventario,
  UsuarioInventarioRef,
} from '../../../gestion-inventario';

export interface TransferenciasDialogData {
  mode: 'add' | 'edit' | 'view';
  transferencia?: TransferenciaInventario;
  productos: ProductoInventarioRef[];
  almacenes: AlmacenInventarioRef[];
  usuarios: UsuarioInventarioRef[];
  estados: string[];
  existencias: ExistenciaInventario[];
}

@Component({
  selector: 'app-transferencias-dialog',
  imports: [...SHARED_IMPORTS],
  templateUrl: './transferencias-dialog.html',
  styleUrl: './transferencias-dialog.css',
})
export class TransferenciasDialog {
  formulario: TransferenciaFormulario;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<TransferenciasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TransferenciasDialogData,
  ) {
    const actual = data.transferencia;
    this.formulario = {
      fecha: actual?.fecha || this.fechaLocal(),
      productoId: actual?.productoId ?? data.productos[0]?.id ?? 0,
      origenId: actual?.origenId ?? data.almacenes[0]?.id ?? 0,
      destinoId: actual?.destinoId ?? data.almacenes.find((item) => item.id !== data.almacenes[0]?.id)?.id ?? 0,
      cantidad: actual?.cantidad ?? 1,
      usuarioId: actual?.usuarioId ?? data.usuarios[0]?.id ?? null,
      estado: actual?.estado || (data.estados.includes('Pendiente') ? 'Pendiente' : data.estados[0] || 'Pendiente'),
      observaciones: actual?.observaciones || '',
    };
  }

  get soloLectura(): boolean {
    return this.data.mode === 'view';
  }

  get titulo(): string {
    if (this.data.mode === 'view') return `Transferencia ${this.data.transferencia?.folio}`;
    return this.data.mode === 'edit' ? 'Editar transferencia' : 'Nueva transferencia';
  }

  get stockOrigen(): number {
    return this.data.existencias.find(
      (item) => item.productoId === Number(this.formulario.productoId)
        && item.almacenId === Number(this.formulario.origenId),
    )?.stock ?? 0;
  }

  get unidadProducto(): string {
    return this.data.productos.find((item) => item.id === Number(this.formulario.productoId))?.unidad || 'unidades';
  }

  guardar(): void {
    this.error = '';
    if (!this.formulario.productoId || !this.formulario.origenId || !this.formulario.destinoId || !this.formulario.fecha) {
      this.error = 'Completa el producto, los almacenes y la fecha.';
      return;
    }
    if (Number(this.formulario.origenId) === Number(this.formulario.destinoId)) {
      this.error = 'El almacén de origen y el de destino deben ser diferentes.';
      return;
    }
    if (Number(this.formulario.cantidad) <= 0) {
      this.error = 'La cantidad debe ser mayor que cero.';
      return;
    }
    if (Number(this.formulario.cantidad) > this.stockOrigen) {
      this.error = `La cantidad supera la existencia disponible en el almacén de origen (${this.stockOrigen} ${this.unidadProducto}).`;
      return;
    }
    this.dialogRef.close({ ...this.formulario, cantidad: Number(this.formulario.cantidad) });
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 16);
  }
}
