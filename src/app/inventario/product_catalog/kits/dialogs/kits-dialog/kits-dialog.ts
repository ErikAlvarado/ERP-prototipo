import { CurrencyPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { Kit, KitElemento } from '../../kits';

export interface ProductoKitOption {
  idProducto: string;
  sku: string;
  nombre: string;
  costo: number;
  precio: number;
}

export interface KitDialogData {
  mode: 'add' | 'edit';
  kit?: Kit;
  productos: ProductoKitOption[];
  nombres: string[];
}

@Component({
  selector: 'app-kits-dialog',
  imports: [SHARED_IMPORTS, CurrencyPipe],
  templateUrl: './kits-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './kits-dialog.css'],
})
export class KitsDialog {
  kit: Pick<Kit, 'nombre' | 'descripcion' | 'precio' | 'costo' | 'margen' | 'elementos' | 'estado'>;
  nuevoProductoId = '';
  cantidadNueva = 1;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<KitsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: KitDialogData,
  ) {
    this.kit = data.kit
      ? { nombre: data.kit.nombre, descripcion: data.kit.descripcion, precio: data.kit.precio, costo: data.kit.costo, margen: data.kit.margen, elementos: data.kit.elementos.map(elemento => ({ ...elemento })), estado: data.kit.estado }
      : { nombre: '', descripcion: '', precio: 0, costo: 0, margen: 0, elementos: [], estado: true };
    this.calcularTotales();
  }

  agregarElemento(): void {
    const producto = this.data.productos.find(actual => actual.idProducto === this.nuevoProductoId);
    const cantidad = Math.max(1, Math.floor(Number(this.cantidadNueva) || 1));
    if (!producto) { this.error = 'Selecciona un producto para agregar.'; return; }
    const existente = this.kit.elementos.find(elemento => elemento.idProducto === producto.idProducto);
    if (existente) existente.cantidad += cantidad;
    else this.kit.elementos.push({ ...producto, cantidad });
    this.nuevoProductoId = '';
    this.cantidadNueva = 1;
    this.error = '';
    this.calcularTotales();
  }

  actualizarCantidad(elemento: KitElemento): void {
    elemento.cantidad = Math.max(1, Math.floor(Number(elemento.cantidad) || 1));
    this.calcularTotales();
  }

  removerElemento(index: number): void {
    this.kit.elementos.splice(index, 1);
    this.calcularTotales();
  }

  calcularTotales(): void {
    this.kit.costo = this.kit.elementos.reduce((total, elemento) => total + elemento.costo * elemento.cantidad, 0);
    const precio = Number(this.kit.precio) || 0;
    this.kit.margen = precio > 0 ? Math.round(((precio - this.kit.costo) / precio) * 10000) / 100 : 0;
  }

  guardar(): void {
    const nombre = this.kit.nombre.trim();
    const precio = Number(this.kit.precio);
    this.calcularTotales();
    if (!nombre) { this.error = 'El nombre del kit es obligatorio.'; return; }
    if (this.data.nombres.some(actual => actual.trim().toLowerCase() === nombre.toLowerCase())) { this.error = 'Ya existe un kit con ese nombre.'; return; }
    if (!this.kit.elementos.length) { this.error = 'Agrega al menos un producto al kit.'; return; }
    if (!Number.isFinite(precio) || precio < 0) { this.error = 'El precio no puede ser negativo.'; return; }
    this.dialogRef.close({ ...this.kit, nombre, descripcion: this.kit.descripcion.trim(), precio });
  }
}
