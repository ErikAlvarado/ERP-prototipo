import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  AdministracionDatos, AlmacenAdministracion, EmpresaAdministracion,
  RolAdministracion, UsuarioAdministracion,
} from '../administracion-datos';
import { FiltrosAdministracionDialog, ValorFiltroAdministracion } from '../filtros-administracion-dialog/filtros-administracion-dialog';
import { UsuariosDialog } from './dialogs/usuarios-dialog/usuarios-dialog';

@Component({
  selector: 'app-usuarios',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './usuarios.html',
  styleUrls: ['../administracion-listas.css'],
})
export class Usuarios implements OnInit, AfterViewInit {
  displayedColumns = ['clave', 'nombre', 'correo', 'empresa', 'roles', 'almacen', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<UsuarioAdministracion>([]);
  obs!: Observable<UsuarioAdministracion[]>;
  empresas: EmpresaAdministracion[] = [];
  roles: RolAdministracion[] = [];
  almacenes: AlmacenAdministracion[] = [];
  currentSearch = '';
  currentEmpresa = '';
  currentRole = '';
  currentAlmacen = '';
  currentStatus: boolean | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private datos: AdministracionDatos) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (usuario, filtro) => {
      const filtros = JSON.parse(filtro) as { search: string; empresa: string; role: string; almacen: string; status: boolean | null };
      const texto = `${usuario.id} ${this.nombreCompleto(usuario)} ${usuario.email} ${usuario.telefono} ${this.nombreEmpresa(usuario.empresaId)} ${this.nombresRoles(usuario.rolIds)} ${this.nombreAlmacen(usuario.almacenId)}`.toLowerCase();
      return (!filtros.search || texto.includes(filtros.search)) &&
        (!filtros.empresa || usuario.empresaId === filtros.empresa) &&
        (!filtros.role || usuario.rolIds.includes(filtros.role)) &&
        (!filtros.almacen || usuario.almacenId === filtros.almacen) &&
        (filtros.status === null || usuario.estado === filtros.status);
    };
    this.obs = this.dataSource.connect();
    this.datos.cargar().subscribe(estado => {
      this.empresas = estado.empresas;
      this.roles = estado.roles;
      this.almacenes = estado.almacenes;
      this.dataSource.data = [...estado.usuarios].sort((a, b) => Number(a.id) - Number(b.id));
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(), empresa: this.currentEmpresa, role: this.currentRole,
      almacen: this.currentAlmacen, status: this.currentStatus,
    });
    this.dataSource.paginator?.firstPage();
  }

  setEmpresa(id: string): void { this.currentEmpresa = id; this.applyFilter(); }
  setRole(id: string): void { this.currentRole = id; this.applyFilter(); }
  setAlmacen(id: string): void { this.currentAlmacen = id; this.applyFilter(); }
  setStatus(estado: boolean | null): void { this.currentStatus = estado; this.applyFilter(); }

  get filtrosActivos(): number {
    return Number(!!this.currentEmpresa) + Number(!!this.currentRole) + Number(!!this.currentAlmacen) + Number(this.currentStatus !== null);
  }

  abrirFiltros(): void {
    this.dialog.open(FiltrosAdministracionDialog, {
      width: '640px', panelClass: 'custom-dialog', data: {
        titulo: 'Filtrar usuarios',
        filtros: { empresa: this.currentEmpresa, rol: this.currentRole, almacen: this.currentAlmacen, estado: this.currentStatus },
        campos: [
          { clave: 'empresa', etiqueta: 'Empresa', icono: 'business', valorVacio: '', opciones: this.empresas.map(empresa => ({ valor: empresa.id, etiqueta: empresa.nombre })) },
          { clave: 'rol', etiqueta: 'Rol', icono: 'badge', valorVacio: '', opciones: this.roles.map(rol => ({ valor: rol.id, etiqueta: rol.nombre })) },
          { clave: 'almacen', etiqueta: 'Almacén', icono: 'warehouse', valorVacio: '', opciones: this.almacenes.map(almacen => ({ valor: almacen.id, etiqueta: almacen.nombre })) },
          { clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', valorVacio: null, opciones: [{ valor: true, etiqueta: 'Activos' }, { valor: false, etiqueta: 'Inactivos' }] },
        ],
      },
    }).afterClosed().subscribe((resultado?: Record<string, ValorFiltroAdministracion>) => {
      if (!resultado) return;
      this.currentEmpresa = String(resultado['empresa'] || '');
      this.currentRole = String(resultado['rol'] || '');
      this.currentAlmacen = String(resultado['almacen'] || '');
      this.currentStatus = resultado['estado'] as boolean | null;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(UsuariosDialog, {
      width: '760px', panelClass: 'custom-dialog', data: {
        mode: 'add', empresas: this.empresas, roles: this.roles, almacenes: this.almacenes,
        emails: this.dataSource.data.map(usuario => usuario.email),
      },
    }).afterClosed().subscribe((resultado?: UsuarioAdministracion) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      this.guardar([{ ...resultado, id: this.siguienteId(), fechaCreacion: fecha, fechaActualizacion: fecha }, ...this.dataSource.data]);
    });
  }

  editar(usuario: UsuarioAdministracion): void {
    this.dialog.open(UsuariosDialog, {
      width: '760px', panelClass: 'custom-dialog', data: {
        mode: 'edit', usuario, empresas: this.empresas, roles: this.roles, almacenes: this.almacenes,
        emails: this.dataSource.data.filter(actual => actual.id !== usuario.id).map(actual => actual.email),
      },
    }).afterClosed().subscribe((resultado?: UsuarioAdministracion) => {
      if (!resultado) return;
      const actualizado = { ...resultado, id: usuario.id, fechaCreacion: usuario.fechaCreacion, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      this.guardar(this.dataSource.data.map(actual => actual.id === usuario.id ? actualizado : actual));
    });
  }

  eliminar(usuario: UsuarioAdministracion): void {
    this.dialog.open(ConfirmDialog, {
      width: '400px', data: {
        title: 'Eliminar usuario', message: `¿Deseas eliminar a "${this.nombreCompleto(usuario)}"?`,
        confirmText: 'Eliminar', cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) this.guardar(this.dataSource.data.filter(actual => actual.id !== usuario.id));
    });
  }

  nombreCompleto(usuario: UsuarioAdministracion): string {
    return [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno].filter(Boolean).join(' ');
  }

  nombreEmpresa(id: string): string { return this.empresas.find(empresa => empresa.id === id)?.nombre || 'Sin empresa'; }
  nombreAlmacen(id: string): string { return this.almacenes.find(almacen => almacen.id === id)?.nombre || 'Sin almacén'; }
  nombreRol(id: string): string { return this.roles.find(rol => rol.id === id)?.nombre || 'Rol no disponible'; }
  nombresRoles(ids: string[]): string { return ids.map(id => this.nombreRol(id)).join(', ') || 'Sin rol'; }

  private siguienteId(): string {
    return String(Math.max(0, ...this.dataSource.data.map(usuario => Number(usuario.id) || 0)) + 1);
  }

  private guardar(usuarios: UsuarioAdministracion[]): void {
    this.datos.guardarUsuarios(usuarios);
    this.applyFilter();
  }
}
