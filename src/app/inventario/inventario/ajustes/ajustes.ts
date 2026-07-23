import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  AjusteFormulario,
  AjusteInventario,
  ContextoInventario,
  GestionInventario,
} from '../gestion-inventario';
import { AjustesDialog } from './dialogs/ajustes-dialog/ajustes-dialog';
import {
  CampoFiltroInventario,
  FiltrosInventarioDialog,
  ValorFiltroInventario,
} from '../filtros-inventario-dialog/filtros-inventario-dialog';

@Component({
  selector: 'app-ajustes',
  imports: [...SHARED_IMPORTS, AsyncPipe, DatePipe, MatPaginatorModule, MatMenuModule],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes implements OnInit, AfterViewInit {
  displayedColumns = ['fecha', 'producto', 'almacen', 'ajuste', 'existencia', 'motivo', 'usuario', 'acciones'];
  dataSource = new MatTableDataSource<AjusteInventario>([]);
  obs!: Observable<AjusteInventario[]>;
  contexto?: ContextoInventario;
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtros: Record<string, ValorFiltroInventario> = {
    productoId: '',
    almacenId: '',
    tipo: '',
    usuarioId: '',
    fechaDesde: '',
    fechaHasta: '',
    ajusteMinimo: null,
    ajusteMaximo: null,
  };
  private presetProcesado = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private gestion: GestionInventario,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (item, filtro) => {
      const f = JSON.parse(filtro) as {
        search: string;
        productoId: string;
        almacenId: string;
        tipo: string;
        usuarioId: string;
        fechaDesde: string;
        fechaHasta: string;
        ajusteMinimo: number | null;
        ajusteMaximo: number | null;
      };
      const coincideTexto = `${item.id} ${item.sku} ${item.producto} ${item.almacen} ${item.motivo} ${item.usuario}`
        .toLowerCase().includes(f.search);
      const coincideTipo = !f.tipo || (f.tipo === 'Entrada' ? item.ajuste > 0 : item.ajuste < 0);
      return coincideTexto
        && (!f.productoId || item.productoId === Number(f.productoId))
        && (!f.almacenId || item.almacenId === Number(f.almacenId))
        && coincideTipo
        && (!f.usuarioId || item.usuarioId === Number(f.usuarioId))
        && (!f.fechaDesde || item.fecha.slice(0, 10) >= f.fechaDesde)
        && (!f.fechaHasta || item.fecha.slice(0, 10) <= f.fechaHasta)
        && (f.ajusteMinimo == null || item.ajuste >= Number(f.ajusteMinimo))
        && (f.ajusteMaximo == null || item.ajuste <= Number(f.ajusteMaximo));
    };
    this.obs = this.dataSource.connect();
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get nombreAlmacen(): string {
    return this.contexto?.almacenes.find((item) => item.id === Number(this.filtros['almacenId']))?.nombre || 'Almacén';
  }

  get currentType(): string {
    return String(this.filtros['tipo'] || '');
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

  setTipo(tipo: string): void {
    this.filtros = { ...this.filtros, tipo };
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
        key: 'tipo', label: 'Tipo de ajuste', icon: 'swap_vert', type: 'select', emptyLabel: 'Entradas y salidas',
        options: [{ value: 'Entrada', label: 'Entrada' }, { value: 'Salida', label: 'Salida' }],
      },
      {
        key: 'usuarioId', label: 'Responsable', icon: 'person', type: 'select', emptyLabel: 'Todos los responsables',
        options: this.contexto.usuarios.map((item) => ({ value: String(item.id), label: item.nombre })),
      },
      { key: 'fechaDesde', label: 'Fecha desde', icon: 'calendar_today', type: 'date' },
      { key: 'fechaHasta', label: 'Fecha hasta', icon: 'event', type: 'date' },
      { key: 'ajusteMinimo', label: 'Ajuste mínimo', icon: 'remove', type: 'number', defaultValue: null, step: .01 },
      { key: 'ajusteMaximo', label: 'Ajuste máximo', icon: 'add', type: 'number', defaultValue: null, step: .01 },
    ];
    this.dialog.open(FiltrosInventarioDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { title: 'Filtrar ajustes', filters: this.filtros, fields },
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
    else if (orden === 'Más recientes') {
      datos.sort((a, b) => this.fechaMs(b.fecha) - this.fechaMs(a.fecha) || this.numeroId(b.id) - this.numeroId(a.id));
    } else {
      datos.sort((a, b) => this.fechaMs(a.fecha) - this.fechaMs(b.fecha) || this.numeroId(a.id) - this.numeroId(b.id));
    }
    this.dataSource.data = datos;
    this.applyFilter();
  }

  abrirAgregar(productoId?: number, almacenId?: number): void {
    if (!this.contexto) return;
    this.dialog.open(AjustesDialog, {
      width: '720px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: {
        mode: 'add',
        productos: this.contexto.productos,
        almacenes: this.contexto.almacenes,
        usuarios: this.contexto.usuarios,
        existencias: this.contexto.existencias,
        productoId,
        almacenId,
      },
    }).afterClosed().subscribe((resultado?: AjusteFormulario) => {
      if (!resultado || !this.contexto) return;
      const producto = this.contexto.productos.find((item) => item.id === Number(resultado.productoId));
      const almacen = this.contexto.almacenes.find((item) => item.id === Number(resultado.almacenId));
      this.dialog.open(ConfirmDialog, {
        width: '420px',
        data: {
          title: 'Aplicar ajuste',
          message: `Se aplicará un ajuste de ${resultado.ajuste > 0 ? '+' : ''}${resultado.ajuste} a "${producto?.nombre}" en "${almacen?.nombre}". Esta operación quedará registrada en Kardex.`,
          confirmText: 'Aplicar ajuste',
          cancelText: 'Cancelar',
        },
      }).afterClosed().subscribe((confirmado) => {
        if (!confirmado || !this.contexto) return;
        this.gestion.crearAjuste(resultado, this.contexto);
        this.cargar();
      });
    });
  }

  verDetalle(ajuste: AjusteInventario): void {
    if (!this.contexto) return;
    this.dialog.open(AjustesDialog, {
      width: '720px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: {
        mode: 'view',
        ajuste,
        productos: this.contexto.productos,
        almacenes: this.contexto.almacenes,
        usuarios: this.contexto.usuarios,
        existencias: this.contexto.existencias,
      },
    });
  }

  private cargar(): void {
    this.gestion.cargar().subscribe((contexto) => {
      this.contexto = contexto;
      this.dataSource.data = contexto.ajustes;
      this.applyFilter();
      if (!this.presetProcesado && this.route.snapshot.queryParamMap.get('nuevo') === '1') {
        this.presetProcesado = true;
        this.abrirAgregar(
          Number(this.route.snapshot.queryParamMap.get('producto')) || undefined,
          Number(this.route.snapshot.queryParamMap.get('almacen')) || undefined,
        );
      }
    });
  }

  private numeroId(id: string): number {
    const numeros = id.match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : Number.MAX_SAFE_INTEGER;
  }

  private fechaMs(valor: string): number {
    if (!valor || valor === '—') return 0;
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }
}
