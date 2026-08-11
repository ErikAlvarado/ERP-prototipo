import { computed, inject, Injectable, signal } from '@angular/core';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';
import { fechaHace } from '../../shared/utils/periodos-consulta';

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
  condiciones: 'Contado';
  estadoInicial?: Extract<EstadoOrdenCompra, 'Pendiente' | 'Activo'>;
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
  condiciones?: 'Contado';
  partidas?: PartidaNuevaOrdenCompra[];
}

export const ESTADOS_ORDEN_SEGUIMIENTO: readonly EstadoOrdenCompra[] = [
  'Activo',
  'En transito',
];

@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly clave = 'erp.ordenes-compras';
  private readonly ordenesInternas = signal<OrdenCompra[]>([]);

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
    const iniciales = crearOrdenesIniciales();
    const guardadas = this.persistencia.leer<Partial<OrdenCompra>[]>(this.clave, []);
    const normalizadas = guardadas
      .filter((orden): orden is Partial<OrdenCompra> & Pick<OrdenCompra, 'folio'> =>
        typeof orden?.folio === 'string' && Boolean(orden.folio))
      .map(orden => normalizarOrden(orden));
    const foliosGuardados = new Set(normalizadas.map(orden => orden.folio));
    this.ordenesInternas.set([
      ...iniciales.filter(orden => !foliosGuardados.has(orden.folio)),
      ...normalizadas,
    ]);
    this.persistir();
  }

  actualizarEstado(
    folio: string,
    estado: EstadoOrdenCompra,
    comentario = `Estado actualizado a ${estado}.`,
  ): void {
    const fecha = new Date().toISOString();
    this.ordenesInternas.update(ordenes => ordenes.map(orden => {
      if (orden.folio !== folio || orden.estado === estado) return orden;
      return {
        ...orden,
        estado,
        cancelable: estado !== 'Completado' && estado !== 'Cancelado',
        actualizadaEn: fecha,
        historial: [
          ...orden.historial,
          {
            id: `${folio}-${fecha}`,
            estado,
            fecha,
            comentario,
          },
        ],
      };
    }));
    this.persistir();
  }

  cancelar(folio: string): void {
    this.actualizarEstado(folio, 'Cancelado', 'Orden cancelada desde Gestión de compras.');
  }

  guardar(orden: Omit<OrdenCompra, 'actualizadaEn' | 'historial'>): void {
    const fecha = new Date().toISOString();
    const nueva: OrdenCompra = {
      ...orden,
      actualizadaEn: fecha,
      historial: [{
        id: `${orden.folio}-${fecha}`,
        estado: orden.estado,
        fecha,
        comentario: 'Orden registrada.',
      }],
    };
    this.ordenesInternas.update(ordenes => [
      nueva,
      ...ordenes.filter(item => item.folio !== nueva.folio),
    ]);
    this.persistir();
  }

  /**
   * Genera una orden por destino en una sola actualización reactiva. De esta
   * forma un pedido multialmacén nunca queda guardado parcialmente.
   */
  crearLote(entradas: readonly NuevaOrdenCompra[]): OrdenCompra[] {
    if (!entradas.length) return [];
    const fechaEvento = new Date().toISOString();
    const anio = new Date().getFullYear();
    let secuencia = this.siguienteSecuencia(anio);
    const nuevas = entradas.map((entrada, indice) => {
      const folio = `OC-${anio}-${String(secuencia++).padStart(4, '0')}`;
      const partidas = entrada.partidas.map(partida => ({
        ...partida,
        cantidad: Number(partida.cantidad),
        precioUnitario: Number(partida.precioUnitario),
        impuestoPorcentaje: Number(partida.impuestoPorcentaje) || 0,
      }));
      const total = partidas.reduce(
        (suma, partida) => suma
          + partida.cantidad
          * partida.precioUnitario
          * (1 + partida.impuestoPorcentaje / 100),
        0,
      );
      const estado = entrada.estadoInicial || 'Pendiente';
      return {
        folio,
        proveedor: entrada.proveedor.trim(),
        articulos: partidas.reduce((suma, partida) => suma + partida.cantidad, 0),
        total: formatearImporte(total),
        solicitante: entrada.solicitante.trim(),
        fecha: entrada.fecha || fechaHace(0),
        estado,
        cancelable: true,
        actualizadaEn: fechaEvento,
        historial: [{
          id: `${folio}-${fechaEvento}-${indice}`,
          estado,
          fecha: fechaEvento,
          comentario: `Orden creada para ${entrada.almacen}.`,
        }],
        almacenId: entrada.almacenId,
        almacen: entrada.almacen,
        fechaEntrega: entrada.fechaEntrega,
        condiciones: 'Contado' as const,
        partidas,
      } satisfies OrdenCompra;
    });
    this.ordenesInternas.update(ordenes => [...nuevas, ...ordenes]);
    this.persistir();
    return nuevas;
  }

  private persistir(): void {
    this.persistencia.guardar(this.clave, this.ordenesInternas());
  }

  private siguienteSecuencia(anio: number): number {
    const patron = new RegExp(`^OC-${anio}-(\\d+)$`);
    return Math.max(
      0,
      ...this.ordenesInternas().map(orden =>
        Number(orden.folio.match(patron)?.[1]) || 0),
    ) + 1;
  }
}

