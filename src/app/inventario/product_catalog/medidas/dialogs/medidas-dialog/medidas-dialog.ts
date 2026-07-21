import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface MedidasDialogData {
  mode: 'add' | 'edit';
  medida?: any;
}

@Component({
  selector: 'app-medidas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './medidas-dialog.html',
  styleUrl: './medidas-dialog.css',
})
export class MedidasDialog {

  medida: any;

  constructor(
    private dialogRef: MatDialogRef<MedidasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MedidasDialogData
  ) {

    this.medida = data.medida
      ? { ...data.medida }
      : {
          valor: 0,
          unidad: '',
        };

  }

  guardar() {
    this.dialogRef.close(this.medida);
  }

}