import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface MarcasDialogData {
  mode: 'add' | 'edit';
  marca?: any;
}

@Component({
  selector: 'app-marcas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './marcas-dialog.html',
  styleUrl: './marcas-dialog.css',
})
export class MarcasDialog {

  marca: any;

  constructor(
    private dialogRef: MatDialogRef<MarcasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MarcasDialogData
  ) {

    this.marca = data.marca
      ? { ...data.marca }
      : {
          nombre: '',
          estado: true
        };

  }

  guardar() {
    this.dialogRef.close(this.marca);
  }

}