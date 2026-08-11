import { Component, Inject, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AlmacenInventarioRef,
  comprometeStockTransferencia,
  ExistenciaInventario,
  PartidaTransferenciaFormulario,
  ProductoInventarioRef,
  TransferenciaFormulario,
  TransferenciaInventario,
  UsuarioInventarioRef,
} from '../../../gestion-inventario';
import { Autenticacion } from '../../../../../shared/services/autenticacion';

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

interface PartidaTransferenciaEdicion extends PartidaTransferenciaFormulario {
  sku: string;
  producto: string;
  unidad: string;
  permiteDecimales: boolean;
  disponible: number;
}

@Component({
  selector: 'app-transferencias-dialog',
  imports: [...SHARED_IMPORTS, DecimalPipe],
  templateUrl: './transferencias-dialog.html',
  styleUrl: './transferencias-dialog.css',
})
export class TransferenciasDialog {
  private readonly autenticacion = inject(Autenticacion);
  formulario: Omit<TransferenciaFormulario, 'partidas'>;
  partidas: PartidaTransferenciaEdicion[] = [];
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
    const empresaOrigen = data.almacenes.find(almacen => almacen.id === origenId)?.idEmpresa;
    const destinoCompatible = data.almacenes.find(almacen =>
      almacen.id !== origenId && almacen.idEmpresa === empresaOrigen);
    const solicitanteCompatible = this.usuarioSesion(empresaOrigen)
      ?? data.usuarios.find(usuario => usuario.idEmpresa === empresaOrigen);
    this.formulario = {
      origenId,
      destinoId: actual?.destinoId
        ?? destinoCompatible?.id
        ?? 0,
      fechaSolicitud: actual?.fechaSolicitud || this.fechaLocal(),
      fechaAutorizacion: actual?.fechaAutorizacion || '',
      fechaRecepcion: actual?.fechaRecepcion || '',
      solicitanteId: actual?.solicitanteId ?? solicitanteCompatible?.id ?? null,
      autorizadorId: actual?.autorizadorId ?? null,
      estado: actual?.estado
        || (data.estados.includes('Pendiente') ? 'Pendiente' : data.estados[0] || 'Pendiente'),
      observaciones: actual?.observaciones === '—' ? '' : actual?.observaciones || '',
    };
    if (actual) {
      this.partidas = actual.partidas.map((partida) => ({
        productoId: partida.productoId,
        sku: partida.sku,
        producto: partida.producto,
        unidad: partida.unidad,
        permiteDecimales: partida.permiteDecimales,
        cantidadSolicitada: partida.cantidadSolicitada,
        cantidadEnviada: partida.cantidadEnviada,
        cantidadRecibida: partida.cantidadRecibida,
        disponible: this.stockDisponible(partida.productoId),
      }));
    }
  }

  get soloLectura(): boolean {
    return this.data.mode === 'view';
  }

  get titulo(): string {
    if (this.soloLectura) return `Transferencia ${this.data.transferencia?.folio}`;
    return this.data.mode === 'edit' ? 'Editar transferencia' : 'Nueva transferencia';
  }

  get productosOrigen(): ProductoInventarioRef[] {
    const texto = this.normalizar(this.productoBusqueda);
    const empresaOrigen = this.empresaOrigen;
    return this.data.productos.filter((producto) => {
      const disponible = this.stockDisponible(producto.id);
      return producto.idEmpresa === empresaOrigen
        && disponible > 0
        && (!texto || this.normalizar(`${producto.sku} ${producto.nombre}`).includes(texto));
    });
  }

  get almacenesDestino(): AlmacenInventarioRef[] {
    const empresaOrigen = this.empresaOrigen;
    return this.data.almacenes.filter(
      almacen =>
        almacen.idEmpresa === empresaOrigen
        && almacen.id !== Number(this.formulario.origenId),
    );
  }

  get usuariosEmpresa(): UsuarioInventarioRef[] {
    return this.data.usuarios.filter(usuario => usuario.idEmpresa === this.empresaOrigen);
  }

  get nombreSolicitante(): string {
    return this.data.usuarios.find(usuario =>
      usuario.id === this.formulario.solicitanteId)?.nombre || 'Usuario en sesión';
  }

  private get empresaOrigen(): number | undefined {
    return this.data.almacenes.find(
      almacen => almacen.id === Number(this.formulario.origenId),
    )?.idEmpresa;
  }

  get pasoCantidadNueva(): number {
    return this.data.productos.find(
      (item) => item.id === this.productoSeleccionadoId,
    )?.permiteDecimales ? .01 : 1;
  }

  cambiarOrigen(): void {
    this.productoBusqueda = '';
    this.productoSeleccionadoId = 0;
    this.partidas = [];
    this.error = '';
    this.formulario.destinoId = this.almacenesDestino[0]?.id ?? 0;
    this.formulario.solicitanteId = this.usuarioSesion(this.empresaOrigen)?.id ?? null;
    if (!this.usuariosEmpresa.some(usuario => usuario.id === this.formulario.autorizadorId)) {
      this.formulario.autorizadorId = null;
      this.formulario.fechaAutorizacion = '';
    }
  }

  seleccionarProducto(producto: ProductoInventarioRef): void {
    this.productoSeleccionadoId = producto.id;
    this.productoBusqueda = `${producto.sku} · ${producto.nombre}`;
    this.cantidadNueva = producto.permiteDecimales ? .01 : 1;
  }

  agregarPartida(): void {
    const producto = this.data.productos.find(
      (item) => item.id === this.productoSeleccionadoId,
    );
    if (!producto) {
      this.error = 'Busca y selecciona un producto del almacén origen.';
      return;
    }
    if (!producto.permiteDecimales && !Number.isInteger(Number(this.cantidadNueva))) {
      this.error = `La unidad ${producto.unidad} de ${producto.nombre} sólo acepta cantidades enteras.`;
      return;
    }
    const cantidad = this.ajustarCantidad(this.cantidadNueva, producto.permiteDecimales);
    const disponible = this.stockDisponible(producto.id);
    const existente = this.partidas.find((partida) => partida.productoId === producto.id);
    const total = cantidad + (existente?.cantidadSolicitada || 0);
    if (cantidad <= 0) {
      this.error = 'La cantidad debe ser mayor que cero.';
      return;
    }
    if (total > disponible) {
      this.error = `Solo hay ${disponible} ${producto.unidad} disponibles de ${producto.nombre}.`;
      return;
    }
    if (existente) {
      existente.cantidadSolicitada = total;
    } else {
      this.partidas.push({
        productoId: producto.id,
        sku: producto.sku,
        producto: producto.nombre,
        unidad: producto.unidad,
        permiteDecimales: producto.permiteDecimales,
        cantidadSolicitada: cantidad,
        cantidadEnviada: 0,
        cantidadRecibida: 0,
        disponible,
      });
    }
    this.productoBusqueda = '';
    this.productoSeleccionadoId = 0;
    this.cantidadNueva = 1;
    this.error = '';
  }

  actualizarPartida(partida: PartidaTransferenciaEdicion): void {
    const cantidadesCapturadas = [
      Number(partida.cantidadSolicitada),
      Number(partida.cantidadEnviada),
      Number(partida.cantidadRecibida),
    ];
    if (!partida.permiteDecimales
      && cantidadesCapturadas.some(cantidad => !Number.isInteger(cantidad))) {
      this.error = `La unidad ${partida.unidad} de ${partida.producto} sólo acepta cantidades enteras.`;
      return;
    }
    partida.cantidadSolicitada = this.ajustarCantidad(
      partida.cantidadSolicitada,
      partida.permiteDecimales,
    );
    partida.cantidadEnviada = this.ajustarCantidad(
      partida.cantidadEnviada,
      partida.permiteDecimales,
    );
    partida.cantidadRecibida = this.ajustarCantidad(
      partida.cantidadRecibida,
      partida.permiteDecimales,
    );
    const comprometida = partida.cantidadEnviada > 0
      ? partida.cantidadEnviada
      : partida.cantidadSolicitada;
    if (partida.cantidadSolicitada <= 0) {
      this.error = `La cantidad solicitada de ${partida.producto} debe ser mayor que cero.`;
    } else if (partida.cantidadEnviada < 0 || partida.cantidadEnviada > partida.cantidadSolicitada) {
      this.error = `La cantidad enviada de ${partida.producto} no puede superar la solicitada.`;
    } else if (partida.cantidadRecibida < 0 || partida.cantidadRecibida > partida.cantidadEnviada) {
      this.error = `La cantidad recibida de ${partida.producto} no puede superar la enviada.`;
    } else if (comprometida > partida.disponible) {
      this.error = `Solo hay ${partida.disponible} ${partida.unidad} disponibles de ${partida.producto}.`;
    } else {
      this.error = '';
    }
  }

  quitarPartida(indice: number): void {
    this.partidas.splice(indice, 1);
  }

  stockDisponible(productoId: number): number {
    const stock = this.data.existencias.find(
      (item) => item.productoId === productoId
        && item.almacenId === Number(this.formulario.origenId),
    )?.stock ?? 0;
    const reservado = this.data.transferencias
      .filter((item) => item.id !== this.data.transferencia?.id
        && item.origenId === Number(this.formulario.origenId)
        && comprometeStockTransferencia(item.estado))
      .flatMap((item) => item.partidas)
      .filter((item) => item.productoId === productoId)
      .reduce((total, item) => {
        const comprometida = item.cantidadEnviada > 0
          ? item.cantidadEnviada
          : item.cantidadSolicitada;
        return total + Math.max(0, comprometida - item.cantidadRecibida);
      }, 0);
    return Math.max(0, stock - reservado);
  }

  paso(partida: PartidaTransferenciaEdicion): number {
    return partida.permiteDecimales ? .01 : 1;
  }

  guardar(): void {
    this.error = '';
    if (!this.formulario.origenId || !this.formulario.destinoId || !this.formulario.fechaSolicitud) {
      this.error = 'Completa los almacenes y la fecha de solicitud.';
      return;
    }
    if (Number(this.formulario.origenId) === Number(this.formulario.destinoId)) {
      this.error = 'El almacén origen y destino deben ser diferentes.';
      return;
    }
    if (!this.almacenesDestino.some(
      almacen => almacen.id === Number(this.formulario.destinoId),
    )) {
      this.error = 'Los almacenes deben pertenecer a la misma empresa.';
      return;
    }
    if (this.formulario.solicitanteId == null) {
      this.error = 'Selecciona al solicitante de la transferencia.';
      return;
    }
    if ((this.formulario.fechaAutorizacion && this.formulario.autorizadorId == null)
      || (!this.formulario.fechaAutorizacion && this.formulario.autorizadorId != null)) {
      this.error = 'La fecha y el autorizador deben capturarse juntos.';
      return;
    }
    if (this.formulario.fechaAutorizacion
      && this.formulario.fechaAutorizacion < this.formulario.fechaSolicitud) {
      this.error = 'La autorización no puede ser anterior a la solicitud.';
      return;
    }
    if (this.formulario.fechaRecepcion
      && this.formulario.fechaRecepcion
        < (this.formulario.fechaAutorizacion || this.formulario.fechaSolicitud)) {
      this.error = 'La recepción no puede ser anterior a la solicitud o autorización.';
      return;
    }
    if (!this.partidas.length) {
      this.error = 'Agrega al menos un producto a la transferencia.';
      return;
    }
    for (const partida of this.partidas) {
      this.actualizarPartida(partida);
      if (this.error) return;
    }
    this.dialogRef.close({
      ...this.formulario,
      fechaSolicitud: this.formulario.fechaSolicitud.slice(0, 10),
      fechaAutorizacion: this.formulario.fechaAutorizacion.slice(0, 10),
      fechaRecepcion: this.formulario.fechaRecepcion.slice(0, 10),
      partidas: this.partidas.map((partida) => ({
        productoId: partida.productoId,
        cantidadSolicitada: partida.cantidadSolicitada,
        cantidadEnviada: partida.cantidadEnviada,
        cantidadRecibida: partida.cantidadRecibida,
      })),
    } satisfies TransferenciaFormulario);
  }

  private ajustarCantidad(valor: number, permiteDecimales: boolean): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return permiteDecimales ? Math.round(numero * 100) / 100 : Math.round(numero);
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 10);
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private usuarioSesion(idEmpresa?: number): UsuarioInventarioRef | undefined {
    const sesion = this.autenticacion.sesion();
    if (!sesion) return undefined;
    return this.data.usuarios.find(usuario =>
      usuario.idEmpresa === idEmpresa
      && (usuario.id === Number(sesion.id)
        || this.normalizar(usuario.nombre) === this.normalizar(sesion.nombre)));
  }
}
