import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface UsuarioDialogData {
  mode: 'add' | 'edit';
  usuario?: any;
}

@Component({
  selector: 'app-usuarios-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './usuarios-dialog.html',
  styleUrl: './usuarios-dialog.css',
})
export class UsuariosDialog {

  usuario: any;

  constructor(
    private dialogRef: MatDialogRef<UsuariosDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UsuarioDialogData
  ) {

    this.usuario = data.usuario
      ? { ...data.usuario }
      : {
          nombre: '',
          usuario: '',
          correo: '',
          telefono: '',
          password: '',
          rol: '',
          almacen: '',
          estado: true
        };

  }

  guardar() {
    this.dialogRef.close(this.usuario);
  }

}