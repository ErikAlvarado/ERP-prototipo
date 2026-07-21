import { Component, Inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface KitDialogData {
  mode: 'add' | 'edit';
  kit?: any;
}

@Component({
  selector: 'app-kits-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './kits-dialog.html',
  styleUrl: './kits-dialog.css',
})
export class KitsDialog {
  kit: any;
  nuevoProductoSeleccionado: any = null;

  misProductos = [
    { id_producto: 1, nombre_producto: 'Producto A' },
    { id_producto: 2, nombre_producto: 'Producto B' },
    { id_producto: 3, nombre_producto: 'Producto C' },
    { id_producto: 4, nombre_producto: 'Hardware X' }
  ];

  constructor(
    private dialogRef: MatDialogRef<KitsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: KitDialogData
  ) {
    this.kit = data.kit
      ? { ...data.kit, elementos: [...data.kit.elementos] }
      : {
          nombre: '',
          descripcion: '',
          precio: 0,
          costo: 0,
          margen: 0,
          elementos: [],
          fecha: new Date().toISOString().split('T')[0],
          estado: true
        };
  }

  calcularMargen() {
    if (this.kit.precio > 0) {
      const ganancia = this.kit.precio - this.kit.costo;
      this.kit.margen = Math.round((ganancia / this.kit.precio) * 100);
    } else {
      this.kit.margen = 0;
    }
  }

  agregarElemento() {
    const prod = this.nuevoProductoSeleccionado;
    
    if (prod && !this.kit.elementos.some((item: any) => item.id_producto === prod.id_producto)) {
      this.kit.elementos.push({
        id_producto: prod.id_producto,
        nombre_producto: prod.nombre_producto
      });
      this.nuevoProductoSeleccionado = null;
    }
  }

  removerElemento(index: number) {
    this.kit.elementos.splice(index, 1);
  }

  guardar() {
    this.dialogRef.close(this.kit);
  }
}