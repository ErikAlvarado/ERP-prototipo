import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { CatalogoProductos, ProductoCatalogo } from '../../../shared/services/catalogo-productos';
import { PersistenciaLocal } from '../../../shared/services/persistencia-local';
import { Autenticacion } from '../../../shared/services/autenticacion';
import {
  CampoFiltroInventario,
  FiltrosInventarioDialog,
  ValorFiltroInventario,
} from '../filtros-inventario-dialog/filtros-inventario-dialog';

type EstadoRecepcion = 'Pendiente' | 'En revisión' | 'Recibida' | 'Con incidencias';

interface ProductoRecepcion {
  id: number;
  sku: string;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
}

interface RecepcionInventario {
  folio: string;
  orden: string;
  proveedor: string;
  almacen: string;
  fecha: string;
  productos: number;
  unidades: number;
  responsable: string;
  estado: EstadoRecepcion;
  detalles?: ProductoRecepcion[];
}

interface ProveedorRecepcion {
  nombre: string;
  estado: string;
}

interface DatosRecepcionDialog {
  productos: ProductoCatalogo[];
  proveedores: string[];
  responsable: string;
}

const RECEPCIONES: RecepcionInventario[] = [
  { folio: 'REC-0006', orden: 'OC-2026-0168', proveedor: 'Tecnología del Centro', almacen: 'Almacén Central', fecha: '2026-07-24', productos: 4, unidades: 38, responsable: 'María López', estado: 'Pendiente' },
  { folio: 'REC-0005', orden: 'OC-2026-0162', proveedor: 'Distribuidora Nova', almacen: 'Sucursal Norte', fecha: '2026-07-23', productos: 7, unidades: 52, responsable: 'Carlos Méndez', estado: 'En revisión' },
  { folio: 'REC-0004', orden: 'OC-2026-0157', proveedor: 'Accesorios MX', almacen: 'Almacén Central', fecha: '2026-07-22', productos: 3, unidades: 120, responsable: 'Ana Torres', estado: 'Recibida' },
  { folio: 'REC-0003', orden: 'OC-2026-0151', proveedor: 'Cómputo Empresarial', almacen: 'Sucursal Sur', fecha: '2026-07-21', productos: 5, unidades: 18, responsable: 'José Ramírez', estado: 'Con incidencias' },
  { folio: 'REC-0002', orden: 'OC-2026-0144', proveedor: 'Electrónica Nacional', almacen: 'Almacén Central', fecha: '2026-07-19', productos: 6, unidades: 44, responsable: 'María López', estado: 'Recibida' },
  { folio: 'REC-0001', orden: 'OC-2026-0139', proveedor: 'Soluciones de Oficina', almacen: 'Sucursal Norte', fecha: '2026-07-18', productos: 2, unidades: 75, responsable: 'Carlos Méndez', estado: 'Recibida' },
];

