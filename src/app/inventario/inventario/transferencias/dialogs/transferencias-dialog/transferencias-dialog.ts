import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface TransferenciasDialogData {
}

@Component({
  selector: 'app-transferencias-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './transferencias-dialog.html',
  styleUrl: './transferencias-dialog.css',
})
export class TransferenciasDialog {

  transferencia: any;

  constructor(
    private dialogRef: MatDialogRef<TransferenciasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TransferenciasDialogData
  ) {

    this.transferencia = {

      folio: '',
      origen: '',
      destino: '',
      producto: '',
      cantidad: 0,
      fecha: '',
      usuario: '',
      estado: 'Pendiente',
      observaciones: ''

    };

  }

  guardar() {
    this.dialogRef.close(this.transferencia);
  }

}