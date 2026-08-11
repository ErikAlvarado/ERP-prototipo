import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  AdministracionDatos, AlmacenAdministracion, EmpresaAdministracion, UsuarioAdministracion,
} from '../administracion-datos';
import { FiltrosAdministracionDialog, ValorFiltroAdministracion } from '../filtros-administracion-dialog/filtros-administracion-dialog';
import { AlmacenesDialog } from './dialogs/almacenes-dialog/almacenes-dialog';

@Component({
  selector: 'app-almacenes',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './almacenes.html',
  styleUrls: ['../administracion-listas.css'],
})
export class Almacenes implements OnInit, AfterViewInit {
  displayedColumns = ['id', 'nombre', 'empresa', 'direccion', 'principal', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<AlmacenAdministracion>([]);
  obs!: Observable<AlmacenAdministracion[]>;
  empresas: EmpresaAdministracion[] = [];
  usuarios: UsuarioAdministracion[] = [];
  currentSearch = '';
  currentEmpresa = '';
  currentStatus: boolean | null = null;
  currentPrincipal: boolean | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private datos: AdministracionDatos) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (almacen, filtro) => {
      const filtros = JSON.parse(filtro) as { search: string; empresa: string; status: boolean | null; principal: boolean | null };
      const texto = `${almacen.id} ${almacen.nombre} ${almacen.direccion} ${this.nombreEmpresa(almacen.empresaId)}`.toLowerCase();
      return (!filtros.search || texto.includes(filtros.search)) &&
        (!filtros.empresa || almacen.empresaId === filtros.empresa) &&
        (filtros.status === null || almacen.estado === filtros.status) &&
        (filtros.principal === null || almacen.principal === filtros.principal);
    };
    this.obs = this.dataSource.connect();
    this.datos.cargar().subscribe(estado => {
      this.empresas = estado.empresas;
      this.usuarios = estado.usuarios;
      this.dataSource.data = [...estado.almacenes].sort((a, b) => Number(a.id) - Number(b.id));
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(), empresa: this.currentEmpresa,
      status: this.currentStatus, principal: this.currentPrincipal,
    });
    this.dataSource.paginator?.firstPage();
  }

  setEmpresa(id: string): void { this.currentEmpresa = id; this.applyFilter(); }
  setStatus(estado: boolean | null): void { this.currentStatus = estado; this.applyFilter(); }
  setPrincipal(principal: boolean | null): void { this.currentPrincipal = principal; this.applyFilter(); }

  get filtrosActivos(): number {
    return Number(!!this.currentEmpresa) + Number(this.currentStatus !== null) + Number(this.currentPrincipal !== null);
  }

  abrirFiltros(): void {
    this.dialog.open(FiltrosAdministracionDialog, {
      width: '600px', panelClass: 'custom-dialog', data: {
        titulo: 'Filtrar almacenes',
        filtros: { empresa: this.currentEmpresa, principal: this.currentPrincipal, estado: this.currentStatus },
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', valorVacio: '', opciones: this.empresas.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'principal', etiqueta: 'Principal', icono: 'star', valorVacio: null, opciones: [{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }] },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', valorVacio: null, opciones: [{ valor: true, etiqueta: 'Activos' }, { valor: false, etiqueta: 'Inactivos' }] },
        ],
      },
    }).afterClosed().subscribe((resultado?: Record<string, ValorFiltroAdministracion>) => {
      if (!resultado) return;
      this.currentEmpresa = String(resultado['empresa'] || '');
      this.currentPrincipal = resultado['principal'] as boolean | null;
      this.currentStatus = resultado['estado'] as boolean | null;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(AlmacenesDialog, {
      width: '650px', panelClass: 'custom-dialog', data: {
        mode: 'add', empresas: this.empresas.filter(empresa => empresa.estado), almacenes: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: AlmacenAdministracion) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      this.guardar([{ ...resultado, id: this.siguienteId(), fechaCreacion: fecha, fechaActualizacion: fecha }, ...this.dataSource.data]);
    });
  }

  editar(almacen: AlmacenAdministracion): void {
    this.dialog.open(AlmacenesDialog, {
      width: '650px', panelClass: 'custom-dialog', data: {
        mode: 'edit', almacen, empresas: this.empresas, almacenes: this.dataSource.data,
      },
    }).afterClosed().subscribe((resultado?: AlmacenAdministracion) => {
      if (!resultado) return;
      const actualizado = { ...resultado, id: almacen.id, fechaCreacion: almacen.fechaCreacion, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      this.guardar(this.aplicarPrincipalUnico(actualizado,
        this.dataSource.data.map(actual => actual.id === almacen.id ? actualizado : actual)));
    });
  }

  desactivar(almacen: AlmacenAdministracion): void {
    if (!almacen.estado) return;
    const usuariosAsignados = this.usuarios.filter(usuario => usuario.almacenId === almacen.id).length;
    this.dialog.open(ConfirmDialog, {
      width: '400px', data: {
        title: 'Desactivar almacén',
        message: usuariosAsignados
          ? `Se desactivará “${almacen.nombre}” y se quitará como almacén predeterminado de ${usuariosAsignados} usuario(s).`
          : `¿Deseas desactivar “${almacen.nombre}”?`,
        confirmText: 'Desactivar', cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.guardar(this.dataSource.data.map(actual =>
          actual.id === almacen.id ? { ...actual, estado: false, principal: false } : actual));
      }
    });
  }

  nombreEmpresa(id: string): string {
    return this.empresas.find(empresa => empresa.id === id)?.nombre || 'Sin empresa';
  }

  private siguienteId(): string {
    return String(Math.max(0, ...this.dataSource.data.map(almacen => Number(almacen.id) || 0)) + 1);
  }

  private guardar(almacenes: AlmacenAdministracion[]): void {
    this.datos.guardarAlmacenes(almacenes);
    this.applyFilter();
  }

  private aplicarPrincipalUnico(
    seleccionado: AlmacenAdministracion,
    almacenes: AlmacenAdministracion[],
  ): AlmacenAdministracion[] {
    if (!seleccionado.principal || !seleccionado.estado) return almacenes;
    return almacenes.map(almacen =>
      almacen.id !== seleccionado.id && almacen.empresaId === seleccionado.empresaId && almacen.principal
        ? { ...almacen, principal: false }
        : almacen);
  }
}
