import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface AlmacenesDialogData {
  mode: 'add' | 'edit';
  almacen?: any;
}

@Component({
  selector: 'app-almacenes-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './almacenes-dialog.html',
  styleUrl: './almacenes-dialog.css',
})
export class AlmacenesDialog {

  almacen: any;

  constructor(
    private dialogRef: MatDialogRef<AlmacenesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AlmacenesDialogData
  ) {

    this.almacen = data.almacen
      ? { ...data.almacen }
      : {
          clave: '',
          nombre: '',
          responsable: '',
          telefono: '',
          direccion: '',
          estado: true
        };

  }

  guardar() {
    this.dialogRef.close(this.almacen);
  }

}