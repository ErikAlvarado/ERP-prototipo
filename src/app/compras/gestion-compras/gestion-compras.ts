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

export interface OrdenCompra {
  folio: string;
  proveedor: string;
  articulos: number;
  total: string;
  solicitante: string;
  fecha: string;
  estado: 'Completado' | 'En transito' | 'Activo' | 'Pendiente' | 'Cancelado';
  cancelable: boolean;
}

interface OfertaCotizacion {
  proveedor: string;
  precioUnitario: string;
  total: string;
  entrega: string;
  calificacion: number;
  mejorPrecio: boolean;
}

interface Cotizacion {
  folio: string;
  estado: 'Pendiente' | 'Aprobada';
  descripcion: string;
  cantidad: number;
  fecha: string;
  ofertas: OfertaCotizacion[];
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
  private readonly claveSolicitudes = 'erp.solicitudes-compras';
  private readonly claveOrdenes = 'erp.ordenes-compras';
  readonly busquedaOrdenes = signal('');
  readonly periodoOrdenes = signal<PeriodoConsulta>('mes');
  readonly periodos = PERIODOS_CONSULTA;
  readonly estadosOrden: ReadonlyArray<OrdenCompra['estado']> = [
    'Pendiente',
    'Activo',
    'En transito',
    'Completado',
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

  readonly ordenes = signal<OrdenCompra[]>([
    {
      folio: 'OC-2025-0087',
      proveedor: 'TechnoInsumos SA de CV',
      articulos: 5,
      total: '$84,500',
      solicitante: 'Laura Hernandez',
      fecha: '15 Jun 2025',
      estado: 'Completado',
      cancelable: false,
    },
    {
      folio: 'OC-2025-0088',
      proveedor: 'Electronica Empresarial MX',
      articulos: 3,
      total: '$42,300',
      solicitante: 'Marco Jimenez',
      fecha: '16 Jun 2025',
      estado: 'En transito',
      cancelable: true,
    },
    {
      folio: 'OC-2025-0089',
      proveedor: 'Materiales del Norte SA',
      articulos: 12,
      total: '$156,800',
      solicitante: 'Diana Ruiz',
      fecha: fechaHace(25),
      estado: 'Activo',
      cancelable: true,
    },
    {
      folio: 'OC-2025-0090',
      proveedor: 'Grupo Distribuidora Nacional',
      articulos: 8,
      total: '$23,400',
      solicitante: 'Carlos Vega',
      fecha: fechaHace(55),
      estado: 'Pendiente',
      cancelable: true,
    },
    {
      folio: 'OC-2025-0091',
      proveedor: 'Soluciones Logisticas Omega',
      articulos: 2,
      total: '$67,200',
      solicitante: 'Andrea Morales',
      fecha: fechaHace(110),
      estado: 'Activo',
      cancelable: true,
    },
    {
      folio: 'OC-2025-0086',
      proveedor: 'TechnoInsumos SA de CV',
      articulos: 7,
      total: '$128,900',
      solicitante: 'Ricardo Torres',
      fecha: fechaHace(300),
      estado: 'Cancelado',
      cancelable: false,
    },
  ]);

  readonly ordenesFiltradas = computed(() => {
    const termino = this.normalizar(this.busquedaOrdenes());
    return this.ordenes().filter((orden) => {
      const coincideBusqueda = !termino || this.normalizar(`${orden.folio} ${orden.proveedor} ${orden.solicitante} ${orden.estado}`).includes(termino);
      return coincideBusqueda && perteneceAlPeriodo(orden.fecha, this.periodoOrdenes());
    });
  });

  buscarOrden(valor: string): void {
    this.busquedaOrdenes.set(valor);
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

  cancelarOrden(folio: string): void {
    this.ordenes.update((ordenes) =>
      ordenes.map((orden) =>
        orden.folio === folio ? { ...orden, estado: 'Cancelado', cancelable: false } : orden,
      ),
    );
    this.persistencia.guardar(this.claveOrdenes, this.ordenes());
    this.avisos.open(`Orden ${folio} cancelada`, 'Cerrar', { duration: 3500 });
  }

  actualizarEstadoOrden(folio: string, estado: OrdenCompra['estado']): void {
    this.ordenes.update((ordenes) =>
      ordenes.map((orden) => orden.folio === folio
        ? { ...orden, estado, cancelable: estado !== 'Completado' && estado !== 'Cancelado' }
        : orden),
    );
    this.persistencia.guardar(this.claveOrdenes, this.ordenes());
    this.avisos.open(`Estado de ${folio} actualizado a ${estado}`, 'Cerrar', { duration: 3000 });
  }

  readonly cotizaciones: readonly Cotizacion[] = [
    {
      folio: 'COT-2025-0023',
      estado: 'Pendiente',
      descripcion: 'Laptops Dell Latitude 5540 (5 unidades)',
      cantidad: 5,
      fecha: '16 Jun 2025',
      ofertas: [
        {
          proveedor: 'TechnoInsumos SA de CV',
          precioUnitario: '$18,500',
          total: '$92,500',
          entrega: '7 dias habiles',
          calificacion: 4.8,
          mejorPrecio: false,
        },
        {
          proveedor: 'Electronica Empresarial MX',
          precioUnitario: '$17,800',
          total: '$89,000',
          entrega: '10 dias habiles',
          calificacion: 4.5,
          mejorPrecio: true,
        },
        {
          proveedor: 'Distribuidora DirectTech',
          precioUnitario: '$19,200',
          total: '$96,000',
          entrega: '5 dias habiles',
          calificacion: 4.1,
          mejorPrecio: false,
        },
      ],
    },
    {
      folio: 'COT-2025-0024',
      estado: 'Aprobada',
      descripcion: 'Sillas Ergonomicas ProMesh (12 unidades)',
      cantidad: 12,
      fecha: '15 Jun 2025',
      ofertas: [
        {
          proveedor: 'Muebles Corporativos SA',
          precioUnitario: '$4,200',
          total: '$50,400',
          entrega: '14 dias habiles',
          calificacion: 4.3,
          mejorPrecio: false,
        },
        {
          proveedor: 'Oficinas & Diseno MX',
          precioUnitario: '$3,950',
          total: '$47,400',
          entrega: '21 dias habiles',
          calificacion: 3.8,
          mejorPrecio: true,
        },
      ],
    },
  ];

  constructor() {
    this.solicitudes.set(this.persistencia.leer(this.claveSolicitudes, this.solicitudes()));
    this.ordenes.set(this.persistencia.leer(this.claveOrdenes, this.ordenes()));
    // Migra fechas de demostración antiguas para que los filtros de periodo sigan mostrando datos.
    if (!this.ordenes().some((orden) => perteneceAlPeriodo(orden.fecha, 'anio'))) {
      const antiguedad = [0, 8, 25, 55, 110, 300];
      this.ordenes.update((ordenes) => ordenes.map((orden, indice) => ({
        ...orden,
        fecha: fechaHace(antiguedad[indice] ?? 300),
      })));
      this.persistencia.guardar(this.claveOrdenes, this.ordenes());
    }
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
