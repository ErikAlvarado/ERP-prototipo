import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Archivos } from '../../../shared/services/archivos';
import {
  ContextoInventario,
  GestionInventario,
  MovimientoInventario,
} from '../gestion-inventario';
import { KardexDetalle } from './kardex-detalle/kardex-detalle';
import {
  CampoFiltroInventario,
  FiltrosInventarioDialog,
  ValorFiltroInventario,
} from '../filtros-inventario-dialog/filtros-inventario-dialog';

@Component({
  selector: 'app-kardex',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, DatePipe, MatPaginatorModule, MatMenuModule],
  templateUrl: './kardex.html',
  styleUrl: './kardex.css',
})
export class Kardex implements OnInit, AfterViewInit {
  displayedColumns = [
    'id', 'fecha', 'producto', 'almacen', 'tipo', 'lote', 'caducidad',
    'cantidad', 'existencia', 'costo', 'referencia', 'usuario', 'acciones',
  ];
  dataSource = new MatTableDataSource<MovimientoInventario>([]);
  obs!: Observable<MovimientoInventario[]>;
  contexto?: ContextoInventario;
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtros: Record<string, ValorFiltroInventario> = {
    productoId: '',
    almacenId: '',
    movimiento: '',
    usuarioId: '',
    fechaDesde: '',
    fechaHasta: '',
    lote: '',
    costoMinimo: null,
    costoMaximo: null,
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private gestion: GestionInventario,
    private archivos: Archivos,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (item, filtro) => {
      const f = JSON.parse(filtro) as {
        search: string;
        productoId: string;
        almacenId: string;
        movimiento: string;
        usuarioId: string;
        fechaDesde: string;
        fechaHasta: string;
        lote: string;
        costoMinimo: number | null;
        costoMaximo: number | null;
      };
      const tieneLote = this.tieneValor(item.lote);
      return `${item.id} ${item.sku} ${item.producto} ${item.almacen} ${item.lote} ${item.caducidad} ${item.referencia} ${item.observaciones} ${item.usuario}`
        .toLowerCase().includes(f.search)
        && (!f.productoId || item.productoId === Number(f.productoId))
        && (!f.almacenId || item.almacenId === Number(f.almacenId))
        && (!f.movimiento || item.tipo === f.movimiento)
        && (!f.usuarioId || item.usuarioId === Number(f.usuarioId))
        && (!f.fechaDesde || item.fecha.slice(0, 10) >= f.fechaDesde)
        && (!f.fechaHasta || item.fecha.slice(0, 10) <= f.fechaHasta)
        && (!f.lote || (f.lote === 'Con lote' ? tieneLote : !tieneLote))
        && (f.costoMinimo == null || item.costoUnitario >= Number(f.costoMinimo))
        && (f.costoMaximo == null || item.costoUnitario <= Number(f.costoMaximo));
    };
    this.obs = this.dataSource.connect();
    this.gestion.cargar().subscribe((contexto) => {
      this.contexto = contexto;
      this.dataSource.data = contexto.movimientos;
      const productoId = Number(this.route.snapshot.queryParamMap.get('producto')) || null;
      const almacenId = Number(this.route.snapshot.queryParamMap.get('almacen')) || null;
      if (productoId) this.filtros = { ...this.filtros, productoId: String(productoId) };
      if (almacenId) this.filtros = { ...this.filtros, almacenId: String(almacenId) };
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get nombreAlmacen(): string {
    return this.contexto?.almacenes.find((item) => item.id === Number(this.filtros['almacenId']))?.nombre || 'Almacén';
  }

  get currentMovement(): string {
    return String(this.filtros['movimiento'] || '');
  }

  get tiposMovimiento(): string[] {
    return [...new Set(this.dataSource.data.map((item) => item.tipo))].sort();
  }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter((value) => value !== '' && value !== null).length;
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      ...this.filtros,
    });
    this.paginator?.firstPage();
  }

  setAlmacen(id: number | null): void {
    this.filtros = { ...this.filtros, almacenId: id == null ? '' : String(id) };
    this.applyFilter();
  }

