import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  OpcionProducto,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../../../../shared/services/catalogo-productos';

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: ProductoCatalogo;
  opciones: OpcionesProducto;
  productos: ProductoCatalogo[];
}

@Component({
  selector: 'app-product-d',
  imports: [SHARED_IMPORTS],
  templateUrl: './product-d.html',
  styleUrl: './product-d.css',
})
export class ProductD {
  producto: ProductoCatalogo;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<ProductD>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
  ) {
    this.producto = { ...this.crearProductoVacio(data.opciones), ...(data.product || {}) };
  }

  get tiposDisponibles(): string[] {
    return [...new Set([this.producto.tipo, 'Físico', 'Servicio', 'Digital'].filter(Boolean))];
  }

  get estatusDisponibles(): string[] {
    return ['Vigente', 'Eliminado', 'Descontinuado'];
  }

  cambiarEmpresa(id: number): void {
    this.producto.empresa = this.nombreOpcion(this.data.opciones.empresas, id, this.producto.empresa);
  }

  cambiarMarca(id: number): void {
    this.producto.marca = this.nombreOpcion(this.data.opciones.marcas, id, this.producto.marca);
  }

  cambiarCategoria(id: number): void {
    this.producto.categoria = this.nombreOpcion(this.data.opciones.categorias, id, this.producto.categoria);
  }

  cambiarUnidad(id: number): void {
    this.producto.medida = this.nombreOpcion(this.data.opciones.unidades, id, this.producto.medida);
  }

  cambiarEstatus(estatus: string): void {
    this.producto.estatus = estatus;
    this.producto.estado = estatus.toLocaleLowerCase() === 'vigente';
  }

  guardar(): void {
    this.error = '';
    const nombre = this.producto.producto.trim();
    const sku = this.producto.sku.trim();
    const codigo = String(this.producto.codigo || '').trim();

    if (!nombre) {
      this.error = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!sku) {
      this.error = 'El SKU es obligatorio.';
      return;
    }
    if (!this.producto.idEmpresa || !this.producto.idMarca || !this.producto.idCategoria || !this.producto.idUnidad) {
      this.error = 'Selecciona empresa, marca, categoría y unidad.';
      return;
    }
    if (this.data.productos.some(producto => producto.id !== this.producto.id && producto.sku.trim().toLocaleLowerCase() === sku.toLocaleLowerCase())) {
      this.error = 'Ya existe otro producto con ese SKU.';
      return;
    }
    if (codigo && this.data.productos.some(producto => producto.id !== this.producto.id && producto.codigo === codigo)) {
      this.error = 'Ya existe otro producto con ese código de barras.';
      return;
    }
    if (Number(this.producto.precio) < 0 || Number(this.producto.costo) < 0) {
      this.error = 'El precio y el costo no pueden ser negativos.';
      return;
    }

    const precio = Number(this.producto.precio) || 0;
    const costo = Number(this.producto.costo) || 0;
    const margen = precio > 0 ? Number((((precio - costo) / precio) * 100).toFixed(2)) : 0;
    const hoy = new Date().toISOString().slice(0, 10);

    this.dialogRef.close({
      ...this.producto,
      producto: nombre,
      sku,
      codigo,
      descripcion: this.producto.descripcion.trim(),
      tipo: this.producto.tipo.trim(),
      estatus: this.producto.estatus.trim(),
      estado: this.producto.estatus.trim().toLocaleLowerCase() === 'vigente',
      ubicacionDefault: this.producto.ubicacionDefault.trim(),
      claveSat: this.producto.claveSat.trim(),
      precio,
      costo,
      margen,
      fechaCreacion: this.producto.fechaCreacion || hoy,
      fechaActualizacion: hoy,
    } satisfies ProductoCatalogo);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private crearProductoVacio(opciones: OpcionesProducto): ProductoCatalogo {
    const empresa = opciones.empresas[0];
    const marca = opciones.marcas[0];
    const categoria = opciones.categorias[0];
    const unidad = opciones.unidades[0];
    const hoy = new Date().toISOString().slice(0, 10);

    return {
      id: 0,
      idEmpresa: empresa?.id || 0,
      empresa: empresa?.nombre || '',
      sku: '',
      codigo: '',
      producto: '',
      descripcion: '',
      tipo: 'Físico',
      idMarca: marca?.id || 0,
      marca: marca?.nombre || '',
      idCategoria: categoria?.id || 0,
      categoria: categoria?.nombre || '',
      idUnidad: unidad?.id || 0,
      medida: unidad?.nombre || '',
      estatus: 'Vigente',
      precio: 0,
      costo: 0,
      margen: 0,
      pos: true,
      linea: false,
      estado: true,
      requiereReceta: false,
      usarExistencias: true,
      usarLotes: false,
      almacen: 'Sin inventario',
      anaquel: '—',
      lote: '—',
      caducidad: '—',
      stock: 0,
      stockReorden: 0,
      stockCritico: 0,
      stockMaximo: 0,
      ubicacionDefault: '',
      claveSat: '',
      imagen: '',
      ultimoMovimiento: 'Sin movimientos',
      fechaActualizacion: hoy,
      fechaCreacion: hoy,
    };
  }

  private nombreOpcion(opciones: OpcionProducto[], id: number, respaldo: string): string {
    return opciones.find(opcion => opcion.id === Number(id))?.nombre || respaldo;
  }
}