function crearOrdenesIniciales(): OrdenCompra[] {
  return [
    crearOrden('OC-2026-0101', 'Suministros Corporativos del Centro', 14, '$36,780', 'Fernanda Castillo', fechaHace(0), 'Pendiente', 55),
    crearOrden('OC-2026-0102', 'Tecnologia Integral Bajio', 6, '$92,450', 'Jorge Ramirez', fechaHace(0), 'Activo', 45),
    crearOrden('OC-2026-0103', 'Equipamiento Industrial Nova', 9, '$48,320', 'Sofia Mendoza', fechaHace(0), 'En transito', 35),
    crearOrden('OC-2026-0104', 'Papeleria y Servicios Metropolitanos', 22, '$15,690', 'Miguel Salgado', fechaHace(0), 'Completado', 25),
    crearOrden('OC-2026-0105', 'Mobiliario Ejecutivo Nacional', 11, '$73,800', 'Valeria Contreras', fechaHace(0), 'Pendiente', 15),
    crearOrden('OC-2025-0087', 'TechnoInsumos SA de CV', 5, '$84,500', 'Laura Hernandez', '2025-06-15', 'Completado'),
    crearOrden('OC-2025-0088', 'Electronica Empresarial MX', 3, '$42,300', 'Marco Jimenez', '2025-06-16', 'Completado'),
    crearOrden('OC-2025-0089', 'Materiales del Norte SA', 12, '$156,800', 'Diana Ruiz', fechaHace(25), 'Activo'),
    crearOrden('OC-2025-0090', 'Grupo Distribuidora Nacional', 8, '$23,400', 'Carlos Vega', fechaHace(55), 'Pendiente'),
    crearOrden('OC-2025-0091', 'Soluciones Logisticas Omega', 2, '$67,200', 'Andrea Morales', fechaHace(110), 'Activo'),
    crearOrden('OC-2025-0086', 'TechnoInsumos SA de CV', 7, '$128,900', 'Ricardo Torres', fechaHace(300), 'Cancelado'),
  ];
}

function crearOrden(
  folio: string,
  proveedor: string,
  articulos: number,
  total: string,
  solicitante: string,
  fecha: string,
  estado: EstadoOrdenCompra,
  minutosHace = 0,
): OrdenCompra {
  const actualizadaEn = fechaIso(fecha, minutosHace);
  return {
    folio,
    proveedor,
    articulos,
    total,
    solicitante,
    fecha,
    estado,
    cancelable: estado !== 'Completado' && estado !== 'Cancelado',
    actualizadaEn,
    historial: [{
      id: `${folio}-inicial`,
      estado,
      fecha: actualizadaEn,
      comentario: comentarioEstado(estado),
    }],
  };
}

