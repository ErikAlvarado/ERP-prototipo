import { CurrencyPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { OpcionProducto, OpcionesProducto, calcularMargenPrecio } from '../../../../../shared/services/catalogo-productos';
import type { Kit, KitElemento } from '../../kits';

export interface ProductoKitOption {
  idProducto: number;
  idEmpresa: number;
  empresa: string;
  sku: string;
  nombre: string;
  costo: number;
  precio: number;
  stock: number;
}

export interface KitDialogResult {
  idEmpresa: number;
  idMarca: number;
  idCategoria: number;
  idUnidad: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo: number;
  elementos: KitElemento[];
  estado: boolean;
}

export interface KitDialogData {
  mode: 'add' | 'edit';
  kit?: Kit;
  productos: ProductoKitOption[];
  opciones: OpcionesProducto;
  nombres: string[];
  skus: string[];
}

@Component({
  selector: 'app-kits-dialog',
  imports: [SHARED_IMPORTS, CurrencyPipe],
  templateUrl: './kits-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './kits-dialog.css'],
})
export class KitsDialog {
  kit: KitDialogResult;
  nuevoProductoId = 0;
  cantidadNueva = 1;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<KitsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: KitDialogData,
  ) {
    const empresa = data.opciones.empresas.find(opcion => opcion.id === data.kit?.idEmpresa) || data.opciones.empresas[0];
    const marca = data.opciones.marcas.find(opcion => opcion.id === data.kit?.idMarca)
      || data.opciones.marcas.find(opcion => opcion.idEmpresa === empresa?.id);
    const categoria = data.opciones.categorias.find(opcion => opcion.id === data.kit?.idCategoria)
      || data.opciones.categorias.find(opcion => opcion.idEmpresa === empresa?.id);
    const unidad = data.opciones.unidades.find(opcion => opcion.id === data.kit?.idUnidad)
      || data.opciones.unidades.find(opcion => opcion.idEmpresa === empresa?.id);
    this.kit = data.kit
      ? {
          idEmpresa: data.kit.idEmpresa,
          idMarca: data.kit.idMarca,
          idCategoria: data.kit.idCategoria,
          idUnidad: data.kit.idUnidad,
          sku: data.kit.sku,
          nombre: data.kit.nombre,
          descripcion: data.kit.descripcion,
          precio: data.kit.precio,
          costo: data.kit.costo,
          elementos: data.kit.elementos.map(elemento => ({ ...elemento })),
          estado: data.kit.estado,
        }
      : {
          idEmpresa: empresa?.id || 0,
          idMarca: marca?.id || 0,
          idCategoria: categoria?.id || 0,
          idUnidad: unidad?.id || 0,
          sku: '',
          nombre: '',
          descripcion: '',
          precio: 0,
          costo: 0,
          elementos: [],
          estado: true,
        };
  }

  get marcasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.marcas);
  }

  get categoriasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.categorias);
  }

  get unidadesDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.unidades);
  }

  get productosDisponibles(): ProductoKitOption[] {
    return this.data.productos.filter(producto => producto.idEmpresa === Number(this.kit.idEmpresa));
  }

  get stockSeleccionado(): number {
    return this.productosDisponibles.find(producto => producto.idProducto === Number(this.nuevoProductoId))?.stock || 0;
  }

  get costoComponentes(): number {
    return this.kit.elementos.reduce((total, elemento) => total + elemento.costo * elemento.cantidad, 0);
  }

  get margen(): number {
    return calcularMargenPrecio(this.kit.costo, this.kit.precio);
  }

  cambiarEmpresa(): void {
    const elementosValidos = this.kit.elementos.filter(elemento => elemento.idEmpresa === Number(this.kit.idEmpresa));
    if (elementosValidos.length !== this.kit.elementos.length) {
      this.kit.elementos = elementosValidos;
      this.error = 'Se quitaron los componentes que pertenecían a otra empresa.';
    }
    this.asignarPrimeraOpcion('marca', this.marcasDisponibles);
    this.asignarPrimeraOpcion('categoria', this.categoriasDisponibles);
    this.asignarPrimeraOpcion('unidad', this.unidadesDisponibles);
    this.nuevoProductoId = 0;
  }

  agregarElemento(): void {
    const producto = this.productosDisponibles.find(actual => actual.idProducto === Number(this.nuevoProductoId));
    const cantidad = Math.max(1, Math.floor(Number(this.cantidadNueva) || 1));
    if (!producto) {
      this.error = 'Selecciona un producto de la misma empresa que el kit.';
      return;
    }
    const existente = this.kit.elementos.find(elemento => elemento.idProducto === producto.idProducto);
    if (existente) existente.cantidad += cantidad;
    else this.kit.elementos.push({ ...producto, cantidad });
    this.nuevoProductoId = 0;
    this.cantidadNueva = 1;
    this.error = '';
  }

  actualizarCantidad(elemento: KitElemento): void {
    elemento.cantidad = Math.max(1, Math.floor(Number(elemento.cantidad) || 1));
    this.error = '';
  }

  removerElemento(index: number): void {
    this.kit.elementos.splice(index, 1);
  }

  guardar(): void {
    this.error = '';
    const nombre = this.kit.nombre.trim();
    const sku = this.kit.sku.trim();
    const costo = Number(this.kit.costo);
    const precio = Number(this.kit.precio);
    if (!nombre) {
      this.error = 'El nombre del kit es obligatorio.';
      return;
    }
    if (!sku) {
      this.error = 'El SKU del kit es obligatorio.';
      return;
    }
    if (this.data.nombres.some(actual => actual.trim().toLocaleLowerCase() === nombre.toLocaleLowerCase())) {
      this.error = 'Ya existe un kit con ese nombre.';
      return;
    }
    if (this.data.skus.some(actual => actual.trim().toLocaleLowerCase() === sku.toLocaleLowerCase())) {
      this.error = 'Ya existe otro producto con ese SKU.';
      return;
    }
    if (!this.kit.idEmpresa || !this.relacionValida(this.marcasDisponibles, this.kit.idMarca)
      || !this.relacionValida(this.categoriasDisponibles, this.kit.idCategoria)
      || !this.relacionValida(this.unidadesDisponibles, this.kit.idUnidad)) {
      this.error = 'Selecciona empresa, marca, categoría y unidad relacionadas entre sí.';
      return;
    }
    if (!this.kit.elementos.length) {
      this.error = 'Agrega al menos un producto al kit.';
      return;
    }
    if (this.kit.elementos.some(elemento => elemento.idEmpresa !== Number(this.kit.idEmpresa))) {
      this.error = 'Todos los componentes deben pertenecer a la misma empresa que el kit.';
      return;
    }
    if (!Number.isFinite(precio) || !Number.isFinite(costo) || precio < 0 || costo < 0) {
      this.error = 'El precio y el costo registrado no pueden ser negativos.';
      return;
    }
    this.dialogRef.close({
      ...this.kit,
      idEmpresa: Number(this.kit.idEmpresa),
      idMarca: Number(this.kit.idMarca),
      idCategoria: Number(this.kit.idCategoria),
      idUnidad: Number(this.kit.idUnidad),
      sku,
      nombre,
      descripcion: this.kit.descripcion.trim(),
      precio,
      costo,
      elementos: this.kit.elementos.map(elemento => ({
        ...elemento,
        cantidad: Math.max(1, Math.floor(Number(elemento.cantidad) || 1)),
      })),
    } satisfies KitDialogResult);
  }

  private opcionesEmpresa(opciones: OpcionProducto[]): OpcionProducto[] {
    return opciones.filter(opcion => opcion.idEmpresa === Number(this.kit.idEmpresa));
  }

  private asignarPrimeraOpcion(tipo: 'marca' | 'categoria' | 'unidad', opciones: OpcionProducto[]): void {
    const actual = tipo === 'marca'
      ? this.kit.idMarca
      : tipo === 'categoria' ? this.kit.idCategoria : this.kit.idUnidad;
    const id = (opciones.find(opcion => opcion.id === Number(actual)) || opciones[0])?.id || 0;
    if (tipo === 'marca') this.kit.idMarca = id;
    else if (tipo === 'categoria') this.kit.idCategoria = id;
    else this.kit.idUnidad = id;
  }

  private relacionValida(opciones: OpcionProducto[], id: number): boolean {
    return opciones.some(opcion => opcion.id === Number(id));
  }
}
