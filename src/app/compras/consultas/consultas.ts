import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';
import {
  IMPORTACIONES_MATERIAL_CONSULTAS,
  MatSnackBar,
} from '../../shared/material/importaciones-material';
import { Archivos } from '../../shared/services/archivos';
import { ReportePdf } from '../../shared/services/reporte-pdf';
import {
  inicioPeriodo,
  perteneceAlPeriodo,
  PeriodoConsulta,
  PERIODOS_CONSULTA,
} from '../../shared/utils/periodos-consulta';
import {
  ESTADOS_ORDEN_SEGUIMIENTO,
  OrdenCompra,
  OrdenesCompraService,
} from '../services/ordenes-compra.service';

interface EtapaOrden {
  nombre: string;
  fecha: string;
  completada: boolean;
}

interface OrdenConsulta extends OrdenCompra {
  totalNumerico: number;
  estadoClase: string;
  etapas: readonly EtapaOrden[];
}

type VistaSeguimiento = 'activos' | 'seguimiento';

@Component({
  selector: 'app-consultas',
  templateUrl: 'consultas.html',
  styleUrl: './consultas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    EncabezadoPagina,
    Estado,
    IMPORTACIONES_MATERIAL_CONSULTAS,
  ],
})
export class Consultas {
  private readonly archivos = inject(Archivos);
  private readonly router = inject(Router);
  private readonly notificacion = inject(MatSnackBar);
  private readonly reportePdf = inject(ReportePdf);
  private readonly ordenesCompra = inject(OrdenesCompraService);

  readonly columnas = [
    'folio',
    'proveedor',
    'solicitante',
    'articulos',
    'total',
    'fecha',
    'estado',
    'acciones',
  ] as const;
  readonly periodo = signal<PeriodoConsulta>('anio');
  readonly periodos = PERIODOS_CONSULTA;
  readonly etiquetaPeriodo = computed(() =>
    this.periodos.find(opcion => opcion.valor === this.periodo())?.etiqueta
    ?? 'Periodo');
  readonly paginaHistorial = signal(0);
  readonly ordenSeleccionadaFolio = signal('');
  readonly vistaSeguimiento = signal<VistaSeguimiento>('activos');
  descripcionReporte = '';
  tipoReporte = 'periodo';
  formatoReporte = 'pdf';

  /** Misma signal base que Gestión; solo agrega datos de presentación. */
  readonly ordenes = computed<OrdenConsulta[]>(() =>
    this.ordenesCompra.ordenesRecientes().map(orden => ({
      ...orden,
      totalNumerico: importeNumerico(orden.total),
      estadoClase: claseEstado(orden.estado),
      etapas: etapasOrden(orden),
    })));

  /**
   * Pendientes de cualquier antigüedad: el filtro del historial nunca debe
   * esconder una orden que todavía no ha sido entregada.
   */
  readonly pedidosActivos = computed(() =>
    this.ordenes().filter(orden =>
      orden.estado !== 'Completado' && orden.estado !== 'Cancelado'));
  readonly ordenesSeguimiento = computed(() =>
    this.ordenes().filter(orden =>
      ESTADOS_ORDEN_SEGUIMIENTO.includes(orden.estado)));
  readonly pedidosMostrados = computed(() =>
    this.vistaSeguimiento() === 'activos'
      ? this.pedidosActivos()
      : this.ordenesSeguimiento());

  readonly ordenesPeriodo = computed(() =>
    this.ordenes().filter(orden =>
      perteneceAlPeriodo(orden.fecha, this.periodo())));
  /** Historial significa compras terminadas, no cualquier orden antigua. */
  readonly ordenesFiltradas = computed(() =>
    this.ordenesPeriodo().filter(orden => orden.estado === 'Completado'));
  readonly ordenesPaginadas = computed(() =>
    this.ordenesFiltradas().slice(
      this.paginaHistorial() * 10,
      this.paginaHistorial() * 10 + 10,
    ));
  readonly totalPeriodo = computed(() =>
    this.ordenesFiltradas().reduce(
      (total, orden) => total + orden.totalNumerico,
      0,
    ));
  readonly canceladasPeriodo = computed(() =>
    this.ordenesPeriodo().filter(orden => orden.estado === 'Cancelado').length);
  readonly proveedorMayor = computed(() => {
    const importes = new Map<string, number>();
    this.ordenesFiltradas().forEach(orden =>
      importes.set(
        orden.proveedor,
        (importes.get(orden.proveedor) || 0) + orden.totalNumerico,
      ));
    return [...importes].sort((a, b) => b[1] - a[1])[0]
      || ['Sin compras completadas', 0] as [string, number];
  });
  readonly detalleOrden = computed(() => {
    const pedidos = this.pedidosMostrados();
    return pedidos.find(orden => orden.folio === this.ordenSeleccionadaFolio())
      || pedidos[0]
      || ordenVacia();
  });

