import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, take } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PersistenciaVentasTxt } from '../../../shared/services/persistencia-ventas-txt';
import { AdministracionDatos, AlmacenAdministracion, EmpresaAdministracion } from '../administracion-datos';
import { FiltrosAdministracionDialog, ValorFiltroAdministracion } from '../filtros-administracion-dialog/filtros-administracion-dialog';
import { CajasDialog } from './dialogs/cajas-dialog/cajas-dialog';

export type EstatusCaja = 'Disponible' | 'En uso' | 'Fuera de servicio';

export interface CajaAdministracion {
  id: string;
  empresaId: string;
  almacenId: string;
  codigo: string;
  nombre: string;
  estatus: EstatusCaja;
  activa: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface CajaDb extends Record<string, string> {
  id_caja: string;
  id_empresa: string;
  id_almacen: string;
  codigo: string;
  nombre: string;
  estatus: string;
  activo: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

@Component({
  selector: 'app-cajas',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule, MatSnackBarModule, MatMenuModule],
  templateUrl: './cajas.html',
  styleUrls: ['../administracion-listas.css', './cajas.css'],
})
export class Cajas implements OnInit, AfterViewInit {
  displayedColumns = ['codigo', 'empresa', 'almacen', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<CajaAdministracion>([]);
  obs!: Observable<CajaAdministracion[]>;
  empresas: EmpresaAdministracion[] = [];
  almacenes: AlmacenAdministracion[] = [];
  currentSearch = '';
  currentSort = 'Más recientes';
  currentEmpresa = '';
  currentAlmacen = '';
  currentStatus: boolean | null = null;
  guardando = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private datos: AdministracionDatos,
    private ventasTxt: PersistenciaVentasTxt,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (caja, filtro) => {
      const filtros = JSON.parse(filtro) as { search: string; empresa: string; almacen: string; status: boolean | null };
      const texto = `${caja.id} ${caja.codigo} ${this.nombreEmpresa(caja.empresaId)} ${this.nombreAlmacen(caja.almacenId)}`.toLowerCase();
      return (!filtros.search || texto.includes(filtros.search)) &&
        (!filtros.empresa || caja.empresaId === filtros.empresa) &&
        (!filtros.almacen || caja.almacenId === filtros.almacen) &&
        (filtros.status === null || caja.activa === filtros.status);
    };
    this.obs = this.dataSource.connect();
    this.datos.cargar().pipe(take(1)).subscribe(estado => {
      this.empresas = estado.empresas;
      this.almacenes = estado.almacenes;
      void this.cargarCajas();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(), empresa: this.currentEmpresa,
      almacen: this.currentAlmacen, status: this.currentStatus,
    });
    this.dataSource.paginator?.firstPage();
  }

  get filtrosActivos(): number {
    return Number(!!this.currentEmpresa) + Number(!!this.currentAlmacen) + Number(this.currentStatus !== null);
  }

  setSort(orden: string): void {
    this.currentSort = orden;
    this.dataSource.data = [...this.dataSource.data].sort((a, b) => {
      if (orden === 'Código A - Z') return a.codigo.localeCompare(b.codigo, 'es', { numeric: true });
      if (orden === 'Código Z - A') return b.codigo.localeCompare(a.codigo, 'es', { numeric: true });
      if (orden === 'Más antiguos') return Number(a.id) - Number(b.id);
      return Number(b.id) - Number(a.id);
    });
    this.applyFilter();
  }

