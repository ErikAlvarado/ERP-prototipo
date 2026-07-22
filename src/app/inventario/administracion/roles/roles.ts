import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  AdministracionDatos, EmpresaAdministracion, PermisoAdministracion,
  RolAdministracion, UsuarioAdministracion,
} from '../administracion-datos';
import { FiltrosAdministracionDialog, ValorFiltroAdministracion } from '../filtros-administracion-dialog/filtros-administracion-dialog';
import { RolesDialog } from './dialogs/roles-dialog/roles-dialog';

@Component({
  selector: 'app-roles',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './roles.html',
  styleUrls: ['../administracion-listas.css'],
})
export class Roles implements OnInit, AfterViewInit {
  displayedColumns = ['clave', 'nombre', 'empresa', 'descripcion', 'usuarios', 'permisos', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<RolAdministracion>([]);
  obs!: Observable<RolAdministracion[]>;
  empresas: EmpresaAdministracion[] = [];
  permisos: PermisoAdministracion[] = [];
  usuarios: UsuarioAdministracion[] = [];
  currentSearch = '';
  currentEmpresa = '';
  currentStatus: boolean | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private datos: AdministracionDatos) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (rol, filtro) => {
      const filtros = JSON.parse(filtro) as { search: string; empresa: string; status: boolean | null };
      const permisos = rol.permisoIds.map(id => this.permisos.find(permiso => permiso.id === id)?.nombre || '').join(' ');
      const texto = `${rol.id} ${rol.nombre} ${rol.descripcion} ${this.nombreEmpresa(rol.empresaId)} ${permisos}`.toLowerCase();
      return (!filtros.search || texto.includes(filtros.search)) &&
        (!filtros.empresa || rol.empresaId === filtros.empresa) &&
        (filtros.status === null || rol.estado === filtros.status);
    };
    this.obs = this.dataSource.connect();
    this.datos.cargar().subscribe(estado => {
      this.empresas = estado.empresas;
      this.permisos = estado.permisos;
      this.usuarios = estado.usuarios;
      this.dataSource.data = estado.roles;
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(), empresa: this.currentEmpresa, status: this.currentStatus,
    });
    this.dataSource.paginator?.firstPage();
  }

  setEmpresa(id: string): void { this.currentEmpresa = id; this.applyFilter(); }
  setStatus(estado: boolean | null): void { this.currentStatus = estado; this.applyFilter(); }

  get filtrosActivos(): number { return Number(!!this.currentEmpresa) + Number(this.currentStatus !== null); }

  abrirFiltros(): void {
    this.dialog.open(FiltrosAdministracionDialog, {
      width: '580px', panelClass: 'custom-dialog', data: {
        titulo: 'Filtrar roles',
        filtros: { empresa: this.currentEmpresa, estado: this.currentStatus },
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', valorVacio: '', opciones: this.empresas.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', valorVacio: null, opciones: [{ valor: true, etiqueta: 'Activos' }, { valor: false, etiqueta: 'Inactivos' }] },
        ],
      },
    }).afterClosed().subscribe((resultado?: Record<string, ValorFiltroAdministracion>) => {
      if (!resultado) return;
      this.currentEmpresa = String(resultado['empresa'] || '');
      this.currentStatus = resultado['estado'] as boolean | null;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(RolesDialog, {
      width: '680px', panelClass: 'custom-dialog',
      data: { mode: 'add', empresas: this.empresas, permisos: this.permisos, nombres: this.dataSource.data.map(rol => rol.nombre) },
    }).afterClosed().subscribe((resultado?: RolAdministracion) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      this.guardar([{ ...resultado, id: this.siguienteId(), fechaCreacion: fecha, fechaActualizacion: fecha }, ...this.dataSource.data]);
    });
  }

  editar(rol: RolAdministracion): void {
    this.dialog.open(RolesDialog, {
      width: '680px', panelClass: 'custom-dialog', data: {
        mode: 'edit', rol, empresas: this.empresas, permisos: this.permisos,
        nombres: this.dataSource.data.filter(actual => actual.id !== rol.id).map(actual => actual.nombre),
      },
    }).afterClosed().subscribe((resultado?: RolAdministracion) => {
      if (!resultado) return;
      const actualizado = { ...resultado, id: rol.id, fechaCreacion: rol.fechaCreacion, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      this.guardar(this.dataSource.data.map(actual => actual.id === rol.id ? actualizado : actual));
    });
  }

  eliminar(rol: RolAdministracion): void {
    const asignados = this.usuariosPorRol(rol.id);
    this.dialog.open(ConfirmDialog, {
      width: '430px', data: {
        title: 'Eliminar rol',
        message: asignados
          ? `¿Deseas eliminar "${rol.nombre}"? Se quitará este rol de ${asignados} usuario(s).`
          : `¿Deseas eliminar el rol "${rol.nombre}"?`,
        confirmText: 'Eliminar', cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) this.guardar(this.dataSource.data.filter(actual => actual.id !== rol.id));
    });
  }

  usuariosPorRol(id: string): number { return this.usuarios.filter(usuario => usuario.rolIds.includes(id)).length; }
  nombreEmpresa(id: string): string { return this.empresas.find(empresa => empresa.id === id)?.nombre || 'Sin empresa'; }

  private siguienteId(): string {
    return String(Math.max(0, ...this.dataSource.data.map(rol => Number(rol.id) || 0)) + 1);
  }

  private guardar(roles: RolAdministracion[]): void {
    this.datos.guardarRoles(roles);
    this.applyFilter();
  }
}
