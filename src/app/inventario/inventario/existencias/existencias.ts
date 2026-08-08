import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  ContextoInventario,
  ExistenciaInventario,
  GestionInventario,
} from '../gestion-inventario';
import {
  CampoFiltroInventario,
  FiltrosInventarioDialog,
  ValorFiltroInventario,
} from '../filtros-inventario-dialog/filtros-inventario-dialog';

@Component({
  selector: 'app-existencias',
  imports: [...SHARED_IMPORTS, AsyncPipe, DatePipe, MatPaginatorModule, MatMenuModule],
  templateUrl: './existencias.html',
  styleUrl: './existencias.css',
})
export class Existencias implements OnInit, AfterViewInit {
  displayedColumns = [
    'producto', 'almacen', 'stock', 'estado', 'reorden', 'critico',
    'maximo', 'anaquel', 'actualizacion', 'acciones',
  ];
  dataSource = new MatTableDataSource<ExistenciaInventario>([]);
  obs!: Observable<ExistenciaInventario[]>;
  contexto?: ContextoInventario;
  currentSearch = '';
  currentSort = 'Más recientes';
  filtros: Record<string, ValorFiltroInventario> = {
    productoId: '',
    almacenId: '',
    estado: '',
    stockMinimo: null,
    stockMaximo: null,
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private gestion: GestionInventario,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (item, filtro) => {
      const f = JSON.parse(filtro) as {
        search: string;
        productoId: string;
        almacenId: string;
        estado: string;
        stockMinimo: number | null;
        stockMaximo: number | null;
      };
      return `${item.id} ${item.sku} ${item.producto} ${item.almacen} ${item.anaquel}`
        .toLowerCase().includes(f.search)
        && (!f.productoId || item.productoId === Number(f.productoId))
        && (!f.almacenId || item.almacenId === Number(f.almacenId))
        && (!f.estado || this.nivel(item) === f.estado)
        && (f.stockMinimo == null || item.stock >= Number(f.stockMinimo))
        && (f.stockMaximo == null || item.stock <= Number(f.stockMaximo));
    };
    this.obs = this.dataSource.connect();
    this.gestion.cargar().subscribe((contexto) => {
      this.contexto = contexto;
      this.dataSource.data = contexto.existencias;
      this.ordenar(this.currentSort);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get nombreAlmacen(): string {
    return this.contexto?.almacenes.find((item) => item.id === Number(this.filtros['almacenId']))?.nombre || 'Almacén';
  }

  get currentStock(): string {
    return String(this.filtros['estado'] || '');
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

  setEstado(estado: string): void {
    this.filtros = { ...this.filtros, estado };
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
        key: 'estado', label: 'Nivel de existencia', icon: 'monitoring', type: 'select', emptyLabel: 'Todos los niveles',
        options: ['Normal', 'Bajo', 'Crítico', 'Agotado', 'Sin inicializar'].map((value) => ({ value, label: value })),
      },
      { key: 'stockMinimo', label: 'Existencia mínima', icon: 'south', type: 'number', defaultValue: null, min: 0, step: .01 },
      { key: 'stockMaximo', label: 'Existencia máxima', icon: 'north', type: 'number', defaultValue: null, min: 0, step: .01 },
    ];
    this.dialog.open(FiltrosInventarioDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { title: 'Filtrar existencias', filters: this.filtros, fields },
    }).afterClosed().subscribe((filters?: Record<string, ValorFiltroInventario>) => {
      if (!filters) return;
      this.filtros = filters;
      this.applyFilter();
    });
  }

  ordenar(orden: string): void {
    this.currentSort = orden;
    const datos = [...this.dataSource.data];
    if (orden === 'Menor existencia') datos.sort((a, b) => a.stock - b.stock);
    else if (orden === 'Mayor existencia') datos.sort((a, b) => b.stock - a.stock);
    else if (orden === 'Producto A-Z') datos.sort((a, b) => a.producto.localeCompare(b.producto) || a.almacen.localeCompare(b.almacen));
    else if (orden === 'Más recientes') datos.sort((a, b) => this.fechaMs(b.actualizacion) - this.fechaMs(a.actualizacion));
    else datos.sort((a, b) => this.fechaMs(a.actualizacion) - this.fechaMs(b.actualizacion));
    this.dataSource.data = datos;
    this.applyFilter();
  }

  nivel(item: ExistenciaInventario): string {
    if (!item.inicializada) return 'Sin inicializar';
    if (item.stock <= 0) return 'Agotado';
    if (item.stock <= item.critico) return 'Crítico';
    if (item.stock <= item.reorden) return 'Bajo';
    return 'Normal';
  }

  claseNivel(item: ExistenciaInventario): string {
    return this.nivel(item).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  nuevoAjuste(item: ExistenciaInventario): void {
    this.router.navigate(['/ajustes'], {
      queryParams: { nuevo: 1, producto: item.productoId, almacen: item.almacenId },
    });
  }

  verKardex(item: ExistenciaInventario): void {
    this.router.navigate(['/kardex'], {
      queryParams: { producto: item.productoId, almacen: item.almacenId },
    });
  }

  private fechaMs(valor: string): number {
    if (!valor || valor === '—') return 0;
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }
}
