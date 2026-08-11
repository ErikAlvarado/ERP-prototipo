import { AsyncPipe, DatePipe } from '@angular/common';
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
import { MedidasDialog } from './dialogs/medidas-dialog/medidas-dialog';

interface MedidaDb {
  id_medida: string;
  valor: string;
  id_unidad: string;
  activo: string;
  fecha_creacion: string;
}

export interface UnidadMedidaOption {
  id: string;
  nombre: string;
  abreviatura: string;
}

interface UnidadRelacionPersistida extends UnidadMedidaOption {
  idEmpresa: string;
  empresa: string;
  permitirDecimales: boolean;
  productos: number;
  medidas: number;
}

export interface Medida {
  id: string;
  valor: number;
  unidadId: string;
  unidadNombre: string;
  unidadAbreviatura: string;
  estado: boolean;
  fechaCreacion: string;
}

interface MedidaAnterior extends Partial<Medida> {
  id: string;
  valor: number;
  unidad?: string;
}

@Component({
  selector: 'app-medidas',
  imports: [...SHARED_IMPORTS, AsyncPipe, DatePipe, MatPaginatorModule],
  templateUrl: './medidas.html',
  styleUrls: ['../catalog-list.css', './medidas.css'],
})
export class Medidas implements OnInit, AfterViewInit {
  private readonly clave = 'catalogo-medidas-v2';
  private eliminados: string[] = [];
  private unidadesCatalogo: UnidadMedidaOption[] = [];
  displayedColumns = ['id', 'valor', 'unidad', 'fecha', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Medida>([]);
  obs!: Observable<Medida[]>;
  currentSearch = '';
  filtros: Record<string, ValorFiltroCatalogo> = { unidad: '', estado: '', minimo: null, maximo: null };
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (medida, filtro) => {
      const f = JSON.parse(filtro);
      const texto = `${medida.id} ${medida.valor} ${medida.unidadAbreviatura} ${medida.unidadNombre}`.toLowerCase();
      return (!f.search || texto.includes(f.search)) &&
        (!f.unidad || medida.unidadId === f.unidad) &&
        (!f.estado || medida.estado.toString() === f.estado) &&
        (f.minimo === null || f.minimo === '' || medida.valor >= Number(f.minimo)) &&
        (f.maximo === null || f.maximo === '' || medida.valor <= Number(f.maximo));
    };
    this.obs = this.dataSource.connect();

    forkJoin({
      medidas: this.db.leer<MedidaDb>('medidas.txt'),
      unidades: this.db.leer<{ id_unidad: string; nombre: string; abreviatura: string }>('unidades.txt'),
    }).subscribe(({ medidas, unidades }) => {
      const unidadesFuente: UnidadRelacionPersistida[] = unidades.map(unidad => ({
        id: unidad.id_unidad,
        nombre: unidad.nombre,
        abreviatura: unidad.abreviatura,
        idEmpresa: '',
        empresa: '',
        permitirDecimales: false,
        productos: 0,
        medidas: medidas.filter(medida => medida.id_unidad === unidad.id_unidad).length,
      }));
      this.unidadesCatalogo = this.persistencia
        .combinar<UnidadRelacionPersistida>('catalogo-unidades-v2', unidadesFuente)
        .registros
        .map(unidad => ({ id: unidad.id, nombre: unidad.nombre, abreviatura: unidad.abreviatura }));
      const fuente = medidas.map(medida => ({
        id: medida.id_medida,
        valor: Number(medida.valor) || 0,
        unidadId: medida.id_unidad,
        unidadNombre: this.obtenerUnidad(medida.id_unidad)?.nombre || 'Unidad no catalogada',
        unidadAbreviatura: this.obtenerUnidad(medida.id_unidad)?.abreviatura || '—',
        estado: medida.activo === '1',
        fechaCreacion: medida.fecha_creacion,
      }));
      const estado = this.persistencia.combinar(this.clave, fuente);
      this.eliminados = estado.eliminados;
      this.dataSource.data = estado.registros.map(medida => this.normalizar(medida));
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  get unidades(): UnidadMedidaOption[] {
    return [...this.unidadesCatalogo].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

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
        titulo: 'Filtrar medidas',
        filtros: this.filtros,
        campos: [
          { clave: 'unidad', etiqueta: 'Unidad', icono: 'straighten', opciones: this.unidades.map(unidad => ({ valor: unidad.id, etiqueta: `${unidad.nombre} (${unidad.abreviatura})` })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', opciones: [{ valor: 'true', etiqueta: 'Activa' }, { valor: 'false', etiqueta: 'Inactiva' }] },
          { clave: 'minimo', etiqueta: 'Valor mínimo', icono: 'south', tipo: 'number', minimo: 0, placeholder: 'Desde' },
          { clave: 'maximo', etiqueta: 'Valor máximo', icono: 'north', tipo: 'number', minimo: 0, placeholder: 'Hasta' },
        ],
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.filtros = resultado;
      this.applyFilter();
    });
  }

  abrirAgregar(): void {
    this.dialog.open(MedidasDialog, {
      width: '580px',
      data: { mode: 'add', unidades: this.unidades, existentes: this.existentes() },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar([...this.dataSource.data, this.normalizar({
        ...resultado,
        id: this.persistencia.nuevoId(),
        fechaCreacion: new Date().toISOString().slice(0, 10),
      })]);
    });
  }

  editar(medida: Medida): void {
    this.dialog.open(MedidasDialog, {
      width: '580px',
      data: {
        mode: 'edit',
        medida,
        unidades: this.unidades,
        existentes: this.existentes(medida.id),
      },
    }).afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.guardar(this.dataSource.data.map(actual => actual.id === medida.id
        ? this.normalizar({ ...actual, ...resultado })
        : actual));
    });
  }

  eliminar(medida: Medida): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar medida',
        message: `¿Deseas eliminar "${medida.valor} ${medida.unidadAbreviatura}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.eliminados = [...new Set([...this.eliminados, medida.id])];
      this.guardar(this.dataSource.data.filter(actual => actual.id !== medida.id));
    });
  }

  private obtenerUnidad(valor: string): UnidadMedidaOption | undefined {
    const normalizado = String(valor || '').toLowerCase();
    return this.unidadesCatalogo.find(actual =>
      actual.id === valor || actual.abreviatura.toLowerCase() === normalizado || actual.nombre.toLowerCase() === normalizado);
  }

  private normalizar(medida: Medida | MedidaAnterior): Medida {
    const unidadAnterior = 'unidad' in medida ? medida.unidad : '';
    const unidad = this.obtenerUnidad(medida.unidadId || unidadAnterior || '');
    return {
      id: medida.id,
      valor: Number(medida.valor) || 0,
      unidadId: unidad?.id || medida.unidadId || '',
      unidadNombre: unidad?.nombre || 'Unidad no catalogada',
      unidadAbreviatura: unidad?.abreviatura || '—',
      estado: medida.estado ?? true,
      fechaCreacion: medida.fechaCreacion || '',
    };
  }

  private existentes(excluir = ''): string[] {
    return this.dataSource.data
      .filter(medida => medida.id !== excluir)
      .map(medida => `${medida.valor}|${medida.unidadId}`);
  }

  private guardar(medidas: Medida[]): void {
    this.dataSource.data = medidas;
    this.persistencia.guardar(this.clave, medidas, this.eliminados);
    this.applyFilter();
  }
}