@Component({
  selector: 'app-recepcion',
  imports: [...SHARED_IMPORTS, DatePipe, MatMenuModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './recepcion.html',
  styleUrl: './recepcion.css',
})
export class Recepcion implements OnInit, AfterViewInit {
  readonly displayedColumns = ['folio', 'orden', 'proveedor', 'almacen', 'fecha', 'contenido', 'responsable', 'estado', 'acciones'];
  readonly dataSource = new MatTableDataSource<RecepcionInventario>(RECEPCIONES);
  private readonly catalogoProductos = inject(CatalogoProductos);
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly autenticacion = inject(Autenticacion);
  private productosDb: ProductoCatalogo[] = [];
  busqueda = '';
  currentSort = 'Más antiguos';
  filtros: Record<string, ValorFiltroInventario> = {
    estado: '',
    proveedor: '',
    almacen: '',
    responsable: '',
    fechaDesde: '',
    fechaHasta: '',
    unidadesMinimas: null,
    unidadesMaximas: null,
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.dataSource.filterPredicate = (item, raw) => {
      const filtro = JSON.parse(raw) as {
        busqueda: string;
        estado: string;
        proveedor: string;
        almacen: string;
        responsable: string;
        fechaDesde: string;
        fechaHasta: string;
        unidadesMinimas: number | null;
        unidadesMaximas: number | null;
      };
      const texto = `${item.folio} ${item.orden} ${item.proveedor} ${item.almacen} ${item.responsable}`.toLowerCase();
      return texto.includes(filtro.busqueda)
        && (!filtro.estado || item.estado === filtro.estado)
        && (!filtro.proveedor || item.proveedor === filtro.proveedor)
        && (!filtro.almacen || item.almacen === filtro.almacen)
        && (!filtro.responsable || item.responsable === filtro.responsable)
        && (!filtro.fechaDesde || item.fecha >= filtro.fechaDesde)
        && (!filtro.fechaHasta || item.fecha <= filtro.fechaHasta)
        && (filtro.unidadesMinimas == null || item.unidades >= Number(filtro.unidadesMinimas))
        && (filtro.unidadesMaximas == null || item.unidades <= Number(filtro.unidadesMaximas));
    };
  }

  ngOnInit(): void {
    this.ordenar(this.currentSort);
    this.catalogoProductos.cargar().subscribe({
      next: productos => this.productosDb = productos.filter(producto => producto.estado),
      error: () => this.snackBar.open('No fue posible cargar los productos de la base de datos', 'Cerrar', { duration: 4000 }),
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter(value => value !== '' && value !== null).length;
  }

  filtrar(): void {
    this.dataSource.filter = JSON.stringify({
      busqueda: this.busqueda.trim().toLowerCase(),
      ...this.filtros,
    });
    this.paginator?.firstPage();
  }

  abrirFiltros(): void {
    const opciones = (valores: string[]) => [...new Set(valores)]
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map(value => ({ value, label: value }));
    const fields: CampoFiltroInventario[] = [
      {
        key: 'estado', label: 'Estado', icon: 'flag', type: 'select', emptyLabel: 'Todos los estados',
        options: opciones(this.dataSource.data.map(item => item.estado)),
      },
      {
        key: 'proveedor', label: 'Proveedor', icon: 'local_shipping', type: 'select', emptyLabel: 'Todos los proveedores',
        options: opciones(this.dataSource.data.map(item => item.proveedor)),
      },
      {
        key: 'almacen', label: 'Almacén destino', icon: 'warehouse', type: 'select', emptyLabel: 'Todos los almacenes',
        options: opciones(this.dataSource.data.map(item => item.almacen)),
      },
      {
        key: 'responsable', label: 'Responsable', icon: 'person', type: 'select', emptyLabel: 'Todos los responsables',
        options: opciones(this.dataSource.data.map(item => item.responsable)),
      },
      { key: 'fechaDesde', label: 'Fecha desde', icon: 'calendar_today', type: 'date' },
      { key: 'fechaHasta', label: 'Fecha hasta', icon: 'event', type: 'date' },
      { key: 'unidadesMinimas', label: 'Unidades mínimas', icon: 'south', type: 'number', defaultValue: null, min: 0, step: 1 },
      { key: 'unidadesMaximas', label: 'Unidades máximas', icon: 'north', type: 'number', defaultValue: null, min: 0, step: 1 },
    ];
    this.dialog.open(FiltrosInventarioDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { title: 'Filtrar recepciones', filters: this.filtros, fields },
    }).afterClosed().subscribe((filters?: Record<string, ValorFiltroInventario>) => {
      if (!filters) return;
      this.filtros = filters;
      this.filtrar();
    });
  }

  ordenar(orden: string): void {
    this.currentSort = orden;
    const datos = [...this.dataSource.data];
    if (orden === 'Más recientes') {
      datos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio));
    } else if (orden === 'Folio') {
      datos.sort((a, b) => a.folio.localeCompare(b.folio));
    } else {
      datos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.folio.localeCompare(b.folio));
    }
    this.dataSource.data = datos;
    this.filtrar();
  }

  nuevaRecepcion(): void {
    if (!this.productosDb.length) {
      this.snackBar.open('El catálogo de productos todavía se está cargando', 'Cerrar', { duration: 3000 });
      return;
    }
    this.dialog.open(RecepcionDialog, {
      width: '960px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'custom-dialog',
      data: {
        productos: this.productosDb,
        proveedores: this.proveedoresActivos(),
        responsable: this.autenticacion.sesion()?.nombre || 'Usuario en sesión',
      } satisfies DatosRecepcionDialog,
    }).afterClosed().subscribe((recepcion?: Omit<RecepcionInventario, 'folio' | 'estado'>) => {
      if (!recepcion) return;
      const siguiente = String(this.dataSource.data.length + 1).padStart(4, '0');
      this.dataSource.data = [{ ...recepcion, folio: `REC-${siguiente}`, estado: 'Pendiente' }, ...this.dataSource.data];
      this.ordenar(this.currentSort);
      this.snackBar.open('Recepción registrada correctamente', 'Cerrar', { duration: 3500 });
    });
  }

  actualizarEstado(item: RecepcionInventario, estado: EstadoRecepcion): void {
    this.dataSource.data = this.dataSource.data.map(actual => actual.folio === item.folio ? { ...actual, estado } : actual);
    this.filtrar();
    this.snackBar.open(`${item.folio} cambió a ${estado}`, 'Cerrar', { duration: 3000 });
  }

  claseEstado(estado: EstadoRecepcion): string {
    return estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }

  private proveedoresActivos(): string[] {
    const guardados = this.persistencia.leer<ProveedorRecepcion[]>('erp.proveedores', [])
      .filter(proveedor => proveedor.estado !== 'Inactivo')
      .map(proveedor => proveedor.nombre);
    const base = [
      'TechnoInsumos SA de CV', 'Grupo Distribuidora Nacional', 'Materiales del Norte SA',
      'Electronica Empresarial MX', 'Soluciones Logisticas Omega', 'Papeleria Martinez & Asoc.',
    ];
    return [...new Set([...guardados, ...base])].sort((a, b) => a.localeCompare(b, 'es'));
  }
}

