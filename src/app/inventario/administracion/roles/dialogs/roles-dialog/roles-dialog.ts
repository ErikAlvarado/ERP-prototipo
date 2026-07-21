import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface RolDialogData {
  mode: 'add' | 'edit';
  rol?: any;
}

@Component({
  selector: 'app-roles-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './roles-dialog.html',
  styleUrl: './roles-dialog.css',
})
export class RolesDialog {

  rol: any;

  constructor(
    private dialogRef: MatDialogRef<RolesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: RolDialogData
  ) {

    this.rol = data.rol
      ? { ...data.rol }
      : {
          nombre: '',
          descripcion: '',
          usuarios: 0
        };

  }

  guardar() {
    this.dialogRef.close(this.rol);
  }

}