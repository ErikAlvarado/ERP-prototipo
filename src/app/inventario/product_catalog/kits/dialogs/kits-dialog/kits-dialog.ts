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
  stock: number;
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
      ? {
          nombre: data.kit.nombre,
          descripcion: data.kit.descripcion,
          precio: data.kit.precio,
          costo: data.kit.costo,
          margen: data.kit.margen,
          elementos: data.kit.elementos.map(elemento => ({
            ...elemento,
            stock: data.productos.find(producto => producto.idProducto === elemento.idProducto)?.stock || 0,
          })),
          estado: data.kit.estado,
        }
      : { nombre: '', descripcion: '', precio: 0, costo: 0, margen: 0, elementos: [], estado: true };
    this.calcularTotales();
  }

  get stockSeleccionado(): number {
    return this.data.productos.find(producto => producto.idProducto === this.nuevoProductoId)?.stock || 0;
  }

  agregarElemento(): void {
    const producto = this.data.productos.find(actual => actual.idProducto === this.nuevoProductoId);
    const cantidad = Math.max(1, Math.floor(Number(this.cantidadNueva) || 1));
    if (!producto) { this.error = 'Selecciona un producto para agregar.'; return; }
    const existente = this.kit.elementos.find(elemento => elemento.idProducto === producto.idProducto);
    const cantidadTotal = (existente?.cantidad || 0) + cantidad;
    if (producto.stock <= 0) { this.error = `${producto.nombre} no tiene existencias disponibles.`; return; }
    if (cantidadTotal > producto.stock) {
      this.error = `Solo hay ${producto.stock} unidades disponibles de ${producto.nombre}.`;
      return;
    }
    if (existente) existente.cantidad += cantidad;
    else this.kit.elementos.push({ ...producto, cantidad });
    this.nuevoProductoId = '';
    this.cantidadNueva = 1;
    this.error = '';
    this.calcularTotales();
  }

  actualizarCantidad(elemento: KitElemento): void {
    elemento.cantidad = Math.max(1, Math.floor(Number(elemento.cantidad) || 1));
    const producto = this.data.productos.find(actual => actual.idProducto === elemento.idProducto);
    if (!producto || elemento.cantidad > producto.stock) {
      const disponibles = producto?.stock || 0;
      elemento.cantidad = Math.max(1, disponibles);
      this.error = disponibles
        ? `Solo hay ${disponibles} unidades disponibles de ${elemento.nombre}.`
        : `${elemento.nombre} no tiene existencias disponibles.`;
    } else {
      this.error = '';
    }
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
    const sinStock = this.kit.elementos.find(elemento => {
      const stock = this.data.productos.find(producto => producto.idProducto === elemento.idProducto)?.stock || 0;
      return elemento.cantidad > stock;
    });
    if (sinStock) {
      const stock = this.data.productos.find(producto => producto.idProducto === sinStock.idProducto)?.stock || 0;
      this.error = `No puedes usar ${sinStock.cantidad} unidades de ${sinStock.nombre}; solo hay ${stock} disponibles.`;
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) { this.error = 'El precio no puede ser negativo.'; return; }
    this.dialogRef.close({ ...this.kit, nombre, descripcion: this.kit.descripcion.trim(), precio });
  }
}
