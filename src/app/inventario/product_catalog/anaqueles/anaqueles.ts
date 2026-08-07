import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, take } from 'rxjs';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  ProductoCatalogo,
  CatalogoProductos,
} from '../../../shared/services/catalogo-productos';
import {
  AlmacenAdministracion,
  AdministracionDatos,
  EmpresaAdministracion,
} from '../../administracion/administracion-datos';
import {
  CatalogFilterDialog,
  ValorFiltroCatalogo,
} from '../dialogs/catalog-filter-dialog/catalog-filter-dialog';
import { AnaquelCatalogo, AnaquelesCatalogo } from './anaqueles-catalogo';
import { AnaquelesDialog } from './dialogs/anaqueles-dialog/anaqueles-dialog';

interface AnaquelVista extends AnaquelCatalogo {
  empresa: string;
  almacen: string;
  productos: number;
}

@Component({
  selector: 'app-anaqueles',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule, MatMenuModule],
  templateUrl: './anaqueles.html',
  styleUrls: ['../catalog-list.css', './anaqueles.css'],
})
export class Anaqueles implements OnInit, AfterViewInit {
  displayedColumns = ['id', 'nombre', 'almacen', 'empresa', 'productos', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<AnaquelVista>([]);
  obs!: Observable<AnaquelVista[]>;
  currentSearch = '';
  currentSort = 'Más antiguos';
  filtros: Record<string, ValorFiltroCatalogo> = { empresa: '', almacen: '', estado: '' };
  empresas: EmpresaAdministracion[] = [];
  almacenes: AlmacenAdministracion[] = [];
  productos: ProductoCatalogo[] = [];
  cargando = true;
  errorCarga = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private catalogoAnaqueles: AnaquelesCatalogo,
    private catalogoProductos: CatalogoProductos,
    private administracion: AdministracionDatos,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (anaquel, filtro) => {
      const f = JSON.parse(filtro) as Record<string, ValorFiltroCatalogo> & { search: string };
      const texto = `${anaquel.id} ${anaquel.nombre} ${anaquel.almacen} ${anaquel.empresa}`
        .toLocaleLowerCase();
      return (!f.search || texto.includes(String(f.search)))
        && (!f['empresa'] || anaquel.idEmpresa === Number(f['empresa']))
        && (!f['almacen'] || anaquel.idAlmacen === Number(f['almacen']))
        && (!f['estado'] || anaquel.estado.toString() === f['estado']);
    };
    this.obs = this.dataSource.connect();
    this.cargarDatos();
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
      if (orden === 'Más antiguos') return this.numeroId(a.id) - this.numeroId(b.id);
      return this.numeroId(b.id) - this.numeroId(a.id);
    });
    this.applyFilter();
  }

  abrirFiltros(): void {
    this.dialog.open(CatalogFilterDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        titulo: 'Filtrar anaqueles',
        filtros: this.filtros,
        campos: [
          {
            clave: 'empresa',
            etiqueta: 'Empresa',
            icono: 'business',
            opciones: this.empresas.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })),
          },
          {
            clave: 'almacen',
            etiqueta: 'Almacén',
            icono: 'warehouse',
            opciones: this.almacenes.map(almacen => ({ valor: almacen.id, etiqueta: almacen.nombre })),
          },
          {
            clave: 'estado',
            etiqueta: 'Estado',
            icono: 'toggle_on',
            opciones: [
              { valor: 'true', etiqueta: 'Activo' },
              { valor: 'false', etiqueta: 'Inactivo' },
            ],
          },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(AnaquelesDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        mode: 'add',
        empresas: this.empresas.filter(empresa => empresa.estado),
        almacenes: this.almacenes.filter(almacen => almacen.estado),
        existentes: this.registrosCatalogo(),
      },
    }).afterClosed().subscribe((resultado?: Omit<AnaquelCatalogo, 'id'>) => {
      if (!resultado) return;
      const registros = this.registrosCatalogo();
      this.guardarAnaqueles([
        ...registros,
        { ...resultado, id: this.catalogoAnaqueles.siguienteId(registros) },
      ]);
    });
  }

  editar(anaquel: AnaquelVista): void {
    this.dialog.open(AnaquelesDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        mode: 'edit',
        anaquel,
        empresas: this.empresas,
        almacenes: this.almacenes,
        existentes: this.registrosCatalogo().filter(actual => actual.id !== anaquel.id),
      },
    }).afterClosed().subscribe((resultado?: Omit<AnaquelCatalogo, 'id'>) => {
      if (!resultado) return;
      if (resultado.nombre !== anaquel.nombre) {
        this.actualizarProductos(anaquel, resultado.nombre);
      }
      this.guardarAnaqueles(this.registrosCatalogo().map(actual => actual.id === anaquel.id
        ? { ...actual, ...resultado }
        : actual));
    });
  }

  eliminar(anaquel: AnaquelVista): void {
    const mensaje = anaquel.productos
      ? `¿Deseas borrar “${anaquel.nombre}”? ${anaquel.productos} producto(s) quedarán sin anaquel asignado.`
      : `¿Deseas borrar “${anaquel.nombre}”? Esta acción quitará el anaquel del catálogo.`;
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Borrar anaquel',
        message: mensaje,
        confirmText: 'Borrar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      if (anaquel.productos) this.actualizarProductos(anaquel, '');
      this.guardarAnaqueles(this.registrosCatalogo().filter(actual => actual.id !== anaquel.id));
    });
  }

  reintentar(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = '';
    forkJoin({
      productos: this.catalogoProductos.cargar().pipe(take(1)),
      administracion: this.administracion.cargar().pipe(take(1)),
    }).subscribe({
      next: ({ productos, administracion }) => {
        this.productos = productos;
        this.empresas = administracion.empresas;
        this.almacenes = administracion.almacenes;
        const registros = this.catalogoAnaqueles.cargar(productos, administracion.almacenes);
        this.dataSource.data = this.enriquecer(registros);
        this.setSort(this.currentSort);
        this.cargando = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.errorCarga = 'No fue posible cargar los anaqueles y sus relaciones de inventario.';
        this.cargando = false;
      },
    });
  }

  private guardarAnaqueles(anaqueles: AnaquelCatalogo[]): void {
    this.catalogoAnaqueles.guardar(anaqueles);
    this.dataSource.data = this.enriquecer(anaqueles);
    this.setSort(this.currentSort);
  }

  private actualizarProductos(anaquel: AnaquelCatalogo, nuevoNombre: string): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.productos = this.productos.map(producto => {
      let actualizado = false;
      const inventarios = (producto.inventarios || []).map(inventario => {
        if (!this.catalogoAnaqueles.coinciden(
          anaquel,
          inventario.idAlmacen,
          inventario.anaquel,
        )) return inventario;
        actualizado = true;
        return { ...inventario, anaquel: nuevoNombre, fechaActualizacion: hoy };
      });
      if (!actualizado) return producto;
      return {
        ...producto,
        inventarios,
        anaquel: inventarios.length === 1 ? (inventarios[0].anaquel || '—') : '—',
        fechaActualizacion: hoy,
      };
    });
    this.catalogoProductos.guardar(this.productos);
  }

  private enriquecer(registros: AnaquelCatalogo[]): AnaquelVista[] {
    const empresas = new Map(this.empresas.map(empresa => [Number(empresa.id), empresa.nombre]));
    const almacenes = new Map(this.almacenes.map(almacen => [Number(almacen.id), almacen.nombre]));
    return registros.map(anaquel => ({
      ...anaquel,
      empresa: empresas.get(Number(anaquel.idEmpresa)) || 'Empresa no disponible',
      almacen: almacenes.get(Number(anaquel.idAlmacen)) || 'Almacén no disponible',
      productos: this.contarProductos(anaquel),
    }));
  }

  private contarProductos(anaquel: AnaquelCatalogo): number {
    return this.productos.filter(producto => (producto.inventarios || []).some(inventario =>
      this.catalogoAnaqueles.coinciden(anaquel, inventario.idAlmacen, inventario.anaquel))).length;
  }

  private registrosCatalogo(): AnaquelCatalogo[] {
    return this.dataSource.data.map(({ id, idEmpresa, idAlmacen, nombre, estado }) => ({
      id,
      idEmpresa,
      idAlmacen,
      nombre,
      estado,
    }));
  }

  private numeroId(id: string): number {
    const numero = Number(id);
    return Number.isFinite(numero) ? numero : 0;
  }
}
