import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AlmacenInventarioRef,
  ExistenciaInventario,
  ProductoInventarioRef,
  TransferenciaFormulario,
  TransferenciaInventario,
  UsuarioInventarioRef,
} from '../../../gestion-inventario';

export interface TransferenciasDialogData {
  mode: 'add' | 'edit' | 'view';
  transferencia?: TransferenciaInventario;
  productos: ProductoInventarioRef[];
  almacenes: AlmacenInventarioRef[];
  usuarios: UsuarioInventarioRef[];
  estados: string[];
  existencias: ExistenciaInventario[];
  transferencias: TransferenciaInventario[];
}

interface PartidaTransferencia {
  productoId: number;
  sku: string;
  producto: string;
  unidad: string;
  cantidad: number;
  disponible: number;
}

@Component({
  selector: 'app-transferencias-dialog',
  imports: [...SHARED_IMPORTS],
  templateUrl: './transferencias-dialog.html',
  styleUrl: './transferencias-dialog.css',
})
export class TransferenciasDialog {
  formulario: TransferenciaFormulario;
  partidas: PartidaTransferencia[] = [];
  productoBusqueda = '';
  productoSeleccionadoId = 0;
  cantidadNueva = 1;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<TransferenciasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TransferenciasDialogData,
  ) {
    const actual = data.transferencia;
    const origenId = actual?.origenId ?? data.almacenes[0]?.id ?? 0;
    this.formulario = {
      fecha: actual?.fecha || this.fechaLocal(),
      productoId: actual?.productoId ?? 0,
      origenId,
      destinoId: actual?.destinoId ?? data.almacenes.find(almacen => almacen.id !== origenId)?.id ?? 0,
      cantidad: actual?.cantidad ?? 1,
      usuarioId: actual?.usuarioId ?? data.usuarios[0]?.id ?? null,
      estado: actual?.estado || (data.estados.includes('Pendiente') ? 'Pendiente' : data.estados[0] || 'Pendiente'),
      observaciones: actual?.observaciones || '',
    };
    if (actual) {
      this.partidas = [{
        productoId: actual.productoId,
        sku: actual.sku,
        producto: actual.producto,
        unidad: this.unidad(actual.productoId),
        cantidad: actual.cantidad,
        disponible: this.stockDisponible(actual.productoId),
      }];
    }
  }

  get soloLectura(): boolean { return this.data.mode === 'view'; }
  get titulo(): string {
    if (this.data.mode === 'view') return `Transferencia ${this.data.transferencia?.folio}`;
    return this.data.mode === 'edit' ? 'Editar transferencia' : 'Nueva transferencia';
  }

  get productosOrigen(): ProductoInventarioRef[] {
    const texto = this.normalizar(this.productoBusqueda);
    return this.data.productos.filter(producto => {
      const disponible = this.stockDisponible(producto.id);
      return disponible > 0 && (!texto || this.normalizar(`${producto.sku} ${producto.nombre}`).includes(texto));
    });
  }

  cambiarOrigen(): void {
    this.productoBusqueda = '';
    this.productoSeleccionadoId = 0;
    this.partidas = [];
    this.error = '';
    if (Number(this.formulario.destinoId) === Number(this.formulario.origenId)) {
      this.formulario.destinoId = this.data.almacenes.find(almacen => almacen.id !== Number(this.formulario.origenId))?.id ?? 0;
    }
  }

  seleccionarProducto(producto: ProductoInventarioRef): void {
    this.productoSeleccionadoId = producto.id;
    this.productoBusqueda = `${producto.sku} · ${producto.nombre}`;
    this.cantidadNueva = 1;
  }

  agregarPartida(): void {
    const producto = this.data.productos.find(item => item.id === this.productoSeleccionadoId);
    const cantidad = Math.floor(Number(this.cantidadNueva) || 0);
    if (!producto) { this.error = 'Busca y selecciona un producto del almacén origen.'; return; }
    const disponible = this.stockDisponible(producto.id);
    const existente = this.partidas.find(partida => partida.productoId === producto.id);
    const total = cantidad + (existente?.cantidad || 0);
    if (cantidad <= 0) { this.error = 'La cantidad debe ser mayor que cero.'; return; }
    if (total > disponible) { this.error = `Solo hay ${disponible} ${producto.unidad} disponibles de ${producto.nombre}.`; return; }
    if (existente) existente.cantidad = total;
    else this.partidas.push({ productoId: producto.id, sku: producto.sku, producto: producto.nombre, unidad: producto.unidad, cantidad, disponible });
    this.productoBusqueda = '';
    this.productoSeleccionadoId = 0;
    this.cantidadNueva = 1;
    this.error = '';
  }

  actualizarCantidad(partida: PartidaTransferencia): void {
    partida.cantidad = Math.max(1, Math.floor(Number(partida.cantidad) || 1));
    if (partida.cantidad > partida.disponible) {
      partida.cantidad = partida.disponible;
      this.error = `Solo hay ${partida.disponible} ${partida.unidad} disponibles de ${partida.producto}.`;
    } else this.error = '';
  }

  quitarPartida(indice: number): void { this.partidas.splice(indice, 1); }

  stockDisponible(productoId: number): number {
    const stock = this.data.existencias
      .filter(item => item.productoId === productoId && item.almacenId === Number(this.formulario.origenId))
      .reduce((total, item) => total + item.stock, 0);
    const reservado = this.data.transferencias
      .filter(item => item.id !== this.data.transferencia?.id && item.productoId === productoId
        && item.origenId === Number(this.formulario.origenId) && !this.esEstadoFinal(item.estado))
      .reduce((total, item) => total + item.cantidad, 0);
    return Math.max(0, stock - reservado);
  }

  guardar(): void {
    this.error = '';
    if (!this.formulario.origenId || !this.formulario.destinoId || !this.formulario.fecha) { this.error = 'Completa los almacenes y la fecha.'; return; }
    if (Number(this.formulario.origenId) === Number(this.formulario.destinoId)) { this.error = 'El almacén origen y destino deben ser diferentes.'; return; }
    if (!this.partidas.length) { this.error = 'Agrega al menos un producto a la transferencia.'; return; }
    const invalida = this.partidas.find(partida => partida.cantidad <= 0 || partida.cantidad > this.stockDisponible(partida.productoId));
    if (invalida) { this.error = `Revisa la cantidad de ${invalida.producto}; hay ${this.stockDisponible(invalida.productoId)} disponibles.`; return; }
    const formularios = this.partidas.map(partida => ({
      ...this.formulario,
      productoId: partida.productoId,
      cantidad: partida.cantidad,
    }));
    this.dialogRef.close(this.data.mode === 'add' ? formularios : formularios[0]);
  }

  private unidad(productoId: number): string { return this.data.productos.find(producto => producto.id === productoId)?.unidad || 'unidades'; }
  private fechaLocal(): string { const fecha = new Date(); fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset()); return fecha.toISOString().slice(0, 16); }
  private esEstadoFinal(estado: string): boolean { return ['recibida', 'cancelada', 'cerrada', 'devuelta'].includes(this.normalizar(estado)); }
  private normalizar(valor: string): string { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
}
