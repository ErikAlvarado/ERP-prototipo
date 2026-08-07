import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin } from 'rxjs';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  CatalogoProductos,
  OpcionesProducto,
  PrecioProductoCatalogo,
  ProductoCatalogo,
  calcularMargenPrecio,
  precioEstaVigente,
} from '../../../shared/services/catalogo-productos';
import { DatosDb } from '../../../shared/services/datos-db';
import { PersistenciaLocal } from '../../../shared/services/persistencia-local';
import { CatalogFilterDialog, ValorFiltroCatalogo } from '../dialogs/catalog-filter-dialog/catalog-filter-dialog';
import { KitDialogResult, KitsDialog, ProductoKitOption } from './dialogs/kits-dialog/kits-dialog';

interface ComponenteKitDb {
  id_producto_kit: string;
  id_producto_hijo: string;
  cantidad: string;
}

interface ComponenteKitGuardado {
  idProducto: number;
  cantidad: number;
}

export interface KitElemento extends ProductoKitOption {
  cantidad: number;
}

export interface Kit {
  id: number;
  idEmpresa: number;
  empresa: string;
  idMarca: number;
  marca: string;
  idCategoria: number;
  categoria: string;
  idUnidad: number;
  unidad: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo: number;
  costoComponentes: number;
  margen: number;
  elementos: KitElemento[];
  fechaCreacion: string;
  fechaActualizacion: string;
  estado: boolean;
}

@Component({
  selector: 'app-kits',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, DatePipe, MatPaginatorModule, MatMenuModule],
  templateUrl: './kits.html',
  styleUrls: ['../catalog-list.css', './kits.css'],
})
export class Kits implements OnInit, AfterViewInit {
  private readonly claveComponentes = 'catalogo-kits-componentes-v1';
  private productosCatalogo: ProductoCatalogo[] = [];
  private componentesFuente = new Map<number, ComponenteKitGuardado[]>();
  private componentesLocales: Record<string, ComponenteKitGuardado[]> = {};
  private opciones: OpcionesProducto = { empresas: [], categorias: [], marcas: [], unidades: [], listasPrecios: [] };
  private productos: ProductoKitOption[] = [];

