import { computed, inject, Injectable, signal } from '@angular/core';
import { Autenticacion } from '../../shared/services/autenticacion';
import {
  OrdenCompraTxtPersistida,
  PersistenciaComprasTxt,
} from '../../shared/services/persistencia-compras-txt';

export type EstadoOrdenCompra =
  | 'Pendiente'
  | 'Activo'
  | 'En transito'
  | 'Completado'
  | 'Cancelado';

export interface EventoOrdenCompra {
  id: string;
  estado: EstadoOrdenCompra;
  fecha: string;
  comentario: string;
}

export interface PartidaNuevaOrdenCompra {
  productoId: number;
  nombre: string;
  sku: string;
  cantidad: number;
  precioUnitario: number;
  impuestoPorcentaje: number;
}

export interface NuevaOrdenCompra {
  proveedor: string;
  solicitante: string;
  almacenId: number;
  almacen: string;
  partidas: PartidaNuevaOrdenCompra[];
  fecha?: string;
  fechaEntrega: string;
  condiciones: string;
  estadoInicial?: Extract<EstadoOrdenCompra, 'Pendiente' | 'Activo'>;
  observaciones?: string;
}

export interface OrdenCompra {
  folio: string;
  proveedor: string;
  articulos: number;
  total: string;
  solicitante: string;
  fecha: string;
  estado: EstadoOrdenCompra;
  cancelable: boolean;
  actualizadaEn: string;
  historial: EventoOrdenCompra[];
  almacenId?: number;
  almacen?: string;
  fechaEntrega?: string;
  condiciones?: string;
  partidas?: PartidaNuevaOrdenCompra[];
}

export const ESTADOS_ORDEN_SEGUIMIENTO: readonly EstadoOrdenCompra[] = [
  'Activo',
  'En transito',
];

@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private readonly persistenciaTxt = inject(PersistenciaComprasTxt);
  private readonly autenticacion = inject(Autenticacion);
  private readonly ordenesInternas = signal<OrdenCompra[]>([]);

  readonly cargando = signal(false);
  readonly error = signal('');
  readonly ordenes = this.ordenesInternas.asReadonly();
  readonly ordenesRecientes = computed(() =>
    [...this.ordenesInternas()].sort((a, b) =>
      b.actualizadaEn.localeCompare(a.actualizadaEn)
      || b.fecha.localeCompare(a.fecha)
      || b.folio.localeCompare(a.folio, 'es-MX'),
    ),
  );
  readonly actividadReciente = computed(() =>
    this.ordenesInternas()
      .flatMap(orden => orden.historial.map(evento => ({
        ...evento,
        folio: orden.folio,
        proveedor: orden.proveedor,
      })))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
      .slice(0, 8),
  );

  constructor() {
    void this.recargar().catch(() => undefined);
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const ordenes = await this.persistenciaTxt.listarOrdenes();
      this.ordenesInternas.set(ordenes.map(orden => this.normalizar(orden)));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible cargar las órdenes desde compras_bd.');
      throw error;
    } finally {
      this.cargando.set(false);
    }
  }

  async crearLote(entradas: readonly NuevaOrdenCompra[]): Promise<OrdenCompra[]> {
    if (!entradas.length) return [];
    const compradorId = Number(this.autenticacion.sesion()?.id);
    if (!Number.isSafeInteger(compradorId) || compradorId <= 0) {
      throw new Error('No se pudo identificar al usuario comprador de la sesión.');
    }
    const creadas = await this.persistenciaTxt.registrarOrdenes(entradas.map(entrada => ({
      proveedor: entrada.proveedor.trim(),
      compradorId,
      almacenId: Number(entrada.almacenId),
      partidas: entrada.partidas.map(partida => ({
        productoId: Number(partida.productoId),
        cantidad: Number(partida.cantidad),
        precioUnitario: Number(partida.precioUnitario),
        impuestoPorcentaje: Number(partida.impuestoPorcentaje) || 0,
      })),
      fecha: entrada.fecha || new Date().toISOString().slice(0, 10),
      fechaEntrega: entrada.fechaEntrega,
      condiciones: entrada.condiciones || 'Contado',
      estado: entrada.estadoInicial || 'Pendiente',
      observaciones: entrada.observaciones,
    })));
    const normalizadas = creadas.map(orden => this.normalizar(orden));
    const folios = new Set(normalizadas.map(orden => orden.folio));
    this.ordenesInternas.update(actuales => [
      ...normalizadas,
      ...actuales.filter(orden => !folios.has(orden.folio)),
    ]);
    return normalizadas;
  }

  async actualizarEstado(
    folio: string,
    estado: EstadoOrdenCompra,
    comentario = `Estado actualizado a ${estado}.`,
  ): Promise<void> {
    const usuarioId = Number(this.autenticacion.sesion()?.id);
    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      throw new Error('No se pudo identificar al usuario de la sesión.');
    }
    await this.persistenciaTxt.actualizarEstadoOrden(folio, estado, usuarioId, comentario);
    await this.recargar();
  }

  cancelar(folio: string): Promise<void> {
    return this.actualizarEstado(folio, 'Cancelado', 'Orden cancelada desde Gestión de compras.');
  }

  private normalizar(orden: OrdenCompraTxtPersistida): OrdenCompra {
    const estado = this.esEstado(orden.estado) ? orden.estado : 'Pendiente';
    return {
      ...orden,
      estado,
      cancelable: estado !== 'Completado' && estado !== 'Cancelado',
      historial: (orden.historial || []).map(evento => ({
        ...evento,
        estado: this.esEstado(evento.estado) ? evento.estado : 'Pendiente',
      })),
      partidas: orden.partidas || [],
    };
  }

  private esEstado(valor: unknown): valor is EstadoOrdenCompra {
    return ['Pendiente', 'Activo', 'En transito', 'Completado', 'Cancelado']
      .includes(String(valor));
  }
}
