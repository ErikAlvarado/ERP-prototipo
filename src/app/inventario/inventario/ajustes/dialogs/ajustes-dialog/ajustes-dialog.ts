import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';


export interface AjustesDialogData {
  mode: 'add' | 'edit';
  ajuste?: any;
}

@Component({
  selector: 'app-ajustes-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './ajustes-dialog.html',
  styleUrl: './ajustes-dialog.css',
})
export class AjustesDialog {

  ajuste: any;

  constructor(
    private dialogRef: MatDialogRef<AjustesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AjustesDialogData
  ) {

    this.ajuste = data.ajuste
      ? { ...data.ajuste }
      : {
          fecha: '',
          producto: '',
          almacen: '',
          anterior: 0,
          ajuste: 0,
          nueva: 0,
          motivo: '',
          usuario: ''
        };

  }

  guardar() {
    this.dialogRef.close(this.ajuste);
  }

}