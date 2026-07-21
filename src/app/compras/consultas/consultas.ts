import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IMPORTACIONES_MATERIAL_CONSULTAS } from '../../shared/material/importaciones-material';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';

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
    EncabezadoPagina,
    Estado,
    IMPORTACIONES_MATERIAL_CONSULTAS,
  ],
})
export class Consultas {
  readonly columnas = ['folio', 'proveedor', 'solicitante', 'articulos', 'total', 'fecha', 'estado', 'acciones'] as const;
  readonly fechaInicio = new Date(2025, 5, 1);
  readonly fechaFin = new Date(2025, 5, 18);
  readonly ordenes: OrdenCompra[] = [
    this.crearOrden('OC-2025-0087', 'TechnoInsumos SA de CV', 'Laura Hernández', 5, 84500, '15 Jun 2025', 'Completado'),
    this.crearOrden('OC-2025-0088', 'Electrónica Empresarial MX', 'Marco Jiménez', 3, 42300, '16 Jun 2025', 'En tránsito'),
    this.crearOrden('OC-2025-0089', 'Materiales del Norte SA', 'Diana Ruiz', 12, 156800, '17 Jun 2025', 'Activo'),
    this.crearOrden('OC-2025-0090', 'Grupo Distribuidora Nacional', 'Carlos Vega', 8, 23400, '17 Jun 2025', 'Pendiente'),
    this.crearOrden('OC-2025-0091', 'Soluciones Logísticas Omega', 'Andrea Morales', 2, 67200, '18 Jun 2025', 'Activo'),
    this.crearOrden('OC-2025-0086', 'TechnoInsumos SA de CV', 'Ricardo Torres', 7, 128900, '14 Jun 2025', 'Cancelado'),
  ];
  readonly pedidosActivos = this.ordenes.slice(0, 5);
  readonly ordenSeleccionada = signal(this.ordenes[1]);
  readonly detalleOrden = computed(() => this.ordenSeleccionada());

  seleccionarOrden(orden: OrdenCompra): void {
    this.ordenSeleccionada.set(orden);
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
