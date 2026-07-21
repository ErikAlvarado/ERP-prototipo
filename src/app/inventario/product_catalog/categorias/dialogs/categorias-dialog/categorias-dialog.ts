import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface CategoryDialogData {
  mode: 'add' | 'edit';
  category?: any;
}

@Component({
  selector: 'app-categorias-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './categorias-dialog.html',
  styleUrl: './categorias-dialog.css',
})
export class CategoriasDialog {
  categoria: any;

  constructor(
    private dialogRef: MatDialogRef<CategoriasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryDialogData
  ) {

    this.categoria = data.category
      ? { ...data.category }
      : {
          nombre: '',
          descripcion: '',
          estado: true
        };

  }


  guardar() {
    this.dialogRef.close(this.categoria);
  }
}