  setMovimiento(tipo: string): void {
    this.filtros = { ...this.filtros, movimiento: tipo };
    this.applyFilter();
  }

  abrirFiltros(): void {
    if (!this.contexto) return;
    const fields: CampoFiltroInventario[] = [
      {
        key: 'productoId', label: 'Producto', icon: 'inventory_2', type: 'select', emptyLabel: 'Todos los productos',
        options: this.contexto.productos.map((item) => ({ value: String(item.id), label: `${item.sku} · ${item.nombre}` })),
      },
      {
        key: 'almacenId', label: 'Almacén', icon: 'warehouse', type: 'select', emptyLabel: 'Todos los almacenes',
        options: this.contexto.almacenes.map((item) => ({ value: String(item.id), label: item.nombre })),
      },
      {
        key: 'movimiento', label: 'Tipo de movimiento', icon: 'swap_vert', type: 'select', emptyLabel: 'Todos los movimientos',
        options: this.tiposMovimiento.map((value) => ({ value, label: value })),
      },
      {
        key: 'usuarioId', label: 'Responsable', icon: 'person', type: 'select', emptyLabel: 'Todos los responsables',
        options: this.contexto.usuarios.map((item) => ({ value: String(item.id), label: item.nombre })),
      },
      { key: 'fechaDesde', label: 'Fecha desde', icon: 'calendar_today', type: 'date' },
      { key: 'fechaHasta', label: 'Fecha hasta', icon: 'event', type: 'date' },
      {
        key: 'lote', label: 'Lote', icon: 'qr_code_2', type: 'select', emptyLabel: 'Con y sin lote',
        options: [{ value: 'Con lote', label: 'Con lote' }, { value: 'Sin lote', label: 'Sin lote' }],
      },
      { key: 'costoMinimo', label: 'Costo mínimo', icon: 'payments', type: 'number', defaultValue: null, min: 0, step: .01 },
      { key: 'costoMaximo', label: 'Costo máximo', icon: 'paid', type: 'number', defaultValue: null, min: 0, step: .01 },
    ];
    this.dialog.open(FiltrosInventarioDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { title: 'Filtrar movimientos de Kardex', filters: this.filtros, fields },
    }).afterClosed().subscribe((filters?: Record<string, ValorFiltroInventario>) => {
      if (!filters) return;
      this.filtros = filters;
      this.applyFilter();
    });
  }

  ordenar(orden: string): void {
    this.currentSort = orden;
    const datos = [...this.dataSource.data];
    if (orden === 'Producto A-Z') datos.sort((a, b) => a.producto.localeCompare(b.producto));
    else if (orden === 'Más recientes') datos.sort((a, b) => this.numeroId(b.id) - this.numeroId(a.id));
    else datos.sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id));
    this.dataSource.data = datos;
    this.applyFilter();
  }

  verDetalle(movimiento: MovimientoInventario): void {
    this.dialog.open(KardexDetalle, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: movimiento,
    });
  }

  exportar(): void {
    const filas = this.dataSource.filteredData.map((item) => [
      item.id,
      item.fecha,
      item.sku,
      item.producto,
      item.almacen,
      item.tipo,
      item.lote,
      item.caducidad,
      item.cantidad,
      item.existencia,
      item.costoUnitario,
      item.referencia,
      item.observaciones,
      item.usuario,
    ]);
    this.archivos.descargarCsv(
      `kardex-${new Date().toISOString().slice(0, 10)}.csv`,
      ['ID', 'Fecha', 'SKU', 'Producto', 'Almacén', 'Tipo', 'Lote', 'Caducidad', 'Cantidad', 'Existencia', 'Costo unitario', 'Referencia', 'Observaciones', 'Usuario'],
      filas,
    );
  }

  private tieneValor(value: string): boolean {
    const normalized = (value || '').trim();
    return !!normalized && normalized !== '—' && normalized !== '-';
  }

  private numeroId(id: string): number {
    const numeros = id.match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : Number.MAX_SAFE_INTEGER;
  }
}
