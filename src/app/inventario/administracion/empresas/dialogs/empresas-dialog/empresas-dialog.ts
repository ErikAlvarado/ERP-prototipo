import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EmpresaDialogData {
  mode: 'add' | 'edit';
  empresa?: any;
}

@Component({
  selector: 'app-empresas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './empresas-dialog.html',
  styleUrl: './empresas-dialog.css',
})
export class EmpresasDialog {
  empresa: any;

  constructor(
    private dialogRef: MatDialogRef<EmpresasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: EmpresaDialogData
  ) {

    this.empresa = data.empresa
      ? { ...data.empresa }
      : {
          empresa: '',
          razonSocial: '',
          rfc: '',
          direccion: '',
          telefono: '',
          email: '',
          estado: true
        };
  }

  guardar() {
    this.dialogRef.close(this.empresa);
  }
}