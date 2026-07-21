import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IMPORTACIONES_MATERIAL_CONSULTAS } from '../../shared/material/importaciones-material';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';
import { Archivos } from '../../shared/services/archivos';
import { MatSnackBar } from '../../shared/material/importaciones-material';
import { fechaHace, inicioPeriodo, perteneceAlPeriodo, PeriodoConsulta, PERIODOS_CONSULTA } from '../../shared/utils/periodos-consulta';

interface OrdenCompra {
  folio: string;
  proveedor: string;
  solicitante: string;
  articulos: number;
  total: number;
  fecha: string;
  estado: 'Completado' | 'En tránsito' | 'Activo' | 'Pendiente' | 'Cancelado';
  estadoClase: string;
  etapas: readonly EtapaOrden[];
}

interface EtapaOrden {
  nombre: string;
  fecha: string;
  completada: boolean;
}

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
  readonly columnas = ['folio', 'proveedor', 'solicitante', 'articulos', 'total', 'fecha', 'estado', 'acciones'] as const;
  readonly periodo = signal<PeriodoConsulta>('mes');
  readonly periodos = PERIODOS_CONSULTA;
  descripcionReporte = '';
  tipoReporte = 'periodo';
  formatoReporte = 'pdf';
  readonly ordenes: OrdenCompra[] = [
    this.crearOrden('OC-2026-0087', 'TechnoInsumos SA de CV', 'Laura Hernández', 5, 84500, fechaHace(0), 'Completado'),
    this.crearOrden('OC-2026-0088', 'Electrónica Empresarial MX', 'Marco Jiménez', 3, 42300, fechaHace(8), 'En tránsito'),
    this.crearOrden('OC-2026-0089', 'Materiales del Norte SA', 'Diana Ruiz', 12, 156800, fechaHace(25), 'Activo'),
    this.crearOrden('OC-2026-0090', 'Grupo Distribuidora Nacional', 'Carlos Vega', 8, 23400, fechaHace(55), 'Pendiente'),
    this.crearOrden('OC-2026-0091', 'Soluciones Logísticas Omega', 'Andrea Morales', 2, 67200, fechaHace(110), 'Activo'),
    this.crearOrden('OC-2026-0086', 'TechnoInsumos SA de CV', 'Ricardo Torres', 7, 128900, fechaHace(300), 'Cancelado'),
  ];
  readonly ordenesFiltradas = computed(() => this.ordenes.filter((orden) => perteneceAlPeriodo(orden.fecha, this.periodo())));
  readonly pedidosActivos = computed(() => this.ordenesFiltradas().filter((orden) => orden.estado !== 'Cancelado'));
  readonly totalPeriodo = computed(() => this.ordenesFiltradas().reduce((total, orden) => total + orden.total, 0));
  readonly canceladasPeriodo = computed(() => this.ordenesFiltradas().filter((orden) => orden.estado === 'Cancelado').length);
  readonly ordenSeleccionada = signal(this.ordenes[0]);
  readonly detalleOrden = computed(() => this.ordenSeleccionada());

  seleccionarOrden(orden: OrdenCompra): void {
    this.ordenSeleccionada.set(orden);
  }

  exportarHistorial(): void {
    this.archivos.descargarCsv(
      'historial-compras.csv',
      ['Folio', 'Proveedor', 'Solicitante', 'Articulos', 'Total', 'Fecha', 'Estado'],
      this.ordenesFiltradas().map((orden) => [orden.folio, orden.proveedor, orden.solicitante, orden.articulos, orden.total, orden.fecha, orden.estado]),
    );
    this.notificacion.open('Historial exportado', 'Cerrar', { duration: 2500 });
  }

  recomprar(orden: OrdenCompra): void {
    this.notificacion.open(`Selecciona ${orden.proveedor} para repetir la compra`, 'Cerrar', { duration: 3500 });
    void this.router.navigate(['/compras/proveedores'], { queryParams: { buscar: orden.proveedor } });
  }

  generarReporte(): void {
    const resumen = [
      'REPORTE DE COMPRAS',
      `Tipo: ${this.tipoReporte}`,
      `Periodo: ${inicioPeriodo(this.periodo()).toLocaleDateString('es-MX')} - ${new Date().toLocaleDateString('es-MX')}`,
      `Descripcion: ${this.descripcionReporte.trim() || 'Sin descripcion'}`,
      `Ordenes: ${this.ordenesFiltradas().length}`,
      `Total: ${this.totalPeriodo().toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`,
    ].join('\n');
    if (this.formatoReporte === 'csv' || this.formatoReporte === 'xlsx') {
      this.exportarHistorial();
      return;
    }
    this.archivos.descargarTexto('reporte-compras.txt', resumen);
    this.notificacion.open('Reporte generado', 'Cerrar', { duration: 2500 });
  }

  private crearOrden(
    folio: string,
    proveedor: string,
    solicitante: string,
    articulos: number,
    total: number,
    fecha: string,
    estado: OrdenCompra['estado'],
  ): OrdenCompra {
    const enCurso = estado !== 'Completado' && estado !== 'Cancelado';
    return {
      folio,
      proveedor,
      solicitante,
      articulos,
      total,
      fecha,
      estado,
      estadoClase: estado.toLocaleLowerCase('es-MX').replaceAll(' ', '-'),
      etapas: [
        { nombre: 'Solicitud creada', fecha: '16 Jun · 10:32', completada: true },
        { nombre: 'Aprobación dirección', fecha: '16 Jun · 14:15', completada: true },
        { nombre: 'Orden de compra emitida', fecha: '16 Jun · 16:00', completada: true },
        { nombre: 'Confirmación del proveedor', fecha: '17 Jun · 09:20', completada: estado !== 'Pendiente' },
        { nombre: 'En tránsito', fecha: enCurso ? '17 Jun · 15:45' : estado === 'Completado' ? '18 Jun · 08:15' : 'Pendiente', completada: estado === 'En tránsito' || estado === 'Completado' },
        { nombre: 'Entregado y recibido', fecha: estado === 'Completado' ? '18 Jun · 13:10' : 'Pendiente', completada: estado === 'Completado' },
      ],
    };
  }
}