  displayedColumns = ['nombre', 'empresa', 'elementos', 'costo', 'precio', 'margen', 'fecha', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Kit>([]);
  obs!: Observable<Kit[]>;
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtros: Record<string, ValorFiltroCatalogo> = { producto: '', estado: '', precioMinimo: null, precioMaximo: null };
  cargando = true;
  errorCarga = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private catalogo: CatalogoProductos,
    private persistencia: PersistenciaLocal,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (kit, filtro) => {
      const f = JSON.parse(filtro);
      const productos = kit.elementos.map(elemento => `${elemento.sku} ${elemento.nombre}`).join(' ');
      const texto = `${kit.sku} ${kit.nombre} ${kit.descripcion} ${kit.empresa} ${productos}`.toLocaleLowerCase();
      return (!f.search || texto.includes(f.search))
        && (!f.producto || kit.elementos.some(elemento => elemento.idProducto === Number(f.producto)))
        && (!f.estado || kit.estado.toString() === f.estado)
        && (f.precioMinimo === null || f.precioMinimo === '' || kit.precio >= Number(f.precioMinimo))
        && (f.precioMaximo === null || f.precioMaximo === '' || kit.precio <= Number(f.precioMaximo));
    };
    this.obs = this.dataSource.connect();
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor !== '' && valor !== null).length;
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLocaleLowerCase(),
      ...this.filtros,
    });
    this.dataSource.paginator?.firstPage();
  }

  setSort(orden: string): void {
    this.currentSort = orden;
    this.dataSource.data = [...this.dataSource.data].sort((a, b) => {
      if (orden === 'A - Z') return a.nombre.localeCompare(b.nombre, 'es');
      if (orden === 'Z - A') return b.nombre.localeCompare(a.nombre, 'es');
      if (orden === 'Más antiguos') return a.id - b.id;
      return b.id - a.id;
    });
    this.applyFilter();
  }

  abrirFiltros(): void {
    this.dialog.open(CatalogFilterDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        titulo: 'Filtrar kits',
        filtros: this.filtros,
        campos: [
          { clave: 'producto', etiqueta: 'Producto incluido', icono: 'inventory_2', opciones: this.productos.map(producto => ({ valor: producto.idProducto, etiqueta: `${producto.sku} · ${producto.nombre}` })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', opciones: [{ valor: 'true', etiqueta: 'Activo' }, { valor: 'false', etiqueta: 'Inactivo' }] },
          { clave: 'precioMinimo', etiqueta: 'Precio mínimo', icono: 'south', tipo: 'number', minimo: 0, placeholder: 'Desde' },
          { clave: 'precioMaximo', etiqueta: 'Precio máximo', icono: 'north', tipo: 'number', minimo: 0, placeholder: 'Hasta' },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(KitsDialog, {
      width: '820px',
      maxWidth: '96vw',
      data: {
        mode: 'add',
        productos: this.productos,
        opciones: this.opciones,
        nombres: this.nombres(),
        skus: this.skus(),
      },
    }).afterClosed().subscribe((resultado?: KitDialogResult) => {
      if (!resultado) return;
      const nuevo = this.crearProductoKit(resultado);
      this.productosCatalogo = [...this.productosCatalogo, nuevo];
      this.guardarComponentes(nuevo.id, resultado.elementos);
      this.catalogo.guardar(this.productosCatalogo);
      this.actualizarVista();
    });
  }

  editar(kit: Kit): void {
    this.dialog.open(KitsDialog, {
      width: '820px',
      maxWidth: '96vw',
      data: {
        mode: 'edit',
        kit,
        productos: this.productos,
        opciones: this.opciones,
        nombres: this.nombres(kit.id),
        skus: this.skus(kit.id),
      },
    }).afterClosed().subscribe((resultado?: KitDialogResult) => {
      if (!resultado) return;
      this.productosCatalogo = this.productosCatalogo.map(producto => producto.id === kit.id
        ? this.actualizarProductoKit(producto, resultado)
        : producto);
      this.guardarComponentes(kit.id, resultado.elementos);
      this.catalogo.guardar(this.productosCatalogo);
      this.actualizarVista();
    });
  }

  desactivar(kit: Kit): void {
    if (!kit.estado) return;
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Desactivar kit',
        message: `¿Deseas desactivar el kit "${kit.nombre}"? Se conservarán el producto, sus componentes, precios e historial.`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      this.productosCatalogo = this.productosCatalogo.map(producto => producto.id === kit.id
        ? { ...producto, estatus: 'Descontinuado', estado: false, fechaActualizacion: fecha }
        : producto);
      this.catalogo.guardar(this.productosCatalogo);
      this.actualizarVista();
    });
  }

  totalArticulos(kit: Kit): number {
    return kit.elementos.reduce((total, elemento) => total + elemento.cantidad, 0);
  }

  reintentar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.errorCarga = '';
    forkJoin({
      productos: this.catalogo.cargar(),
      opciones: this.catalogo.cargarOpciones(),
      componentes: this.db.leer<ComponenteKitDb>('componentes_kit.txt'),
    }).subscribe({
      next: ({ productos, opciones, componentes }) => {
        this.productosCatalogo = productos;
        this.opciones = opciones;
        this.componentesFuente = this.agruparComponentes(componentes);
        this.componentesLocales = this.persistencia.leer<Record<string, ComponenteKitGuardado[]>>(this.claveComponentes, {});
        this.actualizarVista();
        this.cargando = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.cargando = false;
        this.errorCarga = 'No fue posible cargar los productos y componentes de los kits.';
      },
    });
  }

  private actualizarVista(): void {
    this.productos = this.productosCatalogo
      .filter(producto => producto.tipo.toLocaleLowerCase() !== 'kit' && producto.estatus.toLocaleLowerCase() === 'vigente')
      .map(producto => ({
        idProducto: producto.id,
        idEmpresa: producto.idEmpresa,
        empresa: producto.empresa,
        sku: producto.sku,
        nombre: producto.producto,
        costo: producto.costo,
        precio: producto.precio,
        stock: producto.stock,
      }));
    const productosPorId = new Map(this.productos.map(producto => [producto.idProducto, producto]));

    this.dataSource.data = this.productosCatalogo
      .filter(producto => producto.tipo.toLocaleLowerCase() === 'kit')
      .map(producto => {
        const definiciones = this.componentesLocales[String(producto.id)] ?? this.componentesFuente.get(producto.id) ?? [];
        const elementos: KitElemento[] = definiciones.map(definicion => ({
          ...(productosPorId.get(definicion.idProducto) || {
            idProducto: definicion.idProducto,
            idEmpresa: producto.idEmpresa,
            empresa: producto.empresa,
            sku: `ID ${definicion.idProducto}`,
            nombre: 'Producto no disponible',
            costo: 0,
            precio: 0,
            stock: 0,
          }),
          cantidad: Math.max(1, Number(definicion.cantidad) || 1),
        }));
        const costoComponentes = this.calcularCostoElementos(elementos);
        return {
          id: producto.id,
          idEmpresa: producto.idEmpresa,
          empresa: producto.empresa,
          idMarca: producto.idMarca,
          marca: producto.marca,
          idCategoria: producto.idCategoria,
          categoria: producto.categoria,
          idUnidad: producto.idUnidad,
          unidad: producto.medida,
          sku: producto.sku,
          nombre: producto.producto,
          descripcion: producto.descripcion,
          precio: producto.precio,
          costo: costoComponentes,
          costoComponentes,
          margen: calcularMargenPrecio(costoComponentes, producto.precio),
          elementos,
          fechaCreacion: producto.fechaCreacion,
          fechaActualizacion: producto.fechaActualizacion,
          estado: producto.estado,
        };
      })
      .sort((a, b) => a.id - b.id);
    this.setSort(this.currentSort);
  }

  private crearProductoKit(resultado: KitDialogResult): ProductoCatalogo {
    const fecha = new Date().toISOString().slice(0, 10);
    const id = Math.max(0, ...this.productosCatalogo.map(producto => producto.id)) + 1;
    const costo = this.calcularCostoElementos(resultado.elementos);
    const resultadoCalculado = { ...resultado, costo };
    const precios = this.crearOActualizarPrecio(undefined, resultadoCalculado, id);
    const empresa = this.opciones.empresas.find(opcion => opcion.id === resultado.idEmpresa);
    const marca = this.opciones.marcas.find(opcion => opcion.id === resultado.idMarca);
    const categoria = this.opciones.categorias.find(opcion => opcion.id === resultado.idCategoria);
    const unidad = this.opciones.unidades.find(opcion => opcion.id === resultado.idUnidad);
    const productoKit = this.catalogo.actualizarResumenPrecio({
      id,
      idEmpresa: resultado.idEmpresa,
      empresa: empresa?.nombre || 'Empresa no disponible',
      sku: resultado.sku,
      codigo: '',
      producto: resultado.nombre,
      descripcion: resultado.descripcion,
      tipo: 'Kit',
      idMarca: resultado.idMarca,
      marca: marca?.nombre || 'Marca no disponible',
      idCategoria: resultado.idCategoria,
      categoria: categoria?.nombre || 'Categoría no disponible',
      idUnidad: resultado.idUnidad,
      medida: unidad?.nombre || 'Unidad no disponible',
      estatus: resultado.estado ? 'Vigente' : 'Descontinuado',
      precio: resultado.precio,
      costo,
      margen: calcularMargenPrecio(costo, resultado.precio),
      listaPrecio: 'Sin precio vigente',
      precios,
      pos: true,
      linea: false,
      estado: resultado.estado,
      requiereReceta: false,
      usarExistencias: true,
      almacen: 'Sin inventario',
      anaquel: '—',
      inventarios: [],
      stock: 0,
      stockReorden: 0,
      stockCritico: 0,
      stockMaximo: 0,
      ubicacionDefault: '',
      claveSat: '',
      imagen: '',
      imagenes: [],
      ultimoMovimiento: 'Sin movimientos',
      fechaActualizacion: fecha,
      fechaCreacion: fecha,
    });
    return {
      ...productoKit,
      costo,
      margen: calcularMargenPrecio(costo, productoKit.precio),
    };
  }

  private actualizarProductoKit(producto: ProductoCatalogo, resultado: KitDialogResult): ProductoCatalogo {
    const empresa = this.opciones.empresas.find(opcion => opcion.id === resultado.idEmpresa);
    const marca = this.opciones.marcas.find(opcion => opcion.id === resultado.idMarca);
    const categoria = this.opciones.categorias.find(opcion => opcion.id === resultado.idCategoria);
    const unidad = this.opciones.unidades.find(opcion => opcion.id === resultado.idUnidad);
    const costo = this.calcularCostoElementos(resultado.elementos);
    const precios = this.crearOActualizarPrecio(producto, { ...resultado, costo }, producto.id);
    const productoKit = this.catalogo.actualizarResumenPrecio({
      ...producto,
      idEmpresa: resultado.idEmpresa,
      empresa: empresa?.nombre || producto.empresa,
      sku: resultado.sku,
      producto: resultado.nombre,
      descripcion: resultado.descripcion,
      idMarca: resultado.idMarca,
      marca: marca?.nombre || producto.marca,
      idCategoria: resultado.idCategoria,
      categoria: categoria?.nombre || producto.categoria,
      idUnidad: resultado.idUnidad,
      medida: unidad?.nombre || producto.medida,
      estatus: resultado.estado ? 'Vigente' : 'Descontinuado',
      estado: resultado.estado,
      costo,
      margen: calcularMargenPrecio(costo, resultado.precio),
      precios,
      fechaActualizacion: new Date().toISOString().slice(0, 10),
    });
    return {
      ...productoKit,
      costo,
      margen: calcularMargenPrecio(costo, productoKit.precio),
    };
  }

  private crearOActualizarPrecio(
    producto: ProductoCatalogo | undefined,
    resultado: KitDialogResult,
    idProducto: number,
  ): PrecioProductoCatalogo[] {
    const cambioEmpresa = !!producto && producto.idEmpresa !== resultado.idEmpresa;
    const preciosBase = cambioEmpresa ? [] : [...(producto?.precios || [])];
    const principal = preciosBase.find(precio => precio.vigente && precio.listaPredeterminada)
      || preciosBase.find(precio => precio.vigente);
    const lista = principal
      ? this.opciones.listasPrecios.find(opcion => opcion.id === principal.idLista)
      : this.opciones.listasPrecios.find(opcion => opcion.idEmpresa === resultado.idEmpresa && opcion.predeterminada && opcion.activa)
        || this.opciones.listasPrecios.find(opcion => opcion.idEmpresa === resultado.idEmpresa && opcion.activa);
    if (!lista) return preciosBase;

    const fecha = new Date().toISOString().slice(0, 10);
    const idPrecio = principal?.id
      || Math.max(0, ...this.productosCatalogo.flatMap(actual => actual.precios.map(precio => precio.id)), idProducto * 1000) + 1;
    const actualizado: PrecioProductoCatalogo = {
      id: idPrecio,
      idLista: lista.id,
      idEmpresa: lista.idEmpresa,
      lista: lista.nombre,
      listaPredeterminada: lista.predeterminada,
      listaActiva: lista.activa,
      costo: resultado.costo,
      precio: resultado.precio,
      margen: calcularMargenPrecio(resultado.costo, resultado.precio),
      fechaInicio: principal?.fechaInicio || fecha,
      fechaFin: principal?.fechaFin || '',
      vigente: false,
    };
    actualizado.vigente = precioEstaVigente(actualizado);
    return [...preciosBase.filter(precio => precio.id !== principal?.id), actualizado];
  }

  private guardarComponentes(idKit: number, elementos: KitElemento[]): void {
    this.componentesLocales = {
      ...this.componentesLocales,
      [String(idKit)]: elementos.map(elemento => ({
        idProducto: elemento.idProducto,
        cantidad: Math.max(1, Math.floor(Number(elemento.cantidad) || 1)),
      })),
    };
    this.persistencia.guardar(this.claveComponentes, this.componentesLocales);
  }

  private calcularCostoElementos(elementos: KitElemento[]): number {
    const productosPorId = new Map(this.productos.map(producto => [producto.idProducto, producto]));
    const total = elementos.reduce((acumulado, elemento) => {
      const costo = productosPorId.get(elemento.idProducto)?.costo ?? elemento.costo;
      return acumulado + Number(costo) * Math.max(1, Math.floor(Number(elemento.cantidad) || 1));
    }, 0);
    return Number(total.toFixed(2));
  }

  private agruparComponentes(componentes: ComponenteKitDb[]): Map<number, ComponenteKitGuardado[]> {
    const resultado = new Map<number, ComponenteKitGuardado[]>();
    for (const componente of componentes) {
      const idKit = Number(componente.id_producto_kit);
      const actuales = resultado.get(idKit) || [];
      actuales.push({
        idProducto: Number(componente.id_producto_hijo),
        cantidad: Math.max(1, Number(componente.cantidad) || 1),
      });
      resultado.set(idKit, actuales);
    }
    return resultado;
  }

  private nombres(excluir = 0): string[] {
    return this.dataSource.data.filter(kit => kit.id !== excluir).map(kit => kit.nombre);
  }

  private skus(excluir = 0): string[] {
    return this.productosCatalogo.filter(producto => producto.id !== excluir).map(producto => producto.sku);
  }
}
