import { AsyncPipe } from '@angular/common';
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
import { MarcasDialog } from './dialogs/marcas-dialog/marcas-dialog';

interface MarcaDb {
  id_marca: string;
  id_empresa: string;
  nombre: string;
  nombre_marca?: string;
  activo: string;
}

interface EmpresaDb { id_empresa: string; nombre_empresa: string; }
export interface EmpresaMarcaOption { id: string; nombre: string; }

export interface Marca {
  id: string;
  idEmpresa: string;
  empresa: string;
  nombre: string;
  productos: number;
  estado: boolean;
}

@Component({
  selector: 'app-marcas',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './marcas.html',
  styleUrls: ['../catalog-list.css', './marcas.css'],
})
export class Marcas implements OnInit, AfterViewInit {
  private readonly clave = 'catalogo-marcas-v2';
  private eliminados: string[] = [];
  private empresasCatalogo: EmpresaMarcaOption[] = [];
  displayedColumns = ['id', 'nombre', 'empresa', 'productos', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Marca>([]);
  obs!: Observable<Marca[]>;
  currentSearch = '';
  filtros: Record<string, ValorFiltroCatalogo> = { empresa: '', estado: '', asociacion: '' };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (marca, filtro) => {
      const f = JSON.parse(filtro);
      const texto = `${marca.id} ${marca.nombre} ${marca.empresa}`.toLowerCase();
      return (!f.search || texto.includes(f.search)) &&
        (!f.empresa || marca.idEmpresa === f.empresa) &&
        (!f.estado || marca.estado.toString() === f.estado) &&
        (!f.asociacion || (f.asociacion === 'con' ? marca.productos > 0 : marca.productos === 0));
    };
    this.obs = this.dataSource.connect();

    forkJoin({
      marcas: this.db.leer<MarcaDb>('marcas.txt'),
      productos: this.db.leer<{ id_marca: string }>('productos.txt'),
      empresas: this.db.leer<EmpresaDb>('empresas.txt'),
    }).subscribe(({ marcas, productos, empresas }) => {
      this.empresasCatalogo = empresas.map(empresa => ({ id: empresa.id_empresa, nombre: empresa.nombre_empresa }));
      const empresasPorId = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
      const fuente = marcas.map(marca => ({
        id: marca.id_marca,
        idEmpresa: marca.id_empresa,
        empresa: empresasPorId.get(marca.id_empresa) || 'Empresa no disponible',
        nombre: marca.nombre || marca.nombre_marca || '',
        productos: productos.filter(producto => producto.id_marca === marca.id_marca).length,
        estado: marca.activo === '1',
      }));
      const estado = this.persistencia.combinar(this.clave, fuente);
      this.eliminados = estado.eliminados;
      this.dataSource.data = this.actualizarEmpresas(estado.registros.map(marca => ({
        ...marca,
        productos: productos.filter(producto => producto.id_marca === marca.id).length,
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
    this.dialog.open(CatalogFilterDialog, {
      width: '580px',
      maxWidth: '96vw',
      data: {
        titulo: 'Filtrar marcas',
        filtros: this.filtros,
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', opciones: this.empresasCatalogo.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', opciones: [{ valor: 'true', etiqueta: 'Activa' }, { valor: 'false', etiqueta: 'Inactiva' }] },
          { clave: 'asociacion', etiqueta: 'Productos asociados', icono: 'inventory_2', opciones: [{ valor: 'con', etiqueta: 'Con productos' }, { valor: 'sin', etiqueta: 'Sin productos' }] },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(MarcasDialog, {
      width: '560px',
      data: { mode: 'add', empresas: this.empresasCatalogo, existentes: this.existentes() },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar([...this.dataSource.data, {
        ...resultado,
        id: this.persistencia.nuevoId(),
        idEmpresa: resultado.idEmpresa,
        empresa: '',
        productos: 0,
      }]);
    });
  }

  editar(marca: Marca): void {
    this.dialog.open(MarcasDialog, {
      width: '560px',
      data: { mode: 'edit', marca, empresas: this.empresasCatalogo, existentes: this.existentes(marca.id) },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar(this.dataSource.data.map(actual => actual.id === marca.id
        ? { ...actual, ...resultado }
        : actual));
    });
  }

  eliminar(marca: Marca): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar marca',
        message: `¿Deseas eliminar "${marca.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.eliminados = [...new Set([...this.eliminados, marca.id])];
      this.guardar(this.dataSource.data.filter(actual => actual.id !== marca.id));
    });
  }

  private existentes(excluir = ''): { nombre: string; idEmpresa: string }[] {
    return this.dataSource.data
      .filter(marca => marca.id !== excluir)
      .map(marca => ({ nombre: marca.nombre, idEmpresa: marca.idEmpresa }));
  }

  private actualizarEmpresas(marcas: Marca[]): Marca[] {
    const empresas = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
    return marcas.map(marca => ({ ...marca, empresa: empresas.get(marca.idEmpresa) || 'Empresa no disponible' }));
  }

  private guardar(marcas: Marca[]): void {
    this.dataSource.data = this.actualizarEmpresas(marcas);
    this.persistencia.guardar(this.clave, this.dataSource.data, this.eliminados);
    this.applyFilter();
  }
}
