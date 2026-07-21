import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface UnidadesDialogData {
  mode: 'add' | 'edit';
  unidad?: any;
}

@Component({
  selector: 'app-unidades-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './unidades-dialog.html',
  styleUrl: './unidades-dialog.css',
})
export class UnidadesDialog {

  unidad: any;

  constructor(
    private dialogRef: MatDialogRef<UnidadesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UnidadesDialogData
  ) {

    this.unidad = data.unidad
      ? { ...data.unidad }
      : {
          nombre: '',
          abreviatura: '',
          estado: true
        };

  }

  guardar() {
    this.dialogRef.close(this.unidad);
  }

}