  cambiarPaginaHistorial(evento: PageEvent): void {
    this.paginaHistorial.set(evento.pageIndex);
  }

  cambiarPeriodo(periodo: PeriodoConsulta): void {
    this.periodo.set(periodo);
    this.paginaHistorial.set(0);
  }

  cambiarVistaSeguimiento(vista: VistaSeguimiento): void {
    this.vistaSeguimiento.set(vista);
    this.ordenSeleccionadaFolio.set('');
  }

  seleccionarOrden(orden: OrdenConsulta): void {
    this.ordenSeleccionadaFolio.set(orden.folio);
  }

  exportarHistorial(): void {
    this.archivos.descargarCsv(
      'historial-compras-completadas.csv',
      ['Folio', 'Proveedor', 'Solicitante', 'Artículos', 'Total', 'Fecha', 'Estado'],
      this.ordenesFiltradas().map(orden => [
        orden.folio,
        orden.proveedor,
        orden.solicitante,
        orden.articulos,
        orden.totalNumerico,
        orden.fecha,
        orden.estado,
      ]),
    );
    this.notificacion.open('Historial de compras completadas exportado', 'Cerrar', {
      duration: 2500,
    });
  }

  recomprar(orden: OrdenConsulta): void {
    this.notificacion.open(
      `Selecciona ${orden.proveedor} para repetir la compra`,
      'Cerrar',
      { duration: 3500 },
    );
    void this.router.navigate(['/compras/proveedores'], {
      queryParams: { buscar: orden.proveedor },
    });
  }

  async generarReporte(): Promise<void> {
    if (this.formatoReporte === 'csv' || this.formatoReporte === 'xlsx') {
      this.exportarHistorial();
      return;
    }
    await this.reportePdf.descargarCompras({
      periodo: `Del ${inicioPeriodo(this.periodo()).toLocaleDateString('es-MX')} al ${new Date().toLocaleDateString('es-MX')}`,
      descripcion: this.descripcionReporte.trim(),
      total: this.totalPeriodo(),
      ordenes: this.ordenesFiltradas().map(orden => ({
        ...orden,
        total: orden.totalNumerico,
      })),
    });
    this.notificacion.open('PDF de compras completadas generado', 'Cerrar', {
      duration: 2500,
    });
  }
}

function importeNumerico(valor: string): number {
  const numero = Number(valor.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numero) ? numero : 0;
}

function claseEstado(estado: string): string {
  return estado
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-');
}

function etapasOrden(orden: OrdenCompra): EtapaOrden[] {
  const indiceEstado = {
    Pendiente: 0,
    Activo: 2,
    'En transito': 4,
    Completado: 5,
    Cancelado: 0,
  }[orden.estado];
  const fecha = orden.historial.at(-1)?.fecha || orden.actualizadaEn;
  const nombres = [
    'Orden de compra emitida',
    'Aprobación de compra',
    'Confirmación del proveedor',
    'Preparación del pedido',
    'En tránsito',
    'Entregado y recibido',
  ];
  return nombres.map((nombre, indice) => ({
    nombre,
    fecha: indice <= indiceEstado
      ? new Date(fecha).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      : 'Pendiente',
    completada: orden.estado !== 'Cancelado' && indice <= indiceEstado,
  }));
}

function ordenVacia(): OrdenConsulta {
  return {
    folio: 'Sin pedidos para mostrar',
    proveedor: '—',
    articulos: 0,
    total: '$0',
    totalNumerico: 0,
    solicitante: '—',
    fecha: '',
    estado: 'Pendiente',
    cancelable: false,
    actualizadaEn: '',
    historial: [],
    estadoClase: 'pendiente',
    etapas: [],
  };
}
