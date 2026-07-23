import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, take } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DatosDb } from '../../../shared/services/datos-db';
import { CatalogosPersistencia } from '../catalogos-persistencia';
import { CatalogFilterDialog, ValorFiltroCatalogo } from '../dialogs/catalog-filter-dialog/catalog-filter-dialog';
import { CategoriasDialog } from './dialogs/categorias-dialog/categorias-dialog';
import { AdministracionDatos } from '../../administracion/administracion-datos';
import { CatalogoProductos } from '../../../shared/services/catalogo-productos';

interface CategoriaDb {
  id_categoria: string;
  id_empresa: string;
  id_categoria_padre: string;
  nombre_categoria: string;
  activo: string;
}

export interface EmpresaCategoriaOption {
  id: string;
  nombre: string;
}

export interface Categoria {
  id: string;
  idEmpresa: string;
  empresa: string;
  idPadre: string;
  categoriaPadre: string;
  nombre: string;
  productos: number;
  estado: boolean;
}

@Component({
  selector: 'app-categorias',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './categorias.html',
  styleUrls: ['../catalog-list.css', './categorias.css'],
})
export class Categorias implements OnInit, AfterViewInit {
  private readonly clave = 'catalogo-categorias-v2';
  private eliminados: string[] = [];
  private empresasCatalogo: EmpresaCategoriaOption[] = [];
  displayedColumns = ['id', 'nombre', 'empresa', 'padre', 'productos', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Categoria>([]);
  obs!: Observable<Categoria[]>;
  currentSearch = '';
  filtros: Record<string, ValorFiltroCatalogo> = { empresa: '', padre: '', tipo: '', estado: '' };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
    private administracion: AdministracionDatos,
    private catalogoProductos: CatalogoProductos,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (categoria, filtro) => {
      const f = JSON.parse(filtro);
      const texto = `${categoria.id} ${categoria.nombre} ${categoria.categoriaPadre} ${categoria.empresa}`.toLowerCase();
      return (!f.search || texto.includes(f.search)) &&
        (!f.empresa || categoria.idEmpresa === f.empresa) &&
        (!f.padre || categoria.idPadre === f.padre) &&
        (!f.tipo || (f.tipo === 'principal' ? !categoria.idPadre : !!categoria.idPadre)) &&
        (!f.estado || categoria.estado.toString() === f.estado);
    };
    this.obs = this.dataSource.connect();

    forkJoin({
      categorias: this.db.leer<CategoriaDb>('categorias.txt'),
      productos: this.catalogoProductos.cargar(),
      administracion: this.administracion.cargar().pipe(take(1)),
    }).subscribe(({ categorias, productos, administracion }) => {
      this.empresasCatalogo = administracion.empresas
        .filter(empresa => empresa.estado)
        .map(empresa => ({ id: empresa.id, nombre: empresa.nombre }));
      const nombres = new Map(categorias.map(categoria => [categoria.id_categoria, categoria.nombre_categoria]));
      const empresasPorId = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
      const fuente = categorias.map(categoria => ({
        id: categoria.id_categoria,
        idEmpresa: categoria.id_empresa,
        empresa: empresasPorId.get(categoria.id_empresa) || 'Empresa no disponible',
        idPadre: categoria.id_categoria_padre || '',
        categoriaPadre: nombres.get(categoria.id_categoria_padre) || 'Categoría principal',
        nombre: categoria.nombre_categoria,
        productos: productos.filter(producto =>
          producto.idCategoria === Number(categoria.id_categoria)).length,
        estado: categoria.activo === '1',
      }));
      const estado = this.persistencia.combinar(this.clave, fuente);
      this.eliminados = estado.eliminados;
      this.dataSource.data = this.actualizarRelaciones(estado.registros.map(categoria => ({
        ...categoria,
        productos: productos.filter(producto =>
          producto.idCategoria === Number(categoria.id)).length,
      })));
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
    const padres = this.dataSource.data
      .filter(categoria => categoria.estado)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(categoria => ({ valor: categoria.id, etiqueta: categoria.nombre }));
    this.dialog.open(CatalogFilterDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        titulo: 'Filtrar categorías',
        filtros: this.filtros,
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', opciones: this.empresasCatalogo.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'padre', etiqueta: 'Categoría padre', icono: 'account_tree', opciones: padres },
          { clave: 'tipo', etiqueta: 'Tipo de categoría', icono: 'category', opciones: [{ valor: 'principal', etiqueta: 'Principal' }, { valor: 'subcategoria', etiqueta: 'Subcategoría' }] },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', opciones: [{ valor: 'true', etiqueta: 'Activa' }, { valor: 'false', etiqueta: 'Inactiva' }] },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(CategoriasDialog, {
      width: '620px',
      data: { mode: 'add', categorias: this.opcionesPadre(), empresas: this.empresasCatalogo, existentes: this.existentes() },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar([...this.dataSource.data, {
        ...resultado,
        id: this.persistencia.nuevoId(),
        idEmpresa: resultado.idEmpresa,
        empresa: '',
        categoriaPadre: '',
        productos: 0,
      }]);
    });
  }

  editar(categoria: Categoria): void {
    this.dialog.open(CategoriasDialog, {
      width: '620px',
      data: {
        mode: 'edit',
        category: categoria,
        categorias: this.opcionesPadre(categoria.id),
        empresas: this.empresasCatalogo,
        existentes: this.existentes(categoria.id),
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar(this.dataSource.data.map(actual => actual.id === categoria.id
        ? { ...actual, ...resultado }
        : actual));
    });
  }

  desactivar(categoria: Categoria): void {
    if (!categoria.estado) return;
    const descendientes = this.idsDescendientes(categoria.id);
    const relacionadas = categoria.productos + descendientes.length;
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Desactivar categoría',
        message: relacionadas
          ? `¿Deseas desactivar "${categoria.nombre}" y sus ${descendientes.length} subcategoría(s)? Se conservarán los IDs y ${categoria.productos} relación(es) con productos.`
          : `¿Deseas desactivar "${categoria.nombre}"? Se conservará su ID y podrá reactivarse al editarla.`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      const ids = new Set([categoria.id, ...descendientes]);
      this.guardar(this.dataSource.data.map(actual =>
        ids.has(actual.id) ? { ...actual, estado: false } : actual));
    });
  }

