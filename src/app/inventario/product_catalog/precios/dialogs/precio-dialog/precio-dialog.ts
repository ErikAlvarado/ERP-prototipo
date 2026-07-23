import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { OpcionListaPrecio, calcularMargenPrecio } from '../../../../../shared/services/catalogo-productos';
import type { PrecioFila } from '../../precios';

export interface ProductoPrecioOption {
  id: number;
  idEmpresa: number;
  empresa: string;
  sku: string;
  nombre: string;
}

export interface PrecioDialogResult {
  idProducto: number;
  idLista: number;
  costo: number;
  precio: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface PrecioDialogData {
  mode: 'add' | 'edit';
  precio?: PrecioFila;
  productos: ProductoPrecioOption[];
  listas: OpcionListaPrecio[];
  existentes: PrecioFila[];
}

@Component({
  selector: 'app-precio-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './precio-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './precio-dialog.css'],
})
export class PrecioDialog {
  precio: PrecioDialogResult;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<PrecioDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PrecioDialogData,
  ) {
    const producto = data.productos.find(actual => actual.id === data.precio?.idProducto) || data.productos[0];
    const lista = data.listas.find(actual => actual.id === data.precio?.idLista)
      || data.listas.find(actual => actual.idEmpresa === producto?.idEmpresa && actual.predeterminada && actual.activa)
      || data.listas.find(actual => actual.idEmpresa === producto?.idEmpresa && actual.activa);
    this.precio = {
      idProducto: producto?.id || 0,
      idLista: lista?.id || 0,
      costo: data.precio?.costo || 0,
      precio: data.precio?.precio || 0,
      fechaInicio: data.precio?.fechaInicio || new Date().toISOString().slice(0, 10),
      fechaFin: data.precio?.fechaFin || '',
    };
  }

  get productoSeleccionado(): ProductoPrecioOption | undefined {
    return this.data.productos.find(producto => producto.id === Number(this.precio.idProducto));
  }

  get listasDisponibles(): OpcionListaPrecio[] {
    const idEmpresa = this.productoSeleccionado?.idEmpresa;
    return this.data.listas.filter(lista => lista.idEmpresa === idEmpresa);
  }

  get margen(): number {
    return calcularMargenPrecio(this.precio.costo, this.precio.precio);
  }

  cambiarProducto(): void {
    const listaActual = this.listasDisponibles.find(lista => lista.id === Number(this.precio.idLista));
    if (listaActual) return;
    const lista = this.listasDisponibles.find(opcion => opcion.predeterminada && opcion.activa)
      || this.listasDisponibles.find(opcion => opcion.activa);
    this.precio.idLista = lista?.id || 0;
  }

  guardar(): void {
    this.error = '';
    const costo = Number(this.precio.costo);
    const precio = Number(this.precio.precio);
    const lista = this.listasDisponibles.find(opcion => opcion.id === Number(this.precio.idLista));
    if (!this.productoSeleccionado) {
      this.error = 'Selecciona un producto.';
      return;
    }
    if (!lista) {
      this.error = 'Selecciona una lista de la misma empresa que el producto.';
      return;
    }
    if (!lista.activa && lista.id !== this.data.precio?.idLista) {
      this.error = 'No se pueden crear precios en una lista inactiva.';
      return;
    }
    if (!Number.isFinite(costo) || !Number.isFinite(precio) || costo < 0 || precio < 0) {
      this.error = 'El costo y el precio deben ser cantidades no negativas.';
      return;
    }
    if (!this.precio.fechaInicio) {
      this.error = 'La fecha de inicio es obligatoria.';
      return;
    }
    if (this.precio.fechaFin && this.precio.fechaFin < this.precio.fechaInicio) {
      this.error = 'La fecha final no puede ser anterior a la fecha de inicio.';
      return;
    }
    const seTraslapa = this.data.existentes.some(actual =>
      actual.idPrecio !== this.data.precio?.idPrecio
      && actual.idProducto === Number(this.precio.idProducto)
      && actual.idLista === Number(this.precio.idLista)
      && this.rangosSeTraslapan(
        this.precio.fechaInicio,
        this.precio.fechaFin,
        actual.fechaInicio,
        actual.fechaFin,
      ));
    if (seTraslapa) {
      this.error = 'Ya existe un precio de este producto y lista que coincide con esa vigencia.';
      return;
    }
    this.dialogRef.close({
      idProducto: Number(this.precio.idProducto),
      idLista: Number(this.precio.idLista),
      costo,
      precio,
      fechaInicio: this.precio.fechaInicio,
      fechaFin: this.precio.fechaFin,
    } satisfies PrecioDialogResult);
  }

  private rangosSeTraslapan(inicioA: string, finA: string, inicioB: string, finB: string): boolean {
    const limiteA = finA || '9999-12-31';
    const limiteB = finB || '9999-12-31';
    return inicioA <= limiteB && inicioB <= limiteA;
  }
}
