import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
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
  imports: [
    ...SHARED_IMPORTS,
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatPaginatorModule,
    MatMenuModule,
    MatSnackBarModule,
  ],
  templateUrl: './transferencias.html',
  styleUrl: './transferencias.css',
})
export class Transferencias implements OnInit, AfterViewInit {
  displayedColumns = [
    'folio',
    'partidas',
    'origen',
    'destino',
    'fechaSolicitud',
    'fechaAutorizacion',
    'fechaRecepcion',
    'responsables',
    'estado',
    'observaciones',
    'acciones',
  ];
  dataSource = new MatTableDataSource<TransferenciaInventario>([]);
  obs!: Observable<TransferenciaInventario[]>;
  contexto?: ContextoInventario;
  currentSearch = '';
  currentSort = 'Más antiguas';
  filtros: Record<string, ValorFiltroInventario> = {
    productoId: '',
    almacenId: '',
    origenId: '',
    destinoId: '',
    estado: '',
    solicitanteId: '',
    autorizadorId: '',
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
        solicitanteId: string;
        autorizadorId: string;
        fechaDesde: string;
        fechaHasta: string;
        cantidadMinima: number | null;
        cantidadMaxima: number | null;
      };
      const textoPartidas = item.partidas
        .map((partida) => `${partida.sku} ${partida.producto}`)
        .join(' ');
      const cantidadesCoinciden = item.partidas.some((partida) =>
        (f.cantidadMinima == null || partida.cantidadSolicitada >= Number(f.cantidadMinima))
        && (f.cantidadMaxima == null || partida.cantidadSolicitada <= Number(f.cantidadMaxima)));
      return `${item.id} ${item.folio} ${textoPartidas} ${item.origen} ${item.destino} ${item.solicitante} ${item.autorizador} ${item.observaciones}`
        .toLowerCase().includes(f.search)
        && (!f.productoId || item.partidas.some((partida) => partida.productoId === Number(f.productoId)))
        && (!f.almacenId || item.origenId === Number(f.almacenId) || item.destinoId === Number(f.almacenId))
        && (!f.origenId || item.origenId === Number(f.origenId))
        && (!f.destinoId || item.destinoId === Number(f.destinoId))
        && (!f.estado || item.estado === f.estado)
        && (!f.solicitanteId || item.solicitanteId === Number(f.solicitanteId))
        && (!f.autorizadorId || item.autorizadorId === Number(f.autorizadorId))
        && (!f.fechaDesde || item.fechaSolicitud >= f.fechaDesde)
        && (!f.fechaHasta || item.fechaSolicitud <= f.fechaHasta)
        && cantidadesCoinciden;
    };
    this.obs = this.dataSource.connect();
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get nombreAlmacen(): string {
    return this.contexto?.almacenes.find(
      (item) => item.id === Number(this.filtros['almacenId']),
    )?.nombre || 'Almacén';
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
    const almacenes = this.contexto.almacenes.map((item) => ({
      value: String(item.id),
      label: item.nombre,
    }));
    const usuarios = this.contexto.usuarios.map((item) => ({
      value: String(item.id),
      label: item.nombre,
    }));
    const fields: CampoFiltroInventario[] = [
      {
        key: 'productoId',
        label: 'Producto',
        icon: 'inventory_2',
        type: 'select',
        emptyLabel: 'Todos los productos',
        options: this.contexto.productos.map((item) => ({
          value: String(item.id),
          label: `${item.sku} · ${item.nombre}`,
        })),
      },
      {
        key: 'almacenId',
        label: 'Almacén relacionado',
        icon: 'warehouse',
        type: 'select',
        emptyLabel: 'Cualquier almacén',
        options: almacenes,
      },
      {
        key: 'origenId',
        label: 'Almacén origen',
        icon: 'outbox',
        type: 'select',
        emptyLabel: 'Cualquier origen',
        options: almacenes,
      },
      {
        key: 'destinoId',
        label: 'Almacén destino',
        icon: 'move_to_inbox',
        type: 'select',
        emptyLabel: 'Cualquier destino',
        options: almacenes,
      },
      {
        key: 'estado',
        label: 'Estado',
        icon: 'flag',
        type: 'select',
        emptyLabel: 'Todos los estados',
        options: this.estados.map((value) => ({ value, label: value })),
      },
      {
        key: 'solicitanteId',
        label: 'Solicitante',
        icon: 'person',
        type: 'select',
        emptyLabel: 'Todos los solicitantes',
        options: usuarios,
      },
      {
        key: 'autorizadorId',
        label: 'Autorizador',
        icon: 'verified_user',
        type: 'select',
        emptyLabel: 'Todos los autorizadores',
        options: usuarios,
      },
      { key: 'fechaDesde', label: 'Solicitud desde', icon: 'calendar_today', type: 'date' },
      { key: 'fechaHasta', label: 'Solicitud hasta', icon: 'event', type: 'date' },
      {
        key: 'cantidadMinima',
        label: 'Cantidad solicitada mínima',
        icon: 'south',
        type: 'number',
        defaultValue: null,
        min: 0,
        step: .01,
      },
      {
        key: 'cantidadMaxima',
        label: 'Cantidad solicitada máxima',
        icon: 'north',
        type: 'number',
        defaultValue: null,
        min: 0,
        step: .01,
      },
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
    if (orden === 'Folio') datos.sort((a, b) => a.folio.localeCompare(b.folio));
    else if (orden === 'Más recientes') {
      datos.sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud) || b.id - a.id);
    } else {
      datos.sort((a, b) => a.fechaSolicitud.localeCompare(b.fechaSolicitud) || a.id - b.id);
    }
    this.dataSource.data = datos;
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
    if (!this.contexto || this.gestion.esEstadoFinalTransferencia(transferencia.estado)) return;
    const insuficiente = transferencia.partidas.find((partida) => {
      const cantidad = partida.cantidadEnviada > 0
        ? partida.cantidadEnviada
        : partida.cantidadSolicitada;
      const stock = this.contexto!.existencias.find(
        (item) => item.productoId === partida.productoId
          && item.almacenId === transferencia.origenId,
      )?.stock ?? 0;
      return stock < cantidad;
    });
    if (insuficiente) {
      const stock = this.contexto.existencias.find(
        (item) => item.productoId === insuficiente.productoId
          && item.almacenId === transferencia.origenId,
      )?.stock ?? 0;
      this.snackBar.open(
        `No hay stock suficiente de ${insuficiente.producto} en ${transferencia.origen}. Disponible: ${stock} ${insuficiente.unidad}.`,
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }
    this.confirmar(
      'Recibir transferencia',
      `Se moverán las ${transferencia.partidas.length} partidas de "${transferencia.origen}" a "${transferencia.destino}" y quedarán registradas en Kardex.`,
      'Completar recepción',
      () => {
        if (!this.contexto) return;
        try {
          this.gestion.cambiarEstadoTransferencia(transferencia, 'Recibida', this.contexto);
          this.cargar();
        } catch (error) {
          this.mostrarError(error);
        }
      },
    );
  }

  cancelar(transferencia: TransferenciaInventario): void {
    if (!this.contexto || this.gestion.esEstadoFinalTransferencia(transferencia.estado)) return;
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
    const estado = this.normalizar(transferencia.estado);
    return estado === 'borrador' || estado === 'pendiente';
  }

  puedeRecibirse(transferencia: TransferenciaInventario): boolean {
    return !this.gestion.esEstadoFinalTransferencia(transferencia.estado);
  }

  claseEstado(estado: string): string {
    return this.normalizar(estado).replace(/\s+/g, '-');
  }

  private abrirDialogo(
    mode: 'add' | 'edit' | 'view',
    transferencia?: TransferenciaInventario,
  ): void {
    if (!this.contexto) return;
    this.dialog.open(TransferenciasDialog, {
      width: '900px',
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
        transferencias: this.contexto.transferencias,
      },
    }).afterClosed().subscribe((resultado?: TransferenciaFormulario) => {
      if (!resultado || mode === 'view' || !this.contexto) return;
      try {
        this.gestion.guardarTransferencia(resultado, this.contexto, transferencia);
        this.cargar();
      } catch (error) {
        this.mostrarError(error);
      }
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
    this.gestion.cargar().subscribe({
      next: (contexto) => {
        this.contexto = contexto;
        this.dataSource.data = contexto.transferencias;
        this.ordenar(this.currentSort);
      },
      error: () => this.snackBar.open(
        'No fue posible leer los datos del inventario.',
        'Cerrar',
        { duration: 6000 },
      ),
    });
  }

  private mostrarError(error: unknown): void {
    const mensaje = error instanceof Error
      ? error.message
      : 'No fue posible completar la operación de inventario.';
    this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
