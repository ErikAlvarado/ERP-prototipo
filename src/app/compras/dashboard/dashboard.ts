import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { IMPORTACIONES_MATERIAL_COMPRAS } from '../../shared/material/importaciones-material';
import { Card } from '../../shared/components/card/card';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';

export interface OrdenCompra {
  folio: string;
  proveedor: string;
  solicitante: string;
  total: string;
  estado: string;
}

const ORDENES_COMPRA: OrdenCompra[] = [
  {
    folio: 'OC-2025-0087',
    proveedor: 'TechnoInsumos SA de CV',
    solicitante: 'Laura Hernandez',
    total: '$84,500',
    estado: 'Completado',
  },
  {
    folio: 'OC-2025-0088',
    proveedor: 'Electronica Empresarial MX',
    solicitante: 'Marco Jimenez',
    total: '$42,300',
    estado: 'En transito',
  },
  {
    folio: 'OC-2025-0089',
    proveedor: 'Materiales del Norte SA',
    solicitante: 'Diana Ruiz',
    total: '$156,800',
    estado: 'Activo',
  },
  {
    folio: 'OC-2025-0090',
    proveedor: 'Grupo Distribuidora Nacional',
    solicitante: 'Carlos Vega',
    total: '$23,400',
    estado: 'Pendiente',
  },
  {
    folio: 'OC-2025-0091',
    proveedor: 'Soluciones Logisticas Omega',
    solicitante: 'Andrea Morales',
    total: '$67,200',
    estado: 'Activo',
  },
];

@Component({
  selector: 'app-dashboard',
  imports: [
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
  readonly displayedColumns = ['folio', 'proveedor', 'solicitante', 'total', 'estado'];
  readonly dataSource = ORDENES_COMPRA;

  readonly comprasData: ChartConfiguration<'line'>['data'] = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Compras',
        data: [280, 290, 520, 410, 460, 375],
        borderColor: '#172554',
        backgroundColor: 'rgba(23, 37, 84, 0.12)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: 'Presupuesto',
        data: [395, 380, 455, 420, 475, 500],
        borderColor: '#60a5fa',
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        borderWidth: 1.5,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  readonly comprasOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#eef2f7',
          drawTicks: false,
        },
        border: {
          color: '#9ca3af',
        },
        ticks: {
          color: '#94a3b8',
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        max: 600,
        ticks: {
          stepSize: 150,
          color: '#94a3b8',
          padding: 8,
        },
        grid: {
          color: '#eef2f7',
          drawTicks: false,
        },
        border: {
          color: '#9ca3af',
        },
      },
    },
  };
}
