import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IMPORTACIONES_MATERIAL_COMPRAS } from '../../shared/material/importaciones-material';
import { Card } from '../../shared/components/card/card';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { MatDialog, MatSnackBar } from '../../shared/material/importaciones-material';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';
import { DetalleOrdenDialog } from './dialogs/detalle-orden-dialog/detalle-orden-dialog';
import { fechaHace, perteneceAlPeriodo, PeriodoConsulta, PERIODOS_CONSULTA } from '../../shared/utils/periodos-consulta';
import { PageEvent } from '@angular/material/paginator';
import {
  EstadoOrdenCompra,
  OrdenCompra,
  OrdenesCompraService,
} from '../services/ordenes-compra.service';

interface SolicitudCompra {
  folio: string;
  descripcion: string;
  solicitante: string;
  fecha: string;
  depto: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Aprobada' | 'Pendiente' | 'Cancelada';
  importe: string;
}

@Component({
  selector: 'app-gestion-compras',
  imports: [CommonModule, Card, EncabezadoPagina, Estado, IMPORTACIONES_MATERIAL_COMPRAS],
  templateUrl: './gestion-compras.html',
  styleUrl: './gestion-compras.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCompras {
  private readonly dialogo = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly ordenesCompra = inject(OrdenesCompraService);
  private readonly claveSolicitudes = 'erp.solicitudes-compras';
  readonly busquedaOrdenes = signal('');
  readonly periodoOrdenes = signal<PeriodoConsulta>('mes');
  readonly periodos = PERIODOS_CONSULTA;
  readonly etiquetaPeriodoOrdenes = computed(
    () => this.periodos.find((periodo) => periodo.valor === this.periodoOrdenes())?.etiqueta ?? 'Periodo',
  );
  readonly estadosOrden: ReadonlyArray<EstadoOrdenCompra> = [
    'Pendiente',
    'Activo',
    'En transito',
    'Completado',
  ];
  readonly prioridadesSolicitud: ReadonlyArray<SolicitudCompra['prioridad']> = [
    'Baja',
    'Media',
    'Alta',
  ];

  readonly columnasSolicitudes = [
    'folio',
    'descripcion',
    'depto',
    'prioridad',
    'estado',
    'importe',
    'acciones',
  ];

  readonly solicitudes = signal<SolicitudCompra[]>([
    {
      folio: 'SC-2025-0234',
      descripcion: 'Laptops Dell Latitude para area de TI',
      solicitante: 'Laura Hernandez',
      fecha: '12 Jun 2025',
      depto: 'TI',
      prioridad: 'Alta',
      estado: 'Aprobada',
      importe: '$84,500',
    },
    {
      folio: 'SC-2025-0235',
      descripcion: 'Material de oficina tercer trimestre',
      solicitante: 'Marco Jimenez',
      fecha: '14 Jun 2025',
      depto: 'Administracion',
      prioridad: 'Baja',
      estado: 'Pendiente',
      importe: '$8,700',
    },
    {
      folio: 'SC-2025-0236',
      descripcion: 'Equipo de proteccion industrial EPP',
      solicitante: 'Diana Ruiz',
      fecha: fechaHace(2),
      depto: 'Operaciones',
      prioridad: 'Alta',
      estado: 'Pendiente',
      importe: '$45,200',
    },
    {
      folio: 'SC-2025-0237',
      descripcion: 'Mobiliario para sala de juntas norte',
      solicitante: 'Carlos Vega',
      fecha: fechaHace(8),
      depto: 'Direccion General',
      prioridad: 'Media',
      estado: 'Aprobada',
      importe: '$67,800',
    },
    {
      folio: 'SC-2025-0238',
      descripcion: 'Consumibles de impresoras (6 meses)',
      solicitante: 'Andrea Morales',
      fecha: '10 Jun 2025',
      depto: 'Administracion',
      prioridad: 'Media',
      estado: 'Cancelada',
      importe: '$12,400',
    },
    { folio: 'SC-2025-0239', descripcion: 'Monitores para diseño gráfico', solicitante: 'Elena Romero', fecha: fechaHace(3), depto: 'Diseño', prioridad: 'Alta', estado: 'Aprobada', importe: '$56,800' },
    { folio: 'SC-2025-0240', descripcion: 'Renovación de equipo de red', solicitante: 'Roberto Sánchez', fecha: fechaHace(4), depto: 'TI', prioridad: 'Alta', estado: 'Pendiente', importe: '$94,300' },
    { folio: 'SC-2025-0241', descripcion: 'Sillas ergonómicas operativas', solicitante: 'Fernanda Castillo', fecha: fechaHace(5), depto: 'Recursos Humanos', prioridad: 'Media', estado: 'Aprobada', importe: '$72,000' },
    { folio: 'SC-2025-0242', descripcion: 'Herramientas para mantenimiento', solicitante: 'Jorge Ramírez', fecha: fechaHace(6), depto: 'Mantenimiento', prioridad: 'Media', estado: 'Pendiente', importe: '$28,450' },
    { folio: 'SC-2025-0243', descripcion: 'Uniformes para almacén', solicitante: 'Miguel Sánchez', fecha: fechaHace(7), depto: 'Operaciones', prioridad: 'Baja', estado: 'Aprobada', importe: '$19,600' },
    { folio: 'SC-2025-0244', descripcion: 'Licencias de software anual', solicitante: 'Laura Torres', fecha: fechaHace(9), depto: 'TI', prioridad: 'Alta', estado: 'Pendiente', importe: '$135,000' },
    { folio: 'SC-2025-0245', descripcion: 'Equipo audiovisual para capacitación', solicitante: 'Diego Navarro', fecha: fechaHace(12), depto: 'Capacitación', prioridad: 'Media', estado: 'Cancelada', importe: '$43,900' },
  ]);

  readonly columnasOrdenes = [
    'folio',
    'proveedor',
    'articulos',
    'total',
    'solicitante',
    'fecha',
    'estado',
    'acciones',
  ];

  /** La misma lista ordenada que consumen Dashboard y Consultas. */
  readonly ordenes = this.ordenesCompra.ordenesRecientes;

  readonly ordenesFiltradas = computed(() => {
    const termino = this.normalizar(this.busquedaOrdenes());
    return this.ordenes().filter((orden) => {
      const coincideBusqueda = !termino || this.normalizar(`${orden.folio} ${orden.proveedor} ${orden.solicitante} ${orden.estado}`).includes(termino);
      return coincideBusqueda && perteneceAlPeriodo(orden.fecha, this.periodoOrdenes());
    });
  });
  readonly paginaSolicitudes = signal(0);
  readonly paginaOrdenes = signal(0);
  readonly solicitudesPaginadas = computed(() => this.solicitudes().slice(this.paginaSolicitudes() * 10, this.paginaSolicitudes() * 10 + 10));
  readonly ordenesPaginadas = computed(() => this.ordenesFiltradas().slice(this.paginaOrdenes() * 10, this.paginaOrdenes() * 10 + 10));

  cambiarPaginaSolicitudes(evento: PageEvent): void {
    this.paginaSolicitudes.set(evento.pageIndex);
  }

  cambiarPaginaOrdenes(evento: PageEvent): void {
    this.paginaOrdenes.set(evento.pageIndex);
  }

  buscarOrden(valor: string): void {
    this.busquedaOrdenes.set(valor);
    this.paginaOrdenes.set(0);
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
  }

  cancelarSolicitud(folio: string): void {
    this.solicitudes.update((solicitudes) =>
      solicitudes.map((solicitud) =>
        solicitud.folio === folio ? { ...solicitud, estado: 'Cancelada' } : solicitud,
      ),
    );
    this.persistencia.guardar(this.claveSolicitudes, this.solicitudes());
    this.avisos.open(`Solicitud ${folio} cancelada`, 'Cerrar', { duration: 3500 });
  }

  actualizarPrioridadSolicitud(folio: string, prioridad: SolicitudCompra['prioridad']): void {
    this.solicitudes.update((solicitudes) =>
      solicitudes.map((solicitud) => solicitud.folio === folio
        ? { ...solicitud, prioridad }
        : solicitud),
    );
    this.persistencia.guardar(this.claveSolicitudes, this.solicitudes());
    this.avisos.open(`Prioridad de ${folio} actualizada a ${prioridad}`, 'Cerrar', { duration: 3000 });
  }

  cancelarOrden(folio: string): void {
    this.ordenesCompra.cancelar(folio);
    this.avisos.open(`Orden ${folio} cancelada`, 'Cerrar', { duration: 3500 });
  }

  actualizarEstadoOrden(folio: string, estado: EstadoOrdenCompra): void {
    this.ordenesCompra.actualizarEstado(folio, estado);
    this.avisos.open(`Estado de ${folio} actualizado a ${estado}`, 'Cerrar', { duration: 3000 });
  }

  constructor() {
    const solicitudesDemo = this.solicitudes();
    const solicitudesGuardadas = this.persistencia.leer(this.claveSolicitudes, solicitudesDemo);
    const foliosSolicitudesGuardadas = new Set(solicitudesGuardadas.map((solicitud) => solicitud.folio));
    this.solicitudes.set([
      ...solicitudesDemo.filter((solicitud) => !foliosSolicitudesGuardadas.has(solicitud.folio)),
      ...solicitudesGuardadas,
    ]);
    this.persistencia.guardar(this.claveSolicitudes, this.solicitudes());
  }

  verOrden(orden: OrdenCompra): void {
    this.dialogo.open(DetalleOrdenDialog, { data: orden, width: '560px', maxWidth: '94vw' });
  }

  confirmarCancelacionSolicitud(folio: string): void {
    this.dialogo.open(ConfirmDialog, {
      data: {
        title: 'Cancelar solicitud',
        message: `La solicitud ${folio} quedara cancelada y no continuara al proceso de compra.`,
        confirmText: 'Cancelar solicitud',
      },
    }).afterClosed().subscribe((confirmado) => confirmado && this.cancelarSolicitud(folio));
  }

  confirmarCancelacionOrden(folio: string): void {
    this.dialogo.open(ConfirmDialog, {
      data: {
        title: 'Cancelar orden',
        message: `Confirma que deseas cancelar la orden ${folio}. Esta accion quedara registrada.`,
        confirmText: 'Cancelar orden',
      },
    }).afterClosed().subscribe((confirmado) => confirmado && this.cancelarOrden(folio));
  }
}
