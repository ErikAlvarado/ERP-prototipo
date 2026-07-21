import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: any;
}

@Component({
  selector: 'app-product-d',
  imports: [SHARED_IMPORTS, MatIconModule, MatButtonModule, FormsModule],
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
          codigo: null,
          producto: '',
          marca: '',
          categoria: '',
          medida: 'Pieza',
          precio: null,
          pos: true,
          linea: true,
          estado: true,
          tipo: 'Producto' // Añadido para el selector de tipo superior
        };
  }

  guardar() {
    this.dialogRef.close(this.producto);
  }

  cerrar() {
    this.dialogRef.close();
  }
}