import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { Medida, UnidadMedidaOption } from '../../medidas';

export interface MedidasDialogData {
  mode: 'add' | 'edit';
  medida?: Medida;
  unidades: UnidadMedidaOption[];
  existentes: string[];
}

@Component({
  selector: 'app-medidas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './medidas-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './medidas-dialog.css'],
})
export class MedidasDialog {
  medida: Pick<Medida, 'valor' | 'unidadId' | 'estado'>;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<MedidasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MedidasDialogData,
  ) {
    this.medida = data.medida
      ? { valor: data.medida.valor, unidadId: data.medida.unidadId, estado: data.medida.estado }
      : { valor: 1, unidadId: data.unidades[0]?.id || '', estado: true };
  }

  guardar(): void {
    const valor = Number(this.medida.valor);
    if (!Number.isFinite(valor) || valor <= 0) { this.error = 'El valor debe ser mayor que cero.'; return; }
    if (!this.medida.unidadId) { this.error = 'Selecciona una unidad.'; return; }
    if (this.data.existentes.includes(`${valor}|${this.medida.unidadId}`)) {
      this.error = 'Ya existe esa combinación de valor y unidad.';
      return;
    }
    this.dialogRef.close({ ...this.medida, valor });
  }
}