  private opcionesPadre(excluir = ''): { id: string; nombre: string; idEmpresa: string }[] {
    const excluidos = new Set([excluir, ...this.idsDescendientes(excluir)]);
    return this.dataSource.data
      .filter(categoria => !excluidos.has(categoria.id) && categoria.estado)
      .map(categoria => ({ id: categoria.id, nombre: categoria.nombre, idEmpresa: categoria.idEmpresa }));
  }

  private existentes(excluir = ''): { nombre: string; idEmpresa: string }[] {
    return this.dataSource.data
      .filter(categoria => categoria.id !== excluir)
      .map(categoria => ({ nombre: categoria.nombre, idEmpresa: categoria.idEmpresa }));
  }

  private idsDescendientes(id: string): string[] {
    if (!id) return [];
    const resultado: string[] = [];
    const pendientes = [id];
    while (pendientes.length) {
      const padre = pendientes.shift()!;
      const hijos = this.dataSource.data.filter(categoria => categoria.idPadre === padre).map(categoria => categoria.id);
      for (const hijo of hijos) if (!resultado.includes(hijo)) { resultado.push(hijo); pendientes.push(hijo); }
    }
    return resultado;
  }

  private actualizarRelaciones(categorias: Categoria[]): Categoria[] {
    const nombres = new Map(categorias.map(categoria => [categoria.id, categoria.nombre]));
    const empresas = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
    return categorias.map(categoria => ({
      ...categoria,
      empresa: empresas.get(categoria.idEmpresa) || 'Empresa no disponible',
      categoriaPadre: categoria.idPadre ? (nombres.get(categoria.idPadre) || 'Categoría no disponible') : 'Categoría principal',
    }));
  }

  private guardar(categorias: Categoria[]): void {
    this.dataSource.data = this.actualizarRelaciones(categorias);
    this.persistencia.guardar(this.clave, this.dataSource.data, this.eliminados);
    this.applyFilter();
  }
}
