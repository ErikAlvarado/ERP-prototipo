import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { CatalogoProductos, ProductoCatalogo } from '../../../shared/services/catalogo-productos';
import { Autenticacion } from '../../../shared/services/autenticacion';
import { DatosDb } from '../../../shared/services/datos-db';
import { PersistenciaComprasTxt } from '../../../shared/services/persistencia-compras-txt';
import {
  AnaquelCatalogo,
  AnaquelesCatalogo,
} from '../../product_catalog/anaqueles/anaqueles-catalogo';
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

interface DatosRecepcionDialog {
  productos: ProductoCatalogo[];
  recepcion: RecepcionInventario;
  anaqueles: AnaquelCatalogo[];
  responsable: string;
}

interface ResultadoRecepcionEscaneada {
  detalles: ProductoRecepcion[];
  documento: string;
  observaciones: string;
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
  private readonly autenticacion = inject(Autenticacion);
  private readonly catalogoCompras = inject(CatalogoCompras);
  private readonly ordenesCompra = inject(OrdenesCompraService);
  private readonly http = inject(HttpClient);
  private readonly db = inject(DatosDb);
  private readonly persistenciaTxt = inject(PersistenciaComprasTxt);
  private readonly catalogoAnaqueles = inject(AnaquelesCatalogo);
  private productosDb: ProductoCatalogo[] = [];
  private anaquelesDb: AnaquelCatalogo[] = [];
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
    void this.inicializar();
  }

  private async inicializar(): Promise<void> {
    try {
      await this.ordenesCompra.recargar();
    } catch {
      this.snackBar.open('No fue posible cargar las órdenes desde compras_bd. Verifica que el proyecto se inició con npm start.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.cargarRecepcionesTxt().subscribe({
      next: ({ productos, recepciones, anaqueles }) => {
        this.productosDb = productos.filter(producto => producto.estado);
        this.anaquelesDb = anaqueles.filter(anaquel => anaquel.estado);
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

  recepcionar(item: RecepcionInventario): void {
    this.dialog.open(RecepcionDialog, {
      width: '1080px',
      maxWidth: '98vw',
      maxHeight: '96vh',
      panelClass: 'custom-dialog',
      data: {
        productos: this.productosDb,
        recepcion: item,
        anaqueles: this.anaquelesDb,
        responsable: this.autenticacion.sesion()?.nombre || 'Usuario en sesión',
      } satisfies DatosRecepcionDialog,
    }).afterClosed().subscribe((resultado?: ResultadoRecepcionEscaneada) => {
      if (!resultado) return;
      void this.actualizarEstado({
        ...item,
        detalles: resultado.detalles,
        productos: resultado.detalles.length,
        unidades: resultado.detalles.reduce((total, detalle) => total + detalle.cantidad, 0),
        documento: resultado.documento,
        observaciones: resultado.observaciones,
      }, 'Recibida');
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

  private recepcionesDeOrdenes(): RecepcionInventario[] {
    return this.ordenesCompra.ordenes()
      .filter(orden => orden.partidas?.length
        && orden.almacenId
        && (orden.estado === 'Activo' || orden.estado === 'En transito'))
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
      responsableId: Number(this.autenticacion.sesion()?.id) || undefined,
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
      await this.ordenesCompra.actualizarEstado(
        orden.folio,
        'Completado',
        `Mercancía recibida mediante ${item.folio}.`,
      );
    }
  }

  private cargarRecepcionesTxt(): Observable<{
    productos: ProductoCatalogo[];
    recepciones: RecepcionInventario[];
    anaqueles: AnaquelCatalogo[];
  }> {
    return forkJoin({
      productos: this.catalogoProductos.cargar(),
      anaqueles: this.catalogoAnaqueles.cargar(),
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
      return { productos: datos.productos, recepciones, anaqueles: datos.anaqueles };
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

interface PartidaEscaneada extends ProductoRecepcion {
  esperada: number;
  recibida: number;
  ubicacionActual: string;
  anaquelesSugeridos: string[];
  inventarioConfigurado: boolean;
}

interface DetectorCodigo {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

type ConstructorDetectorCodigo = new (opciones?: { formats?: string[] }) => DetectorCodigo;

@Component({
  selector: 'app-recepcion-dialog',
  imports: [...SHARED_IMPORTS, MatSnackBarModule],
  templateUrl: './recepcion-dialog.html',
  styleUrl: './recepcion-dialog.css',
})
export class RecepcionDialog implements OnDestroy {
  private readonly data = inject<DatosRecepcionDialog>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);
  private flujoCamara = 0;
  private procesandoFotograma = false;
  private detector?: DetectorCodigo;
  private ultimoCodigo = '';
  private ultimoEscaneo = 0;

  @ViewChild('camera') camera?: ElementRef<HTMLVideoElement>;

  readonly recepcion = this.data.recepcion;
  readonly responsable = this.data.responsable;
  readonly form;
  readonly partidas: PartidaEscaneada[];
  codigoManual = '';
  camaraActiva = false;
  errorCamara = '';
  mensajeEscaneo = 'Escanea el código de la caja, factura o remisión.';

  constructor(fb: FormBuilder, private dialogRef: MatDialogRef<RecepcionDialog>) {
    this.form = fb.nonNullable.group({
      documento: [''],
      observaciones: [`Recepción escaneada de ${this.recepcion.orden}`],
    });
    const usados = new Set(this.data.productos.flatMap(producto =>
      producto.inventarios
        .filter(inventario => inventario.idAlmacen === this.recepcion.almacenId)
        .map(inventario => inventario.idAnaquel)
        .filter((id): id is number => id != null)));
    const libres = this.data.anaqueles.filter(anaquel =>
      anaquel.idAlmacen === this.recepcion.almacenId && !usados.has(Number(anaquel.id)));
    this.partidas = (this.recepcion.detalles || []).map(detalle => {
      const producto = this.data.productos.find(actual => actual.id === detalle.id);
      const inventario = producto?.inventarios.find(actual =>
        actual.idAlmacen === this.recepcion.almacenId);
      return {
        ...detalle,
        sku: producto?.sku || detalle.sku,
        codigo: producto?.codigo || detalle.codigo,
        nombre: producto?.producto || detalle.nombre,
        unidad: producto?.medida || detalle.unidad,
        esperada: detalle.cantidad,
        recibida: 0,
        cantidad: 0,
        ubicacionActual: inventario?.anaquel && inventario.anaquel !== '—'
          ? inventario.anaquel
          : 'Sin anaquel asignado',
        anaquelesSugeridos: libres.slice(0, 5).map(anaquel => anaquel.nombre),
        inventarioConfigurado: Boolean(inventario),
      };
    });
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  get totalEsperado(): number {
    return this.partidas.reduce((total, partida) => total + partida.esperada, 0);
  }

  get totalEscaneado(): number {
    return this.form.controls.documento.value.trim() ? this.totalEsperado : 0;
  }

  get recepcionCompleta(): boolean {
    return this.partidas.length > 0 && Boolean(this.form.controls.documento.value.trim());
  }

  get inventarioListo(): boolean {
    return this.partidas.every(partida => partida.inventarioConfigurado);
  }

  async iniciarCamara(): Promise<void> {
    this.errorCamara = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorCamara = 'Este navegador no permite usar la cámara. Captura el código manualmente.';
      return;
    }
    const Detector = (window as unknown as { BarcodeDetector?: ConstructorDetectorCodigo }).BarcodeDetector;
    if (!Detector) {
      this.errorCamara = 'El navegador no reconoce códigos desde cámara. Usa Chrome o Edge actualizado, o captura el código manualmente.';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!this.camera?.nativeElement) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'] });
      this.camera.nativeElement.srcObject = stream;
      await this.camera.nativeElement.play();
      this.camaraActiva = true;
      const flujo = ++this.flujoCamara;
      this.detectar(flujo);
    } catch (error) {
      this.errorCamara = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permiso de cámara rechazado. Habilítalo en el navegador o captura el código manualmente.'
        : 'No fue posible iniciar la cámara.';
    }
  }

  detenerCamara(): void {
    this.flujoCamara += 1;
    this.camaraActiva = false;
    const video = this.camera?.nativeElement;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (video) video.srcObject = null;
  }

  agregarPorCodigo(): void {
    const codigo = this.codigoManual.trim();
    if (!codigo) return;
    this.registrarDocumento(codigo);
    this.codigoManual = '';
  }

  guardar(): void {
    if (!this.inventarioListo) {
      this.snackBar.open('Hay productos sin inventario configurado en el almacén destino.', 'Cerrar', { duration: 4500 });
      return;
    }
    if (!this.recepcionCompleta) {
      this.snackBar.open('Escanea o captura el código de la caja, factura o remisión.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.detenerCamara();
    const formulario = this.form.getRawValue();
    this.dialogRef.close({
      detalles: this.partidas.map(({ esperada, recibida, ubicacionActual, anaquelesSugeridos, inventarioConfigurado, ...detalle }) => ({
        ...detalle,
        cantidad: esperada,
      })),
      documento: formulario.documento.trim(),
      observaciones: formulario.observaciones.trim(),
    } satisfies ResultadoRecepcionEscaneada);
  }

  private registrarDocumento(valor: string): void {
    const codigo = valor.trim();
    if (!codigo) return;
    this.form.controls.documento.setValue(codigo.slice(0, 80));
    this.mensajeEscaneo = `Documento ${codigo} leído. Se recibirá el contenido completo de ${this.recepcion.orden}.`;
    if (this.camaraActiva) this.detenerCamara();
  }

  private detectar(flujo: number): void {
    if (!this.camaraActiva || flujo !== this.flujoCamara) return;
    requestAnimationFrame(async () => {
      if (!this.camaraActiva || flujo !== this.flujoCamara) return;
      const video = this.camera?.nativeElement;
      if (!this.procesandoFotograma && this.detector && video && video.readyState >= 2) {
        this.procesandoFotograma = true;
        try {
          const codigos = await this.detector.detect(video);
          const valor = codigos[0]?.rawValue?.trim();
          const ahora = Date.now();
          if (valor && (valor !== this.ultimoCodigo || ahora - this.ultimoEscaneo > 1200)) {
            this.ultimoCodigo = valor;
            this.ultimoEscaneo = ahora;
            this.registrarDocumento(valor);
          }
        } catch {
          this.errorCamara = 'La cámara está activa, pero no fue posible leer este fotograma.';
        } finally {
          this.procesandoFotograma = false;
        }
      }
      this.detectar(flujo);
    });
  }
}
