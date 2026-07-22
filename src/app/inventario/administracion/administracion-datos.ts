import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, ReplaySubject, shareReplay, switchMap, tap } from 'rxjs';
import { DatosDb } from '../../shared/services/datos-db';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';

export interface EmpresaAdministracion {
  id: string;
  nombre: string;
  razonSocial: string;
  rfc: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface AlmacenAdministracion {
  id: string;
  empresaId: string;
  nombre: string;
  direccion: string;
  principal: boolean;
  estado: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface RolAdministracion {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
  permisoIds: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface UsuarioAdministracion {
  id: string;
  empresaId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  email: string;
  telefono: string;
  estado: boolean;
  ultimoAcceso: string;
  intentosFallidos: number;
  fechaBloqueo: string;
  almacenId: string;
  rolIds: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface PermisoAdministracion {
  id: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  accion: string;
}

export interface EstadoAdministracion {
  empresas: EmpresaAdministracion[];
  almacenes: AlmacenAdministracion[];
  roles: RolAdministracion[];
  usuarios: UsuarioAdministracion[];
  permisos: PermisoAdministracion[];
}

interface ConId { id: string; }
interface CambiosLocales<T> { modificados: Record<string, T>; eliminados: string[]; }

interface EmpresaDb { id_empresa: string; nombre_empresa: string; razon_social: string; rfc: string; direccion: string; telefono: string; email: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; }
interface AlmacenDb { id_almacen: string; id_empresa: string; nombre_almacen: string; direccion: string; es_principal: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; }
interface RolDb { id_rol: string; id_empresa: string; nombre: string; descripcion: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; }
interface UsuarioDb { id_usuario: string; id_empresa: string; nombres: string; apellido_paterno: string; apellido_materno: string; fecha_nacimiento: string; email: string; telefono: string; activo: string; ultimo_acceso: string; intentos_fallidos: string; fecha_bloqueo: string; id_almacen_defecto: string; fecha_creacion: string; fecha_actualizacion: string; }
interface UsuarioRolDb { id_usuario: string; id_rol: string; activo: string; }
interface RolPermisoDb { id_rol: string; id_permiso: string; }
interface PermisoDb { id_permiso: string; nombre: string; modulo: string; descripcion: string; accion: string; }

@Injectable({ providedIn: 'root' })
export class AdministracionDatos {
  private readonly claves = {
    empresas: 'administracion-empresas-cambios-v1',
    almacenes: 'administracion-almacenes-cambios-v1',
    roles: 'administracion-roles-cambios-v1',
    usuarios: 'administracion-usuarios-cambios-v1',
  };

  private readonly cambios$ = new ReplaySubject<EstadoAdministracion>(1);
  private estado?: EstadoAdministracion;
  private base?: EstadoAdministracion;

  private readonly carga$: Observable<EstadoAdministracion>;

  constructor(private db: DatosDb, private persistencia: PersistenciaLocal) {
    this.carga$ = forkJoin({
      empresas: this.db.leer<EmpresaDb>('empresas.txt'),
      almacenes: this.db.leer<AlmacenDb>('almacenes.txt'),
      roles: this.db.leer<RolDb>('roles.txt'),
      usuarios: this.db.leer<UsuarioDb>('usuarios.txt'),
      usuarioRoles: this.db.leer<UsuarioRolDb>('usuario_roles.txt'),
      rolesPermisos: this.db.leer<RolPermisoDb>('roles_permisos.txt'),
      permisos: this.db.leer<PermisoDb>('permisos.txt'),
    }).pipe(
      map(datos => this.mapear(datos)),
      tap(base => {
        this.base = base;
        this.estado = {
          empresas: this.aplicarCambios(base.empresas, this.claves.empresas),
          almacenes: this.aplicarCambios(base.almacenes, this.claves.almacenes),
          roles: this.aplicarCambios(base.roles, this.claves.roles),
          usuarios: this.aplicarCambios(base.usuarios, this.claves.usuarios),
          permisos: base.permisos,
        };
        this.cambios$.next(this.estado);
      }),
      shareReplay(1),
    );
  }

  cargar(): Observable<EstadoAdministracion> {
    return this.carga$.pipe(switchMap(() => this.cambios$));
  }

  guardarEmpresas(empresas: EmpresaAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const ids = new Set(empresas.map(empresa => empresa.id));
    const almacenes = this.estado.almacenes.map(almacen => ids.has(almacen.empresaId) ? almacen : { ...almacen, empresaId: '' });
    const roles = this.estado.roles.map(rol => ids.has(rol.empresaId) ? rol : { ...rol, empresaId: '' });
    const usuarios = this.estado.usuarios.map(usuario => ids.has(usuario.empresaId) ? usuario : { ...usuario, empresaId: '' });
    this.actualizar({ empresas, almacenes, roles, usuarios });
    this.persistir(this.claves.empresas, empresas, this.base.empresas);
    this.persistir(this.claves.almacenes, almacenes, this.base.almacenes);
    this.persistir(this.claves.roles, roles, this.base.roles);
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  guardarAlmacenes(almacenes: AlmacenAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const ids = new Set(almacenes.map(almacen => almacen.id));
    const usuarios = this.estado.usuarios.map(usuario => ids.has(usuario.almacenId) ? usuario : { ...usuario, almacenId: '' });
    this.actualizar({ almacenes, usuarios });
    this.persistir(this.claves.almacenes, almacenes, this.base.almacenes);
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  guardarRoles(roles: RolAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const ids = new Set(roles.map(rol => rol.id));
    const usuarios = this.estado.usuarios.map(usuario => ({ ...usuario, rolIds: usuario.rolIds.filter(id => ids.has(id)) }));
    this.actualizar({ roles, usuarios });
    this.persistir(this.claves.roles, roles, this.base.roles);
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  guardarUsuarios(usuarios: UsuarioAdministracion[]): void {
    if (!this.estado || !this.base) return;
    this.actualizar({ usuarios });
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  private actualizar(cambio: Partial<EstadoAdministracion>): void {
    if (!this.estado) return;
    this.estado = { ...this.estado, ...cambio };
    this.cambios$.next(this.estado);
  }

  private mapear(datos: {
    empresas: EmpresaDb[]; almacenes: AlmacenDb[]; roles: RolDb[]; usuarios: UsuarioDb[];
    usuarioRoles: UsuarioRolDb[]; rolesPermisos: RolPermisoDb[]; permisos: PermisoDb[];
  }): EstadoAdministracion {
    return {
      empresas: datos.empresas.map(empresa => ({
        id: empresa.id_empresa, nombre: empresa.nombre_empresa, razonSocial: empresa.razon_social,
        rfc: empresa.rfc, direccion: empresa.direccion, telefono: empresa.telefono, email: empresa.email,
        estado: empresa.activo === '1', fechaCreacion: empresa.fecha_creacion, fechaActualizacion: empresa.fecha_actualizacion,
      })),
      almacenes: datos.almacenes.map(almacen => ({
        id: almacen.id_almacen, empresaId: almacen.id_empresa, nombre: almacen.nombre_almacen,
        direccion: almacen.direccion, principal: almacen.es_principal === '1', estado: almacen.activo === '1',
        fechaCreacion: almacen.fecha_creacion, fechaActualizacion: almacen.fecha_actualizacion,
      })),
      roles: datos.roles.map(rol => ({
        id: rol.id_rol, empresaId: rol.id_empresa, nombre: rol.nombre, descripcion: rol.descripcion,
        estado: rol.activo === '1', permisoIds: datos.rolesPermisos.filter(relacion => relacion.id_rol === rol.id_rol).map(relacion => relacion.id_permiso),
        fechaCreacion: rol.fecha_creacion, fechaActualizacion: rol.fecha_actualizacion,
      })),
      usuarios: datos.usuarios.map(usuario => ({
        id: usuario.id_usuario, empresaId: usuario.id_empresa, nombres: usuario.nombres,
        apellidoPaterno: usuario.apellido_paterno, apellidoMaterno: usuario.apellido_materno,
        fechaNacimiento: usuario.fecha_nacimiento, email: usuario.email, telefono: usuario.telefono,
        estado: usuario.activo === '1', ultimoAcceso: usuario.ultimo_acceso,
        intentosFallidos: Number(usuario.intentos_fallidos) || 0, fechaBloqueo: usuario.fecha_bloqueo,
        almacenId: usuario.id_almacen_defecto,
        rolIds: datos.usuarioRoles.filter(relacion => relacion.id_usuario === usuario.id_usuario && relacion.activo === '1').map(relacion => relacion.id_rol),
        fechaCreacion: usuario.fecha_creacion, fechaActualizacion: usuario.fecha_actualizacion,
      })),
      permisos: datos.permisos.map(permiso => ({
        id: permiso.id_permiso, nombre: permiso.nombre, modulo: permiso.modulo,
        descripcion: permiso.descripcion, accion: permiso.accion,
      })),
    };
  }

  private aplicarCambios<T extends ConId>(base: T[], clave: string): T[] {
    const cambios = this.persistencia.leer<CambiosLocales<T>>(clave, { modificados: {}, eliminados: [] });
    const eliminados = new Set(cambios.eliminados);
    const resultado = base
      .filter(elemento => !eliminados.has(elemento.id))
      .map(elemento => cambios.modificados[elemento.id] ?? elemento);
    const idsBase = new Set(base.map(elemento => elemento.id));
    Object.values(cambios.modificados).forEach(elemento => {
      if (!idsBase.has(elemento.id) && !eliminados.has(elemento.id)) resultado.push(elemento);
    });
    return resultado;
  }

  private persistir<T extends ConId>(clave: string, actuales: T[], base: T[]): void {
    const basePorId = new Map(base.map(elemento => [elemento.id, elemento]));
    const actualesPorId = new Map(actuales.map(elemento => [elemento.id, elemento]));
    const modificados: Record<string, T> = {};
    actuales.forEach(elemento => {
      const original = basePorId.get(elemento.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(elemento)) modificados[elemento.id] = elemento;
    });
    const eliminados = base.filter(elemento => !actualesPorId.has(elemento.id)).map(elemento => elemento.id);
    this.persistencia.guardar<CambiosLocales<T>>(clave, { modificados, eliminados });
  }
}
