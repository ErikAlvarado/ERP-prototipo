import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { combineLatest, Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  CatalogoProductos,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../../shared/services/catalogo-productos';
import {
  OpcionAlmacenProducto,
  OpcionAnaquelProducto,
  ProductD,
} from './dialogs/product-d/product-d';
import { Filtro, FiltrosProducto } from './dialogs/filtro/filtro';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { EstatusProducto } from '../../../shared/components/estatus-producto/estatus-producto';
import { AdministracionDatos } from '../../administracion/administracion-datos';
import { AnaquelesCatalogo } from '../anaqueles/anaqueles-catalogo';

export type PeriodicElement = ProductoCatalogo;

const OPCIONES_VACIAS: OpcionesProducto = {
  empresas: [],
  categorias: [],
  marcas: [],
  unidades: [],
  listasPrecios: [],
};

const FILTROS_VACIOS: FiltrosProducto = {
  empresa: '',
  categoria: '',
  marca: '',
  unidad: '',
  anaquel: '',
  conCodigo: null,
  pos: null,
  visible: null,
  estado: null,
  requiereReceta: null,
  usarExistencias: null,
};

@Component({
  selector: 'app-products',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, MatPaginatorModule, MatMenuModule, EstatusProducto],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['sku', 'producto', 'marca', 'categoria', 'medida', 'precio', 'estatus', 'acciones'];
  dataSource = new MatTableDataSource<PeriodicElement>([]);
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtrosAvanzados: FiltrosProducto = { ...FILTROS_VACIOS };
  opciones: OpcionesProducto = { ...OPCIONES_VACIAS };
  almacenes: OpcionAlmacenProducto[] = [];
  anaqueles: OpcionAnaquelProducto[] = [];
  cargando = true;
  errorCarga = '';
  obs!: Observable<PeriodicElement[]>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private catalogo: CatalogoProductos,
    private router: Router,
    private administracion: AdministracionDatos,
    private catalogoAnaqueles: AnaquelesCatalogo,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (producto, filtro) => {
      const datos = JSON.parse(filtro) as { text: string; adv: FiltrosProducto };
      const texto = this.normalizar(datos.text);
      const coincideTexto = !texto || [
        producto.producto,
        producto.sku,
        producto.codigo,
        producto.descripcion,
        producto.tipo,
        producto.empresa,
        producto.marca,
        producto.categoria,
        producto.medida,
        ...(producto.inventarios || []).map(inventario => inventario.anaquel),
      ].some(valor => this.normalizar(valor).includes(texto));
      const avanzados = datos.adv;

      return coincideTexto
        && (!avanzados.empresa || producto.empresa === avanzados.empresa)
        && (!avanzados.categoria || producto.categoria === avanzados.categoria)
        && (!avanzados.marca || producto.marca === avanzados.marca)
        && (!avanzados.unidad || producto.medida === avanzados.unidad)
        && (!avanzados.anaquel || (producto.inventarios || []).some(
          inventario => inventario.anaquel === avanzados.anaquel))
        && (avanzados.conCodigo == null || (avanzados.conCodigo ? !!producto.codigo : !producto.codigo))
        && (avanzados.pos == null || producto.pos === avanzados.pos)
        && (avanzados.visible == null || producto.linea === avanzados.visible)
        && (avanzados.estado == null || producto.estado === avanzados.estado)
        && (avanzados.requiereReceta == null || producto.requiereReceta === avanzados.requiereReceta)
        && (avanzados.usarExistencias == null || producto.usarExistencias === avanzados.usarExistencias);
    };

    this.obs = this.dataSource.connect();
    this.applyFilter();
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get filtrosActivos(): number {
    return Object.values(this.filtrosAvanzados).filter(valor => valor !== '' && valor !== null).length;
  }

  get totalVisible(): number {
    return this.dataSource.filteredData.length;
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({ text: this.currentSearch.trim(), adv: this.filtrosAvanzados });
    this.dataSource.paginator?.firstPage();
  }

  setSort(orden: string): void {
    this.currentSort = orden;
    this.dataSource.data = [...this.dataSource.data].sort((a, b) => {
      if (orden === 'A - Z') return a.producto.localeCompare(b.producto, 'es');
      if (orden === 'Z - A') return b.producto.localeCompare(a.producto, 'es');
      if (orden === 'SKU') return a.sku.localeCompare(b.sku, 'es', { numeric: true });
      if (orden === 'Más recientes') return b.id - a.id;
      return a.id - b.id;
    });
    this.applyFilter();
  }

  abrirFiltros(): void {
    this.dialog.open(Filtro, {
      width: '620px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog',
      data: {
        filtros: this.filtrosAvanzados,
        empresas: this.opciones.empresas.map(opcion => opcion.nombre),
        categorias: this.opciones.categorias.map(opcion => opcion.nombre),
        marcas: this.opciones.marcas.map(opcion => opcion.nombre),
        unidades: this.opciones.unidades.map(opcion => opcion.nombre),
        anaqueles: [...new Set(this.anaqueles.filter(anaquel => anaquel.estado).map(anaquel => anaquel.nombre))]
          .sort((a, b) => a.localeCompare(b, 'es')),
      },
    }).afterClosed().subscribe((resultado?: FiltrosProducto) => {
      if (!resultado) return;
      this.filtrosAvanzados = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(ProductD, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: {
        mode: 'add',
        opciones: this.opciones,
        almacenes: this.almacenes,
        anaqueles: this.anaqueles,
        productos: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: ProductoCatalogo) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      const id = this.siguienteId();
      let siguienteInventarioId = this.siguienteInventarioId();
      const inventarios = resultado.inventarios.map(inventario => ({
        ...inventario,
        id: siguienteInventarioId++,
        fechaActualizacion: fecha,
      }));
      const nuevo: ProductoCatalogo = {
        ...resultado,
        id,
        inventarios,
        almacen: inventarios.length === 1 ? inventarios[0].almacen : 'Sin inventario',
        anaquel: inventarios.length === 1 ? inventarios[0].anaquel || '—' : '—',
        stock: inventarios.reduce((total, inventario) => total + inventario.stock, 0),
        stockReorden: inventarios.reduce((total, inventario) => total + inventario.stockReorden, 0),
        stockCritico: inventarios.reduce((total, inventario) => total + inventario.stockCritico, 0),
        stockMaximo: inventarios.reduce((total, inventario) => total + inventario.stockMaximo, 0),
        imagen: '',
        imagenes: [],
        ultimoMovimiento: inventarios.length
          ? `${fecha} · Inventario inicial · +${inventarios[0].stock}`
          : 'Sin movimientos',
        fechaCreacion: fecha,
        fechaActualizacion: fecha,
      };
      this.guardar([nuevo, ...this.dataSource.data]);
    });
  }

  editar(producto: PeriodicElement): void {
    this.dialog.open(ProductD, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: {
        mode: 'edit',
        product: producto,
        opciones: this.opciones,
        almacenes: this.almacenes,
        anaqueles: this.anaqueles,
        productos: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: ProductoCatalogo) => {
      if (!resultado) return;
      const actualizado = {
        ...producto,
        ...resultado,
        fechaActualizacion: new Date().toISOString().slice(0, 10),
      };
      this.guardar(this.dataSource.data.map(actual => actual.id === producto.id ? actualizado : actual));
    });
  }

  eliminar(producto: PeriodicElement): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Desactivar producto',
        message: `¿Deseas descontinuar "${producto.producto}"? Dejará de estar disponible en inventario.`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      const hoy = new Date().toISOString().slice(0, 10);
      this.guardar(this.dataSource.data.map(actual => actual.id === producto.id
        ? { ...actual, estatus: 'Descontinuado', estado: false, fechaActualizacion: hoy }
        : actual));
    });
  }

  verDetalle(producto: PeriodicElement): void {
    this.router.navigate(['/products', producto.id], { state: { producto } });
  }

  reintentar(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = '';

    combineLatest({
      opciones: this.catalogo.cargarOpciones(),
      productos: this.catalogo.cargar(),
      administracion: this.administracion.cargar(),
      anaqueles: this.catalogoAnaqueles.cargar(),
    }).subscribe({
      next: ({ opciones, productos, administracion, anaqueles }) => {
        const empresasActivas = new Map(administracion.empresas
          .filter(empresa => empresa.estado)
          .map(empresa => [Number(empresa.id), empresa.nombre]));
        this.opciones = {
          ...opciones,
          empresas: [...empresasActivas].map(([id, nombre]) => ({
            id,
            idEmpresa: id,
            nombre,
          })),
        };
        this.almacenes = administracion.almacenes
          .filter(almacen =>
            almacen.estado && empresasActivas.has(Number(almacen.empresaId)))
          .map(almacen => ({
            id: Number(almacen.id),
            idEmpresa: Number(almacen.empresaId),
            nombre: almacen.nombre,
          }));
        this.anaqueles = anaqueles.map(anaquel => ({
          id: Number(anaquel.id),
          idEmpresa: Number(anaquel.idEmpresa),
          idAlmacen: Number(anaquel.idAlmacen),
          nombre: anaquel.nombre,
          estado: anaquel.estado,
        }));
        this.dataSource.data = productos;
        this.setSort(this.currentSort);
        this.cargando = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.errorCarga = 'No se pudo leer productos.txt. Verifica que el archivo exista y conserve sus encabezados separados por |.';
        this.cargando = false;
      },
    });
  }

  private valores(campo: keyof ProductoCatalogo): string[] {
    return [...new Set(this.dataSource.data
      .map(producto => producto[campo])
      .filter((valor): valor is string => typeof valor === 'string' && !!valor))]
      .sort((a, b) => a.localeCompare(b, 'es'));
  }

  private siguienteId(): number {
    return Math.max(0, ...this.dataSource.data.map(producto => producto.id)) + 1;
  }

  private siguienteInventarioId(): number {
    return Math.max(
      0,
      ...this.dataSource.data.flatMap(
        producto => producto.inventarios.map(inventario => Number(inventario.id) || 0),
      ),
    ) + 1;
  }

  private guardar(productos: PeriodicElement[]): void {
    this.dataSource.data = productos;
    this.catalogo.guardar(productos);
    this.setSort(this.currentSort);
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  }
}
