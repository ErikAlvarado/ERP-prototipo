import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  CatalogoProductos,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../../shared/services/catalogo-productos';
import { ProductD } from './dialogs/product-d/product-d';
import { Filtro, FiltrosProducto } from './dialogs/filtro/filtro';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { EstatusProducto } from '../../../shared/components/estatus-producto/estatus-producto';

export type PeriodicElement = ProductoCatalogo;

const OPCIONES_VACIAS: OpcionesProducto = {
  empresas: [],
  categorias: [],
  marcas: [],
  unidades: [],
};

const FILTROS_VACIOS: FiltrosProducto = {
  empresa: '',
  categoria: '',
  marca: '',
  unidad: '',
  tipo: '',
  ubicacion: '',
  claveSat: '',
  conCodigo: null,
  pos: null,
  visible: null,
  estado: null,
  requiereReceta: null,
  usarExistencias: null,
  usarLotes: null,
};

@Component({
  selector: 'app-products',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, MatPaginatorModule, MatMenuModule, EstatusProducto],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['sku', 'producto', 'tipo', 'marca', 'categoria', 'medida', 'precio', 'estatus', 'acciones'];
  dataSource = new MatTableDataSource<PeriodicElement>([]);
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtrosAvanzados: FiltrosProducto = { ...FILTROS_VACIOS };
  opciones: OpcionesProducto = { ...OPCIONES_VACIAS };
  cargando = true;
  errorCarga = '';
  obs!: Observable<PeriodicElement[]>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private catalogo: CatalogoProductos,
    private router: Router,
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
        producto.ubicacionDefault,
        producto.claveSat,
      ].some(valor => this.normalizar(valor).includes(texto));
      const avanzados = datos.adv;

      return coincideTexto
        && (!avanzados.empresa || producto.empresa === avanzados.empresa)
        && (!avanzados.categoria || producto.categoria === avanzados.categoria)
        && (!avanzados.marca || producto.marca === avanzados.marca)
        && (!avanzados.unidad || producto.medida === avanzados.unidad)
        && (!avanzados.tipo || producto.tipo === avanzados.tipo)
        && (!avanzados.ubicacion || this.normalizar(producto.ubicacionDefault).includes(this.normalizar(avanzados.ubicacion)))
        && (!avanzados.claveSat || this.normalizar(producto.claveSat).includes(this.normalizar(avanzados.claveSat)))
        && (avanzados.conCodigo == null || (avanzados.conCodigo ? !!producto.codigo : !producto.codigo))
        && (avanzados.pos == null || producto.pos === avanzados.pos)
        && (avanzados.visible == null || producto.linea === avanzados.visible)
        && (avanzados.estado == null || producto.estado === avanzados.estado)
        && (avanzados.requiereReceta == null || producto.requiereReceta === avanzados.requiereReceta)
        && (avanzados.usarExistencias == null || producto.usarExistencias === avanzados.usarExistencias)
        && (avanzados.usarLotes == null || producto.usarLotes === avanzados.usarLotes);
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
        tipos: this.valores('tipo'),
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
      data: { mode: 'add', opciones: this.opciones, productos: this.dataSource.data },
    }).afterClosed().subscribe((resultado?: ProductoCatalogo) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      const nuevo: ProductoCatalogo = {
        ...resultado,
        id: this.siguienteId(),
        almacen: 'Sin inventario',
        anaquel: '—',
        lote: '—',
        caducidad: '—',
        stock: 0,
        stockReorden: 0,
        stockCritico: 0,
        stockMaximo: 0,
        imagen: '',
        ultimoMovimiento: 'Sin movimientos',
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
      data: { mode: 'edit', product: producto, opciones: this.opciones, productos: this.dataSource.data },
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
        title: 'Eliminar producto',
        message: `¿Deseas eliminar "${producto.producto}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      const hoy = new Date().toISOString().slice(0, 10);
      this.guardar(this.dataSource.data.map(actual => actual.id === producto.id
        ? { ...actual, estatus: 'Eliminado', estado: false, fechaActualizacion: hoy }
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

    this.catalogo.cargarOpciones().subscribe(opciones => this.opciones = opciones);
    this.catalogo.cargar().subscribe({
      next: productos => {
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

  private guardar(productos: PeriodicElement[]): void {
    this.dataSource.data = productos;
    this.catalogo.guardar(productos);
    this.setSort(this.currentSort);
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  }
}
