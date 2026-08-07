import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Card } from '../../shared/components/card/card';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';
import { IMPORTACIONES_MATERIAL_COMPRAS } from '../../shared/material/importaciones-material';
import { perteneceAlPeriodo } from '../../shared/utils/periodos-consulta';
import { InventarioComprasService } from '../services/inventario-compras.service';
import {
  OrdenCompra,
  OrdenesCompraService,
} from '../services/ordenes-compra.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    Card,
    EncabezadoPagina,
    Estado,
    BaseChartDirective,
    IMPORTACIONES_MATERIAL_COMPRAS,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly ordenesCompra = inject(OrdenesCompraService);
  readonly inventario = inject(InventarioComprasService);
  readonly displayedColumns = [
    'folio',
    'proveedor',
    'articulos',
    'total',
    'solicitante',
    'fecha',
    'estado',
  ];
  pagina = 0;
  readonly tamanoPagina = 10;

  /** Misma signal y mismos registros que Gestión de compras > Órdenes. */
  get dataSource(): readonly OrdenCompra[] {
    return this.ordenesCompra.ordenesRecientes();
  }

  get ordenesPagina(): readonly OrdenCompra[] {
    const inicio = this.pagina * this.tamanoPagina;
    return this.dataSource.slice(inicio, inicio + this.tamanoPagina);
  }

  get ordenesDelMes(): OrdenCompra[] {
    return this.dataSource.filter(orden => perteneceAlPeriodo(orden.fecha, 'mes'));
  }

  get comprasDelMes(): number {
    return this.ordenesDelMes
      .filter(orden => orden.estado !== 'Cancelado')
      .reduce((total, orden) => total + importeNumerico(orden.total), 0);
  }

  get ordenesEnProceso(): number {
    return this.dataSource.filter(orden =>
      orden.estado !== 'Completado' && orden.estado !== 'Cancelado').length;
  }

  get proveedoresConOrdenes(): number {
    return new Set(
      this.dataSource
        .filter(orden => orden.estado !== 'Cancelado')
        .map(orden => orden.proveedor),
    ).size;
  }

  get actividadReciente() {
    return this.ordenesCompra.actividadReciente();
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina = evento.pageIndex;
  }

  get comprasData(): ChartConfiguration<'line'>['data'] {
    const meses = this.ultimosMeses(6);
    return {
      labels: meses.map(mes => mes.etiqueta),
      datasets: [{
        label: 'Compras',
        data: meses.map(mes => this.dataSource
          .filter(orden =>
            orden.estado !== 'Cancelado'
            && claveMes(orden.fecha) === mes.clave)
          .reduce((total, orden) => total + importeNumerico(orden.total), 0) / 1000),
        borderColor: '#172554',
        backgroundColor: 'rgba(23, 37, 84, 0.12)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      }],
    };
  }

  get periodoGrafica(): string {
    const meses = this.ultimosMeses(6);
    return `${meses[0].etiqueta} – ${meses.at(-1)?.etiqueta} · miles MXN`;
  }

  readonly comprasOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: '#eef2f7', drawTicks: false },
        border: { color: '#9ca3af' },
        ticks: { color: '#94a3b8', padding: 8 },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', padding: 8 },
        grid: { color: '#eef2f7', drawTicks: false },
        border: { color: '#9ca3af' },
      },
    },
  };

  private ultimosMeses(cantidad: number): Array<{ clave: string; etiqueta: string }> {
    const hoy = new Date();
    return Array.from({ length: cantidad }, (_, indice) => {
      const fecha = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - (cantidad - 1 - indice),
        1,
      );
      return {
        clave: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
        etiqueta: new Intl.DateTimeFormat('es-MX', {
          month: 'short',
          year: '2-digit',
        }).format(fecha).replace('.', '').replace(/^\w/, letra =>
          letra.toLocaleUpperCase('es-MX')),
      };
    });
  }
}

export function importeNumerico(valor: string): number {
  const limpio = valor.replace(/[^\d.-]/g, '');
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function claveMes(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}
