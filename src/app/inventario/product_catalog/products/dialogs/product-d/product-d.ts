import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: any;
}

@Component({
  selector: 'app-product-d',
  imports: [SHARED_IMPORTS],
  templateUrl: './product-d.html',
  styleUrl: './product-d.css',
})
export class ProductD {
    producto: any;

  constructor(
    private dialogRef: MatDialogRef<ProductD>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData
  ) {

    this.producto = data.product
      ? { ...data.product }
      : {
          sku: '',
          codigo: 0,
          producto: '',
          marca: '',
          categoria: '',
          medida: '',
          precio: 0,
          pos: true,
          linea: true,
          estado: true
        };

  }

  guardar() {
    this.dialogRef.close(this.producto);
  }
}
