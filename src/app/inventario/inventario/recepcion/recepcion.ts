import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { DatosDb } from '../../../shared/services/datos-db';
import { PersistenciaComprasTxt } from '../../../shared/services/persistencia-compras-txt';
import { forkJoin, map, Observable } from 'rxjs';
import { CatalogoCompras } from '../../../shared/services/catalogo-compras';
import { OrdenesCompraService } from '../../../compras/services/ordenes-compra.service';
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
  almacenId?: number;
  documento?: string;
  observaciones?: string;
  origenTxt?: boolean;
}

interface RecepcionCompraDb { id_recepcion: string; folio: string; id_orden_compra: string; id_almacen: string; id_responsable: string; fecha_recepcion: string; documento_proveedor: string; observaciones: string; }
interface RecepcionDetalleDb { id_recepcion: string; id_detalle_orden: string; cantidad_recibida: string; cantidad_rechazada: string; motivo_rechazo: string; }
interface OrdenCompraDb { id_orden_compra: string; folio: string; id_proveedor: string; }
interface OrdenDetalleDb { id_detalle_orden: string; id_producto: string; }
interface ProveedorDb { id_proveedor: string; nombre_comercial: string; razon_social: string; }
interface AlmacenDb { id_almacen: string; nombre_almacen: string; }
interface UsuarioDb { id_usuario: string; nombres: string; apellido_paterno: string; apellido_materno: string; }

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
  readonly dataSource = new MatTableDataSource<RecepcionInventario>([]);
  private readonly catalogoProductos = inject(CatalogoProductos);
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly autenticacion = inject(Autenticacion);
  private readonly catalogoCompras = inject(CatalogoCompras);
  private readonly ordenesCompra = inject(OrdenesCompraService);
  private readonly http = inject(HttpClient);
  private readonly db = inject(DatosDb);
  private readonly persistenciaTxt = inject(PersistenciaComprasTxt);
  private productosDb: ProductoCatalogo[] = [];
  busqueda = '';
  currentSort = 'Más recientes';
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
    this.cargarRecepcionesTxt().subscribe({
      next: ({ productos, recepciones }) => {
        this.productosDb = productos.filter(producto => producto.estado);
        const ordenesTxt = new Set(recepciones.map(recepcion => recepcion.orden));
        this.dataSource.data = [
          ...this.recepcionesDeOrdenes().filter(recepcion => !ordenesTxt.has(recepcion.orden)),
          ...recepciones,
        ];
        this.ordenar(this.currentSort);
      },
      error: () => this.snackBar.open('No fue posible cargar recepciones_compra.txt y sus relaciones', 'Cerrar', { duration: 4000 }),
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

  async actualizarEstado(item: RecepcionInventario, estado: EstadoRecepcion): Promise<void> {
    if (item.origenTxt) {
      this.snackBar.open('Las recepciones históricas del TXT son de solo lectura.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (estado === 'Recibida' && item.estado !== 'Recibida') {
      try {
        await this.aplicarEntradaInventario(item);
      } catch (error) {
        this.snackBar.open(
          error instanceof Error ? error.message : 'No fue posible actualizar el inventario.',
          'Cerrar',
          { duration: 5000 },
        );
        return;
      }
    }
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

  private recepcionesDeOrdenes(): RecepcionInventario[] {
    return this.ordenesCompra.ordenes()
      .filter(orden => orden.partidas?.length && orden.almacenId && orden.estado !== 'Cancelado')
      .map(orden => ({
        folio: `REC-${orden.folio}`,
        orden: orden.folio,
        proveedor: orden.proveedor,
        almacen: orden.almacen || `Almacén #${orden.almacenId}`,
        almacenId: orden.almacenId,
        fecha: orden.fechaEntrega || orden.fecha,
        productos: orden.partidas?.length || 0,
        unidades: orden.partidas?.reduce((total, partida) => total + partida.cantidad, 0) || 0,
        responsable: orden.solicitante,
        estado: orden.estado === 'Completado' ? 'Recibida' : 'Pendiente',
        detalles: orden.partidas?.map(partida => ({
          id: partida.productoId,
          sku: partida.sku,
          codigo: '',
          nombre: partida.nombre,
          unidad: '',
          cantidad: partida.cantidad,
        })) || [],
      }));
  }

  private async aplicarEntradaInventario(item: RecepcionInventario): Promise<void> {
    const almacenId = item.almacenId
      ?? this.catalogoCompras.almacenes().find(almacen => almacen.nombre === item.almacen)?.id;
    if (!almacenId) throw new Error(`No se encontró el almacén destino de ${item.folio}.`);
    if (!item.detalles?.length) {
      throw new Error(`${item.folio} no tiene productos detallados para actualizar el stock.`);
    }
    await this.persistenciaTxt.registrarRecepcion({
      folio: item.folio,
      orden: item.orden,
      proveedor: item.proveedor,
      almacenId,
      fecha: new Date().toISOString().slice(0, 10),
      documento: item.documento || '',
      observaciones: item.observaciones || `Recepción de ${item.orden}`,
      partidas: item.detalles.map(detalle => ({
        productoId: detalle.id,
        cantidad: detalle.cantidad,
      })),
    });
    this.catalogoCompras.recargar();
    const orden = this.ordenesCompra.ordenes().find(actual => actual.folio === item.orden);
    if (orden && orden.estado !== 'Completado') {
      this.ordenesCompra.actualizarEstado(
        orden.folio,
        'Completado',
        `Mercancía recibida mediante ${item.folio}.`,
      );
    }
  }

  private cargarRecepcionesTxt(): Observable<{
    productos: ProductoCatalogo[];
    recepciones: RecepcionInventario[];
  }> {
    return forkJoin({
      productos: this.catalogoProductos.cargar(),
      recepciones: this.leerCompras<RecepcionCompraDb>('recepciones_compra.txt'),
      detalles: this.leerCompras<RecepcionDetalleDb>('recepciones_compra_detalle.txt'),
      ordenes: this.leerCompras<OrdenCompraDb>('ordenes_compra.txt'),
      detallesOrden: this.leerCompras<OrdenDetalleDb>('ordenes_compra_detalle.txt'),
      proveedores: this.leerCompras<ProveedorDb>('proveedores.txt'),
      almacenes: this.db.leer<AlmacenDb>('almacenes.txt', true),
      usuarios: this.db.leer<UsuarioDb>('usuarios.txt', true),
    }).pipe(map(datos => {
      const ordenes = new Map(datos.ordenes.map(orden => [orden.id_orden_compra, orden]));
      const detallesOrden = new Map(datos.detallesOrden.map(detalle => [detalle.id_detalle_orden, detalle]));
      const proveedores = new Map(datos.proveedores.map(proveedor => [
        proveedor.id_proveedor,
        proveedor.nombre_comercial || proveedor.razon_social,
      ]));
      const almacenes = new Map(datos.almacenes.map(almacen => [almacen.id_almacen, almacen.nombre_almacen]));
      const usuarios = new Map(datos.usuarios.map(usuario => [
        usuario.id_usuario,
        [usuario.nombres, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' '),
      ]));
      const productos = new Map(datos.productos.map(producto => [producto.id, producto]));
      const recepciones = datos.recepciones.map(recepcion => {
        const orden = ordenes.get(recepcion.id_orden_compra);
        const detalles = datos.detalles.filter(detalle => detalle.id_recepcion === recepcion.id_recepcion);
        const tieneRechazos = detalles.some(detalle => Number(detalle.cantidad_rechazada) > 0);
        const productosRecepcion: ProductoRecepcion[] = detalles.map(detalle => {
          const detalleOrden = detallesOrden.get(detalle.id_detalle_orden);
          const productoId = Number(detalleOrden?.id_producto);
          const producto = productos.get(productoId);
          return {
            id: productoId,
            sku: producto?.sku || `Producto #${productoId}`,
            codigo: producto?.codigo || '',
            nombre: producto?.producto || `Producto #${productoId}`,
            unidad: producto?.medida || 'unidad',
            cantidad: Math.max(0, Number(detalle.cantidad_recibida) - Number(detalle.cantidad_rechazada)),
          };
        });
        return {
          folio: recepcion.folio,
          orden: orden?.folio || `Orden #${recepcion.id_orden_compra}`,
          proveedor: proveedores.get(orden?.id_proveedor || '') || 'Proveedor no disponible',
          almacen: almacenes.get(recepcion.id_almacen) || `Almacén #${recepcion.id_almacen}`,
          almacenId: Number(recepcion.id_almacen),
          fecha: recepcion.fecha_recepcion.slice(0, 10),
          productos: productosRecepcion.length,
          unidades: productosRecepcion.reduce((total, producto) => total + producto.cantidad, 0),
          responsable: usuarios.get(recepcion.id_responsable) || `Usuario #${recepcion.id_responsable}`,
          estado: tieneRechazos ? 'Con incidencias' : 'Recibida',
          detalles: productosRecepcion,
          documento: recepcion.documento_proveedor,
          observaciones: recepcion.observaciones,
          origenTxt: true,
        } satisfies RecepcionInventario;
      });
      return { productos: datos.productos, recepciones };
    }));
  }

  private leerCompras<T>(archivo: string): Observable<T[]> {
    return this.http.get(`/assets/db/compras_bd/${encodeURIComponent(archivo)}?v=${Date.now()}`, {
      responseType: 'text',
    }).pipe(map(texto => this.parsearTxt<T>(texto)));
  }

  private parsearTxt<T>(texto: string): T[] {
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const encabezado = lineas.shift();
    if (!encabezado?.includes('|')) return [];
    const columnas = encabezado.split('|');
    return lineas.filter(linea => linea.trim()).map(linea => {
      const valores = linea.split('|');
      return Object.fromEntries(columnas.map((columna, indice) => [columna, valores[indice] || ''])) as T;
    });
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
