import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DatosDb } from '../../../shared/services/datos-db';
import { CatalogosPersistencia } from '../catalogos-persistencia';
import { CatalogFilterDialog, ValorFiltroCatalogo } from '../dialogs/catalog-filter-dialog/catalog-filter-dialog';
import { KitsDialog, ProductoKitOption } from './dialogs/kits-dialog/kits-dialog';

export interface KitElemento {
  idProducto: string;
  sku: string;
  nombre: string;
  cantidad: number;
  costo: number;
  precio: number;
  stock: number;
}

export interface Kit {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo: number;
  margen: number;
  elementos: KitElemento[];
  fecha: string;
  estado: boolean;
}

@Component({
  selector: 'app-kits',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, DatePipe, MatPaginatorModule],
  templateUrl: './kits.html',
  styleUrls: ['../catalog-list.css', './kits.css'],
})
export class Kits implements OnInit, AfterViewInit {
  private readonly clave = 'catalogo-kits-v2';
  private eliminados: string[] = [];
  private productos: ProductoKitOption[] = [];
  displayedColumns = ['nombre', 'elementos', 'costo', 'precio', 'margen', 'fecha', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Kit>([]);
  obs!: Observable<Kit[]>;
  currentSearch = '';
  filtros: Record<string, ValorFiltroCatalogo> = { producto: '', estado: '', precioMinimo: null, precioMaximo: null };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (kit, filtro) => {
      const f = JSON.parse(filtro);
      const productos = kit.elementos.map(elemento => `${elemento.sku} ${elemento.nombre}`).join(' ');
      const texto = `${kit.nombre} ${kit.descripcion} ${productos}`.toLowerCase();
      return (!f.search || texto.includes(f.search)) &&
        (!f.producto || kit.elementos.some(elemento => elemento.idProducto === f.producto)) &&
        (!f.estado || kit.estado.toString() === f.estado) &&
        (f.precioMinimo === null || f.precioMinimo === '' || kit.precio >= Number(f.precioMinimo)) &&
        (f.precioMaximo === null || f.precioMaximo === '' || kit.precio <= Number(f.precioMaximo));
    };
    this.obs = this.dataSource.connect();

    forkJoin({
      productos: this.db.leer<{ id_producto: string; sku: string; nombre_producto: string; estatus: string }>('productos.txt'),
      precios: this.db.leer<{ id_producto: string; precio_costo: string; precio_venta: string; fecha_inicio: string }>('productos_precios.txt'),
      componentes: this.db.leer<{ id_producto_kit: string; id_producto_hijo: string; cantidad: string }>('componentes_kit.txt'),
      inventario: this.db.leer<{ id_producto: string; stock: string }>('inventario.txt'),
    }).subscribe(({ productos, precios, componentes, inventario }) => {
      this.productos = productos
        .filter(producto => !producto.estatus || producto.estatus.toLowerCase() === 'vigente')
        .map(producto => {
          const precio = precios
            .filter(actual => actual.id_producto === producto.id_producto)
            .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
          return {
            idProducto: producto.id_producto,
            sku: producto.sku,
            nombre: producto.nombre_producto,
            costo: Number(precio?.precio_costo) || 0,
            precio: Number(precio?.precio_venta) || 0,
            stock: inventario
              .filter(registro => registro.id_producto === producto.id_producto)
              .reduce((total, registro) => total + (Number(registro.stock) || 0), 0),
          };
        });

      const productosPorId = new Map(this.productos.map(producto => [producto.idProducto, producto]));
      const kitsFuente = productos
        .filter(producto => producto.estatus?.toLowerCase() === 'vigente' && componentes.some(componente => componente.id_producto_kit === producto.id_producto))
        .map(producto => {
          const precio = precios
            .filter(actual => actual.id_producto === producto.id_producto)
            .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
          return this.normalizar({
            id: producto.id_producto,
            nombre: producto.nombre_producto,
            descripcion: `Kit ${producto.sku}`,
            precio: Number(precio?.precio_venta) || 0,
            costo: Number(precio?.precio_costo) || 0,
            margen: 0,
            elementos: componentes
              .filter(componente => componente.id_producto_kit === producto.id_producto)
              .map(componente => ({
                ...(productosPorId.get(componente.id_producto_hijo) || {
                  idProducto: componente.id_producto_hijo,
                  sku: `Producto ${componente.id_producto_hijo}`,
                  nombre: 'Producto no encontrado',
                  costo: 0,
                  precio: 0,
                  stock: 0,
                }),
                cantidad: Number(componente.cantidad) || 1,
              })),
            fecha: '2024-01-28',
            estado: true,
          });
        });
      const estado = this.persistencia.combinar<Kit>(this.clave, kitsFuente);
      this.eliminados = estado.eliminados;
      this.dataSource.data = estado.registros.map(kit => this.normalizar(kit));
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor !== '' && valor !== null).length;
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      ...this.filtros,
    });
    this.dataSource.paginator?.firstPage();
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
      width: '760px',
      maxWidth: '96vw',
      data: { mode: 'add', productos: this.productos, nombres: this.nombres() },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar([...this.dataSource.data, this.normalizar({
        ...resultado,
        id: this.persistencia.nuevoId(),
        fecha: new Date().toISOString().slice(0, 10),
      })]);
    });
  }

  editar(kit: Kit): void {
    this.dialog.open(KitsDialog, {
      width: '760px',
      maxWidth: '96vw',
      data: { mode: 'edit', kit, productos: this.productos, nombres: this.nombres(kit.id) },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar(this.dataSource.data.map(actual => actual.id === kit.id
        ? this.normalizar({ ...actual, ...resultado })
        : actual));
    });
  }

  eliminar(kit: Kit): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar kit',
        message: `¿Deseas eliminar el kit "${kit.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.eliminados = [...new Set([...this.eliminados, kit.id])];
      this.guardar(this.dataSource.data.filter(actual => actual.id !== kit.id));
    });
  }

  totalArticulos(kit: Kit): number {
    return kit.elementos.reduce((total, elemento) => total + elemento.cantidad, 0);
  }

  private nombres(excluir = ''): string[] {
    return this.dataSource.data.filter(kit => kit.id !== excluir).map(kit => kit.nombre);
  }

  private normalizar(kit: Kit): Kit {
    const elementos = (kit.elementos || []).map(elemento => ({ ...elemento, cantidad: Number(elemento.cantidad) || 1 }));
    const costo = elementos.reduce((total, elemento) => total + elemento.costo * elemento.cantidad, 0);
    const precio = Number(kit.precio) || 0;
    return {
      ...kit,
      elementos,
      costo,
      precio,
      margen: precio > 0 ? Math.round(((precio - costo) / precio) * 10000) / 100 : 0,
    };
  }

  private guardar(kits: Kit[]): void {
    this.dataSource.data = kits;
    this.persistencia.guardar(this.clave, kits, this.eliminados);
    this.applyFilter();
  }
}