  abrirFiltros(): void {
    this.dialog.open(FiltrosAdministracionDialog, {
      width: '600px', panelClass: 'custom-dialog', data: {
        titulo: 'Filtrar cajas',
        filtros: { empresa: this.currentEmpresa, almacen: this.currentAlmacen, estado: this.currentStatus },
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', valorVacio: '', opciones: this.empresas.map(item => ({ valor: item.id, etiqueta: item.nombre })) },
          { clave: 'almacen', etiqueta: 'Almacén', icono: 'warehouse', valorVacio: '', opciones: this.almacenes.map(item => ({ valor: item.id, etiqueta: item.nombre })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', valorVacio: null, opciones: [{ valor: true, etiqueta: 'Activas' }, { valor: false, etiqueta: 'Inactivas' }] },
        ],
      },
    }).afterClosed().subscribe((resultado?: Record<string, ValorFiltroAdministracion>) => {
      if (!resultado) return;
      this.currentEmpresa = String(resultado['empresa'] || '');
      this.currentAlmacen = String(resultado['almacen'] || '');
      this.currentStatus = resultado['estado'] as boolean | null;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(CajasDialog, {
      width: '680px', panelClass: 'custom-dialog', data: {
        mode: 'add', empresas: this.empresas.filter(item => item.estado),
        almacenes: this.almacenes.filter(item => item.estado), cajas: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: CajaAdministracion) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      void this.guardar([{ ...resultado, id: this.siguienteId(), fechaCreacion: fecha, fechaActualizacion: fecha }, ...this.dataSource.data]);
    });
  }

  editar(caja: CajaAdministracion): void {
    this.dialog.open(CajasDialog, {
      width: '680px', panelClass: 'custom-dialog', data: {
        mode: 'edit', caja, empresas: this.empresas, almacenes: this.almacenes, cajas: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: CajaAdministracion) => {
      if (!resultado) return;
      const actualizado = { ...resultado, id: caja.id, fechaCreacion: caja.fechaCreacion,
        fechaActualizacion: new Date().toISOString().slice(0, 10) };
      void this.guardar(this.dataSource.data.map(actual => actual.id === caja.id ? actualizado : actual));
    });
  }

  desactivar(caja: CajaAdministracion): void {
    if (!caja.activa) return;
    this.dialog.open(ConfirmDialog, {
      width: '420px', data: {
        title: 'Desactivar caja',
        message: `¿Deseas desactivar “${caja.codigo}”? Ya no estará disponible para nuevas operaciones.`,
        confirmText: 'Desactivar', cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      void this.guardar(this.dataSource.data.map(actual => actual.id === caja.id
        ? { ...actual, activa: false, estatus: 'Fuera de servicio' as EstatusCaja,
          fechaActualizacion: new Date().toISOString().slice(0, 10) }
        : actual));
    });
  }

  nombreEmpresa(id: string): string {
    return this.empresas.find(item => item.id === id)?.nombre || 'Sin empresa';
  }

  nombreAlmacen(id: string): string {
    return this.almacenes.find(item => item.id === id)?.nombre || 'Sin almacén';
  }

  private async cargarCajas(): Promise<void> {
    try {
      const filas = await this.ventasTxt.leer<CajaDb>('cajas.txt');
      this.dataSource.data = filas.map(fila => ({
        id: fila.id_caja, empresaId: fila.id_empresa, almacenId: fila.id_almacen,
        codigo: fila.codigo, nombre: fila.nombre,
        estatus: this.esEstatus(fila.estatus) ? fila.estatus : 'Disponible',
        activa: fila.activo === '1', fechaCreacion: fila.fecha_creacion,
        fechaActualizacion: fila.fecha_actualizacion,
      }));
      this.setSort(this.currentSort);
    } catch (error: any) {
      this.snackBar.open(error?.message || 'No se pudo cargar el catálogo de cajas.', 'Cerrar', { duration: 7000 });
    }
  }

  private siguienteId(): string {
    return String(Math.max(0, ...this.dataSource.data.map(caja => Number(caja.id) || 0)) + 1);
  }

  private async guardar(cajas: CajaAdministracion[]): Promise<void> {
    if (this.guardando) return;
    const anteriores = this.dataSource.data;
    this.guardando = true;
    this.dataSource.data = [...cajas];
    this.setSort(this.currentSort);
    try {
      await this.ventasTxt.reemplazarVarias({ cajas: this.dataSource.data.map(caja => ({
        id_caja: caja.id, id_empresa: caja.empresaId, id_almacen: caja.almacenId,
        codigo: caja.codigo, nombre: caja.nombre, estatus: caja.estatus,
        activo: caja.activa ? '1' : '0', fecha_creacion: caja.fechaCreacion,
        fecha_actualizacion: caja.fechaActualizacion,
      })) });
      this.snackBar.open('Caja guardada correctamente en cajas.txt.', 'Cerrar', { duration: 3500 });
    } catch (error: any) {
      this.dataSource.data = anteriores;
      this.setSort(this.currentSort);
      const mensaje = error?.error?.error || error?.message || 'No se pudo guardar la caja.';
      this.snackBar.open(String(mensaje), 'Cerrar', { duration: 7000 });
    } finally {
      this.guardando = false;
    }
  }

  private esEstatus(valor: string): valor is EstatusCaja {
    return ['Disponible', 'En uso', 'Fuera de servicio'].includes(valor);
  }
}
