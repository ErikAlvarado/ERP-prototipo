import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  ContextoInventario,
  GestionInventario,
  TransferenciaFormulario,
  TransferenciaInventario,
} from '../gestion-inventario';
import { TransferenciasDialog } from './dialogs/transferencias-dialog/transferencias-dialog';
import {
  CampoFiltroInventario,
  FiltrosInventarioDialog,
  ValorFiltroInventario,
} from '../filtros-inventario-dialog/filtros-inventario-dialog';

@Component({
  selector: 'app-transferencias',
  imports: [...SHARED_IMPORTS, AsyncPipe, DatePipe, MatPaginatorModule, MatMenuModule, MatSnackBarModule],
  templateUrl: './transferencias.html',
  styleUrl: './transferencias.css',
})
export class Transferencias implements OnInit, AfterViewInit {
  displayedColumns = ['folio', 'producto', 'origen', 'destino', 'cantidad', 'fecha', 'usuario', 'estado', 'observaciones', 'acciones'];
  dataSource = new MatTableDataSource<TransferenciaInventario>([]);
  obs!: Observable<TransferenciaInventario[]>;
  contexto?: ContextoInventario;
  currentSearch = '';
  currentSort = 'Recientes';
  filtros: Record<string, ValorFiltroInventario> = {
    productoId: '',
    almacenId: '',
    origenId: '',
    destinoId: '',
    estado: '',
    usuarioId: '',
    fechaDesde: '',
    fechaHasta: '',
    cantidadMinima: null,
    cantidadMaxima: null,
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private gestion: GestionInventario,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (item, filtro) => {
      const f = JSON.parse(filtro) as {
        search: string;
        productoId: string;
        almacenId: string;
        origenId: string;
        destinoId: string;
        estado: string;
        usuarioId: string;
        fechaDesde: string;
        fechaHasta: string;
        cantidadMinima: number | null;
        cantidadMaxima: number | null;
      };
      return `${item.id} ${item.folio} ${item.sku} ${item.producto} ${item.origen} ${item.destino} ${item.usuario} ${item.observaciones}`
        .toLowerCase().includes(f.search)
        && (!f.productoId || item.productoId === Number(f.productoId))
        && (!f.almacenId || item.origenId === Number(f.almacenId) || item.destinoId === Number(f.almacenId))
        && (!f.origenId || item.origenId === Number(f.origenId))
        && (!f.destinoId || item.destinoId === Number(f.destinoId))
        && (!f.estado || item.estado === f.estado)
        && (!f.usuarioId || item.usuarioId === Number(f.usuarioId))
        && (!f.fechaDesde || item.fecha.slice(0, 10) >= f.fechaDesde)
        && (!f.fechaHasta || item.fecha.slice(0, 10) <= f.fechaHasta)
        && (f.cantidadMinima == null || item.cantidad >= Number(f.cantidadMinima))
        && (f.cantidadMaxima == null || item.cantidad <= Number(f.cantidadMaxima));
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

  get currentStatus(): string {
    return String(this.filtros['estado'] || '');
  }

  get estados(): string[] {
    const catalogo = this.contexto?.estadosTransferencia ?? [];
    return [...new Set([...catalogo, ...this.dataSource.data.map((item) => item.estado)])];
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

  setEstado(estado: string): void {
    this.filtros = { ...this.filtros, estado };
    this.applyFilter();
  }

  setAlmacen(id: number | null): void {
    this.filtros = { ...this.filtros, almacenId: id == null ? '' : String(id) };
    this.applyFilter();
  }

  abrirFiltros(): void {
    if (!this.contexto) return;
    const almacenes = this.contexto.almacenes.map((item) => ({ value: String(item.id), label: item.nombre }));
    const fields: CampoFiltroInventario[] = [
      {
        key: 'productoId', label: 'Producto', icon: 'inventory_2', type: 'select', emptyLabel: 'Todos los productos',
        options: this.contexto.productos.map((item) => ({ value: String(item.id), label: `${item.sku} · ${item.nombre}` })),
      },
      { key: 'almacenId', label: 'Almacén relacionado', icon: 'warehouse', type: 'select', emptyLabel: 'Cualquier almacén', options: almacenes },
      { key: 'origenId', label: 'Almacén origen', icon: 'outbox', type: 'select', emptyLabel: 'Cualquier origen', options: almacenes },
      { key: 'destinoId', label: 'Almacén destino', icon: 'move_to_inbox', type: 'select', emptyLabel: 'Cualquier destino', options: almacenes },
      {
        key: 'estado', label: 'Estado', icon: 'flag', type: 'select', emptyLabel: 'Todos los estados',
        options: this.estados.map((value) => ({ value, label: value })),
      },
      {
        key: 'usuarioId', label: 'Responsable', icon: 'person', type: 'select', emptyLabel: 'Todos los responsables',
        options: this.contexto.usuarios.map((item) => ({ value: String(item.id), label: item.nombre })),
      },
      { key: 'fechaDesde', label: 'Fecha desde', icon: 'calendar_today', type: 'date' },
      { key: 'fechaHasta', label: 'Fecha hasta', icon: 'event', type: 'date' },
      { key: 'cantidadMinima', label: 'Cantidad mínima', icon: 'south', type: 'number', defaultValue: null, min: 0, step: 1 },
      { key: 'cantidadMaxima', label: 'Cantidad máxima', icon: 'north', type: 'number', defaultValue: null, min: 0, step: 1 },
    ];
    this.dialog.open(FiltrosInventarioDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { title: 'Filtrar transferencias', filters: this.filtros, fields },
    }).afterClosed().subscribe((filters?: Record<string, ValorFiltroInventario>) => {
      if (!filters) return;
      this.filtros = filters;
      this.applyFilter();
    });
  }

  ordenar(orden: string): void {
    this.currentSort = orden;
    const datos = [...this.dataSource.data];
    this.dataSource.data = orden === 'Folio'
      ? datos.sort((a, b) => a.folio.localeCompare(b.folio))
      : datos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    this.applyFilter();
  }

  abrirAgregar(): void {
    this.abrirDialogo('add');
  }

  ver(transferencia: TransferenciaInventario): void {
    this.abrirDialogo('view', transferencia);
  }

  editar(transferencia: TransferenciaInventario): void {
    if (!this.esEditable(transferencia)) return;
    this.abrirDialogo('edit', transferencia);
  }

  recibir(transferencia: TransferenciaInventario): void {
    if (!this.contexto || transferencia.estado === 'Recibida' || transferencia.estado === 'Cancelada') return;
    const stockOrigen = this.contexto.existencias.find(
      (item) => item.productoId === transferencia.productoId && item.almacenId === transferencia.origenId,
    )?.stock ?? 0;
    if (stockOrigen < transferencia.cantidad) {
      this.snackBar.open(`No hay stock suficiente en ${transferencia.origen}. Disponible: ${stockOrigen}.`, 'Cerrar', { duration: 5000 });
      return;
    }
    this.confirmar(
      'Recibir transferencia',
      `Se descontarán ${transferencia.cantidad} unidades de "${transferencia.origen}" y se agregarán a "${transferencia.destino}".`,
      'Marcar recibida',
      () => {
        if (!this.contexto) return;
        this.gestion.cambiarEstadoTransferencia(transferencia, 'Recibida', this.contexto);
        this.cargar();
      },
    );
  }

  cancelar(transferencia: TransferenciaInventario): void {
    if (!this.contexto || transferencia.estado === 'Recibida' || transferencia.estado === 'Cancelada') return;
    this.confirmar(
      'Cancelar transferencia',
      `¿Deseas cancelar la transferencia ${transferencia.folio}? No se modificarán las existencias.`,
      'Cancelar transferencia',
      () => {
        if (!this.contexto) return;
        this.gestion.cambiarEstadoTransferencia(transferencia, 'Cancelada', this.contexto);
        this.cargar();
      },
    );
  }

  eliminar(transferencia: TransferenciaInventario): void {
    if (!this.esEditable(transferencia)) return;
    this.confirmar(
      'Eliminar transferencia',
      `¿Deseas eliminar definitivamente la transferencia ${transferencia.folio}?`,
      'Eliminar',
      () => {
        this.gestion.eliminarTransferencia(transferencia.id);
        this.cargar();
      },
    );
  }

  esEditable(transferencia: TransferenciaInventario): boolean {
    return transferencia.estado === 'Borrador' || transferencia.estado === 'Pendiente';
  }

  claseEstado(estado: string): string {
    return estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

  private abrirDialogo(mode: 'add' | 'edit' | 'view', transferencia?: TransferenciaInventario): void {
    if (!this.contexto) return;
    this.dialog.open(TransferenciasDialog, {
      width: '740px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: {
        mode,
        transferencia,
        productos: this.contexto.productos,
        almacenes: this.contexto.almacenes,
        usuarios: this.contexto.usuarios,
        estados: this.contexto.estadosTransferencia,
        existencias: this.contexto.existencias,
      },
    }).afterClosed().subscribe((resultado?: TransferenciaFormulario) => {
      if (!resultado || mode === 'view' || !this.contexto) return;
      this.gestion.guardarTransferencia(resultado, this.contexto, transferencia);
      this.cargar();
    });
  }

  private confirmar(titulo: string, mensaje: string, texto: string, accion: () => void): void {
    this.dialog.open(ConfirmDialog, {
      width: '430px',
      data: { title: titulo, message: mensaje, confirmText: texto, cancelText: 'Volver' },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado) accion();
    });
  }

  private cargar(): void {
    this.gestion.cargar().subscribe((contexto) => {
      this.contexto = contexto;
      this.dataSource.data = contexto.transferencias;
      this.applyFilter();
    });
  }
}