@Component({
  selector: 'app-recepcion-dialog',
  imports: [...SHARED_IMPORTS, MatSnackBarModule],
  templateUrl: './recepcion-dialog.html',
  styleUrl: './recepcion-dialog.css',
})
export class RecepcionDialog {
  private readonly data = inject<DatosRecepcionDialog>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);
  readonly productos = this.data.productos;
  readonly proveedores = this.data.proveedores;
  readonly almacenes = ['Almacén Central', 'Sucursal Norte', 'Sucursal Sur'];
  readonly responsable = this.data.responsable;
  readonly detalles: ProductoRecepcion[] = [];
  readonly form;
  codigoManual = '';
  cantidadAgregar = 1;

  constructor(fb: FormBuilder, private dialogRef: MatDialogRef<RecepcionDialog>) {
    this.form = fb.nonNullable.group({
      orden: ['', Validators.required],
      proveedor: ['', Validators.required],
      almacen: ['', Validators.required],
      fecha: [new Date().toISOString().slice(0, 10), Validators.required],
    });
  }

  agregarPorCodigo(): void {
    const codigo = this.codigoManual.trim().toLocaleLowerCase();
    if (!codigo) return;
    const producto = this.productos.find(item => item.sku.toLocaleLowerCase() === codigo || item.codigo.toLocaleLowerCase() === codigo);
    if (!producto) {
      this.snackBar.open('No se encontró un producto con ese SKU o código de barras', 'Cerrar', { duration: 3500 });
      return;
    }
    this.agregarProducto(producto);
    this.codigoManual = '';
  }

  get productosSugeridos(): ProductoCatalogo[] {
    const termino = this.codigoManual.trim().toLocaleLowerCase();
    if (!termino) return this.productos.slice(0, 20);
    return this.productos
      .filter(item => `${item.sku} ${item.codigo} ${item.producto}`.toLocaleLowerCase().includes(termino))
      .slice(0, 20);
  }

  seleccionarProducto(codigo: string): void {
    const producto = this.productos.find(item => item.sku === codigo);
    if (producto) this.agregarProducto(producto);
    this.codigoManual = '';
  }

  cambiarCantidad(id: number, cantidad: number): void {
    const detalle = this.detalles.find(item => item.id === id);
    if (detalle) detalle.cantidad = Math.max(1, Number(cantidad) || 1);
  }

  quitarProducto(id: number): void {
    const indice = this.detalles.findIndex(item => item.id === id);
    if (indice >= 0) this.detalles.splice(indice, 1);
  }

  get totalUnidades(): number {
    return this.detalles.reduce((total, item) => total + item.cantidad, 0);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.detalles.length) {
      this.snackBar.open('Agrega al menos un producto a la recepción', 'Cerrar', { duration: 3500 });
      return;
    }
    this.dialogRef.close({
      ...this.form.getRawValue(),
      responsable: this.responsable,
      productos: this.detalles.length,
      unidades: this.totalUnidades,
      detalles: this.detalles.map(item => ({ ...item })),
    });
  }

  private agregarProducto(producto: ProductoCatalogo): void {
    const cantidad = Math.max(1, Number(this.cantidadAgregar) || 1);
    const existente = this.detalles.find(item => item.id === producto.id);
    if (existente) existente.cantidad += cantidad;
    else this.detalles.push({
      id: producto.id, sku: producto.sku, codigo: producto.codigo,
      nombre: producto.producto, unidad: producto.medida, cantidad,
    });
    this.cantidadAgregar = 1;
  }
}