function normalizarOrden(
  orden: Partial<OrdenCompra> & Pick<OrdenCompra, 'folio'>,
): OrdenCompra {
  const estadoGuardado = esEstado(orden.estado) ? orden.estado : 'Pendiente';
  // Migra únicamente el registro demostrativo antiguo que antes quedaba
  // eternamente en tránsito. No modifica órdenes reales ni pendientes recientes.
  const corrigeTransitoDemoAntiguo =
    orden.folio === 'OC-2025-0088' && estadoGuardado === 'En transito';
  const estado: EstadoOrdenCompra = corrigeTransitoDemoAntiguo
    ? 'Completado'
    : estadoGuardado;
  const fecha = typeof orden.fecha === 'string' && orden.fecha
    ? orden.fecha
    : fechaHace(0);
  const actualizadaEn = fechaIso(
    typeof orden.actualizadaEn === 'string' && orden.actualizadaEn
      ? orden.actualizadaEn
      : fecha,
  );
  const historialBase = Array.isArray(orden.historial) && orden.historial.length
    ? orden.historial.filter(evento =>
      evento
      && esEstado(evento.estado)
      && typeof evento.fecha === 'string')
    : [{
      id: `${orden.folio}-migrada`,
      estado,
      fecha: actualizadaEn,
      comentario: comentarioEstado(estado),
    }];
  const historial = corrigeTransitoDemoAntiguo
    ? [
      ...historialBase,
      {
        id: `${orden.folio}-migracion-completada`,
        estado: 'Completado' as const,
        fecha: actualizadaEn,
        comentario: 'Mercancía entregada y compra completada.',
      },
    ]
    : historialBase;
  return {
    folio: orden.folio,
    proveedor: String(orden.proveedor || 'Proveedor sin nombre'),
    articulos: Math.max(0, Number(orden.articulos) || 0),
    total: String(orden.total || '$0'),
    solicitante: String(orden.solicitante || 'Sin solicitante'),
    fecha,
    estado,
    cancelable: estado !== 'Completado' && estado !== 'Cancelado',
    actualizadaEn,
    historial,
    almacenId: Number.isFinite(Number(orden.almacenId))
      ? Number(orden.almacenId)
      : undefined,
    almacen: typeof orden.almacen === 'string' ? orden.almacen : undefined,
    fechaEntrega: typeof orden.fechaEntrega === 'string'
      ? orden.fechaEntrega
      : undefined,
    condiciones: orden.condiciones === 'Contado' ? 'Contado' : undefined,
    partidas: Array.isArray(orden.partidas)
      ? orden.partidas.map(partida => ({
        ...partida,
        impuestoPorcentaje: Number(partida.impuestoPorcentaje) || 0,
      }))
      : undefined,
  };
}

function esEstado(valor: unknown): valor is EstadoOrdenCompra {
  return ['Pendiente', 'Activo', 'En transito', 'Completado', 'Cancelado']
    .includes(String(valor));
}

function fechaIso(valor: string, minutosHace = 0): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '1970-01-01T00:00:00.000Z';
  if (minutosHace) {
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - minutosHace);
    return hoy.toISOString();
  }
  return fecha.toISOString();
}

function comentarioEstado(estado: EstadoOrdenCompra): string {
  if (estado === 'Completado') return 'Mercancía entregada y compra completada.';
  if (estado === 'En transito') return 'Pedido en tránsito hacia el almacén.';
  if (estado === 'Activo') return 'Orden aprobada y en seguimiento.';
  if (estado === 'Cancelado') return 'Orden cancelada.';
  return 'Orden pendiente de aprobación.';
}

function formatearImporte(total: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(total);
}
