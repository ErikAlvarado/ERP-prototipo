import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin } from 'rxjs';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  CatalogoProductos,
  OpcionListaPrecio,
  OpcionesProducto,
  PrecioProductoCatalogo,
  ProductoCatalogo,
  calcularMargenPrecio,
  precioEstaVigente,
} from '../../../shared/services/catalogo-productos';
import { PrecioDialog, PrecioDialogResult } from './dialogs/precio-dialog/precio-dialog';

export interface PrecioFila {
  idPrecio: number;
  idProducto: number;
  idEmpresa: number;
  empresa: string;
  sku: string;
  producto: string;
  idLista: number;
  lista: string;
  listaPredeterminada: boolean;
  listaActiva: boolean;
  costo: number;
  precio: number;
  margen: number;
  fechaInicio: string;
  fechaFin: string;
  vigente: boolean;
}

@Component({
  selector: 'app-precios',
  imports: [...SHARED_IMPORTS, AsyncPipe, CurrencyPipe, DatePipe, MatPaginatorModule],
  templateUrl: './precios.html',
  styleUrls: ['../catalog-list.css', './precios.css'],
})
export class Precios implements OnInit, AfterViewInit {
  displayedColumns = ['producto', 'lista', 'vigencia', 'costo', 'precio', 'margen', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<PrecioFila>([]);
  obs!: Observable<PrecioFila[]>;
  productos: ProductoCatalogo[] = [];
  opciones: OpcionesProducto = { empresas: [], categorias: [], marcas: [], unidades: [], listasPrecios: [] };
  currentSearch = '';
  empresaFiltro = '';
  listaFiltro = '';
  estadoFiltro = '';
  cargando = true;
  errorCarga = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private catalogo: CatalogoProductos,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (fila, filtro) => {
      const valores = JSON.parse(filtro) as { texto: string; empresa: string; lista: string; estado: string };
      const texto = `${fila.sku} ${fila.producto} ${fila.empresa} ${fila.lista}`.toLocaleLowerCase();
      return (!valores.texto || texto.includes(valores.texto))
        && (!valores.empresa || fila.idEmpresa === Number(valores.empresa))
        && (!valores.lista || fila.idLista === Number(valores.lista))
        && (!valores.estado || (valores.estado === 'vigente' ? fila.vigente : !fila.vigente));
    };
    this.obs = this.dataSource.connect();
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get listasFiltradas(): OpcionListaPrecio[] {
    return this.opciones.listasPrecios.filter(lista => !this.empresaFiltro || lista.idEmpresa === Number(this.empresaFiltro));
  }

  applyFilter(): void {
    if (this.listaFiltro && !this.listasFiltradas.some(lista => lista.id === Number(this.listaFiltro))) {
      this.listaFiltro = '';
    }
    this.dataSource.filter = JSON.stringify({
      texto: this.currentSearch.trim().toLocaleLowerCase(),
      empresa: this.empresaFiltro,
      lista: this.listaFiltro,
      estado: this.estadoFiltro,
    });
    this.dataSource.paginator?.firstPage();
  }

  agregar(): void {
    this.abrirDialogo('add');
  }

  editar(fila: PrecioFila): void {
    this.abrirDialogo('edit', fila);
  }

  eliminar(fila: PrecioFila): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Eliminar precio',
        message: `¿Deseas quitar el precio de "${fila.producto}" en la lista "${fila.lista}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.productos = this.productos.map(producto => producto.id === fila.idProducto
        ? this.catalogo.actualizarResumenPrecio({
            ...producto,
            precios: producto.precios.filter(precio => precio.id !== fila.idPrecio),
          })
        : producto);
      this.persistir();
    });
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
    }).subscribe({
      next: ({ productos, opciones }) => {
        this.productos = productos;
        this.opciones = opciones;
        this.reconstruirFilas();
        this.cargando = false;
      },
      error: () => {
        this.productos = [];
        this.dataSource.data = [];
        this.cargando = false;
        this.errorCarga = 'No fue posible cargar las listas y los precios de productos.';
      },
    });
  }

  private abrirDialogo(mode: 'add' | 'edit', fila?: PrecioFila): void {
    this.dialog.open(PrecioDialog, {
      width: '650px',
      maxWidth: '96vw',
      data: {
        mode,
        precio: fila,
        productos: this.productos.map(producto => ({
          id: producto.id,
          idEmpresa: producto.idEmpresa,
          empresa: producto.empresa,
          sku: producto.sku,
          nombre: producto.producto,
        })),
        listas: this.opciones.listasPrecios,
        existentes: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: PrecioDialogResult) => {
      if (!resultado) return;
      const idPrecio = fila?.idPrecio || this.siguienteId();
      const lista = this.opciones.listasPrecios.find(opcion => opcion.id === resultado.idLista);
      if (!lista) return;
      const relacion: PrecioProductoCatalogo = {
        id: idPrecio,
        idLista: lista.id,
        idEmpresa: lista.idEmpresa,
        lista: lista.nombre,
        listaPredeterminada: lista.predeterminada,
        listaActiva: lista.activa,
        costo: resultado.costo,
        precio: resultado.precio,
        margen: calcularMargenPrecio(resultado.costo, resultado.precio),
        fechaInicio: resultado.fechaInicio,
        fechaFin: resultado.fechaFin,
        vigente: false,
      };
      relacion.vigente = precioEstaVigente(relacion);

      this.productos = this.productos.map(producto => {
        const preciosSinAnterior = producto.precios.filter(precio => precio.id !== idPrecio);
        if (producto.id !== resultado.idProducto) {
          return preciosSinAnterior.length === producto.precios.length
            ? producto
            : this.catalogo.actualizarResumenPrecio({ ...producto, precios: preciosSinAnterior });
        }
        return this.catalogo.actualizarResumenPrecio({ ...producto, precios: [...preciosSinAnterior, relacion] });
      });
      this.persistir();
    });
  }

  private siguienteId(): number {
    return Math.max(0, ...this.dataSource.data.map(fila => fila.idPrecio)) + 1;
  }

  private persistir(): void {
    this.catalogo.guardar(this.productos);
    this.reconstruirFilas();
  }

  private reconstruirFilas(): void {
    this.dataSource.data = this.productos.flatMap(producto => producto.precios.map(precio => ({
      idPrecio: precio.id,
      idProducto: producto.id,
      idEmpresa: producto.idEmpresa,
      empresa: producto.empresa,
      sku: producto.sku,
      producto: producto.producto,
      idLista: precio.idLista,
      lista: precio.lista,
      listaPredeterminada: precio.listaPredeterminada,
      listaActiva: precio.listaActiva,
      costo: precio.costo,
      precio: precio.precio,
      margen: calcularMargenPrecio(precio.costo, precio.precio),
      fechaInicio: precio.fechaInicio,
      fechaFin: precio.fechaFin,
      vigente: precioEstaVigente(precio),
    }))).sort((a, b) => a.producto.localeCompare(b.producto, 'es') || a.lista.localeCompare(b.lista, 'es'));
    this.applyFilter();
  }
}
