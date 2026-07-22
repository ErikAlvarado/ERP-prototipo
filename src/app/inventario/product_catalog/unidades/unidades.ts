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
import { UnidadesDialog } from './dialogs/unidades-dialog/unidades-dialog';

interface UnidadDb {
  id_unidad: string;
  id_empresa: string;
  nombre: string;
  abreviatura: string;
  permitir_decimales: string;
}

interface EmpresaDb { id_empresa: string; nombre_empresa: string; }
export interface EmpresaUnidadOption { id: string; nombre: string; }

export interface Unidad {
  id: string;
  idEmpresa: string;
  empresa: string;
  nombre: string;
  abreviatura: string;
  permitirDecimales: boolean;
  productos: number;
  medidas: number;
}

@Component({
  selector: 'app-unidades',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './unidades.html',
  styleUrls: ['../catalog-list.css', './unidades.css'],
})
export class Unidades implements OnInit, AfterViewInit {
  private readonly clave = 'catalogo-unidades-v2';
  private eliminados: string[] = [];
  private empresasCatalogo: EmpresaUnidadOption[] = [];
  displayedColumns = ['id', 'nombre', 'abreviatura', 'empresa', 'decimales', 'productos', 'medidas', 'acciones'];
  dataSource = new MatTableDataSource<Unidad>([]);
  obs!: Observable<Unidad[]>;
  currentSearch = '';
  filtros: Record<string, ValorFiltroCatalogo> = { empresa: '', decimales: '', uso: '' };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (unidad, filtro) => {
      const f = JSON.parse(filtro);
      const texto = `${unidad.id} ${unidad.nombre} ${unidad.abreviatura} ${unidad.empresa}`.toLowerCase();
      return (!f.search || texto.includes(f.search)) &&
        (!f.empresa || unidad.idEmpresa === f.empresa) &&
        (!f.decimales || unidad.permitirDecimales.toString() === f.decimales) &&
        (!f.uso || (f.uso === 'productos' ? unidad.productos > 0 : f.uso === 'medidas' ? unidad.medidas > 0 : unidad.productos === 0 && unidad.medidas === 0));
    };
    this.obs = this.dataSource.connect();

    forkJoin({
      unidades: this.db.leer<UnidadDb>('unidades.txt'),
      productos: this.db.leer<{ id_unidad: string }>('productos.txt'),
      medidas: this.db.leer<{ id_unidad: string }>('medidas.txt'),
      empresas: this.db.leer<EmpresaDb>('empresas.txt'),
    }).subscribe(({ unidades, productos, medidas, empresas }) => {
      this.empresasCatalogo = empresas.map(empresa => ({ id: empresa.id_empresa, nombre: empresa.nombre_empresa }));
      const empresasPorId = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
      const fuente = unidades.map(unidad => ({
        id: unidad.id_unidad,
        idEmpresa: unidad.id_empresa,
        empresa: empresasPorId.get(unidad.id_empresa) || 'Empresa no disponible',
        nombre: unidad.nombre,
        abreviatura: unidad.abreviatura,
        permitirDecimales: unidad.permitir_decimales === '1',
        productos: productos.filter(producto => producto.id_unidad === unidad.id_unidad).length,
        medidas: medidas.filter(medida => medida.id_unidad === unidad.id_unidad).length,
      }));
      const estado = this.persistencia.combinar(this.clave, fuente);
      this.eliminados = estado.eliminados;
      this.dataSource.data = this.actualizarEmpresas(estado.registros.map(unidad => ({
        ...unidad,
        productos: productos.filter(producto => producto.id_unidad === unidad.id).length,
        medidas: medidas.filter(medida => medida.id_unidad === unidad.id).length,
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
        titulo: 'Filtrar unidades',
        filtros: this.filtros,
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', opciones: this.empresasCatalogo.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'decimales', etiqueta: 'Cantidades decimales', icono: 'decimal_increase', opciones: [{ valor: 'true', etiqueta: 'Permitidas' }, { valor: 'false', etiqueta: 'No permitidas' }] },
          { clave: 'uso', etiqueta: 'Uso de la unidad', icono: 'link', opciones: [{ valor: 'productos', etiqueta: 'Usada por productos' }, { valor: 'medidas', etiqueta: 'Usada por medidas' }, { valor: 'sin', etiqueta: 'Sin relaciones' }] },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(UnidadesDialog, {
      width: '580px',
      data: { mode: 'add', empresas: this.empresasCatalogo, existentes: this.existentes() },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar([...this.dataSource.data, {
        ...resultado,
        id: this.persistencia.nuevoId(),
        idEmpresa: resultado.idEmpresa,
        empresa: '',
        productos: 0,
        medidas: 0,
      }]);
    });
  }

  editar(unidad: Unidad): void {
    this.dialog.open(UnidadesDialog, {
      width: '580px',
      data: {
        mode: 'edit',
        unidad,
        empresas: this.empresasCatalogo,
        existentes: this.existentes(unidad.id),
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar(this.dataSource.data.map(actual => actual.id === unidad.id
        ? { ...actual, ...resultado }
        : actual));
    });
  }

  eliminar(unidad: Unidad): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar unidad',
        message: `¿Deseas eliminar "${unidad.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.eliminados = [...new Set([...this.eliminados, unidad.id])];
      this.guardar(this.dataSource.data.filter(actual => actual.id !== unidad.id));
    });
  }

  private existentes(excluir = ''): { nombre: string; abreviatura: string; idEmpresa: string }[] {
    return this.dataSource.data
      .filter(unidad => unidad.id !== excluir)
      .map(unidad => ({ nombre: unidad.nombre, abreviatura: unidad.abreviatura, idEmpresa: unidad.idEmpresa }));
  }

  private actualizarEmpresas(unidades: Unidad[]): Unidad[] {
    const empresas = new Map(this.empresasCatalogo.map(empresa => [empresa.id, empresa.nombre]));
    return unidades.map(unidad => ({
      ...unidad,
      empresa: empresas.get(unidad.idEmpresa) || 'Empresa no disponible',
      medidas: unidad.medidas ?? 0,
    }));
  }

  private guardar(unidades: Unidad[]): void {
    this.dataSource.data = this.actualizarEmpresas(unidades);
    this.persistencia.guardar(this.clave, this.dataSource.data, this.eliminados);
    this.applyFilter();
  }
}
