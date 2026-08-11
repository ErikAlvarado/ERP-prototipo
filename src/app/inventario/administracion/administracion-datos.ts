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
  creadoPorUsuarioId: string;
  actualizadoPorUsuarioId: string;
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
  creadoPorUsuarioId: string;
  actualizadoPorUsuarioId: string;
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
  creadoPorUsuarioId: string;
  actualizadoPorUsuarioId: string;
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
  creadoPorUsuarioId: string;
  actualizadoPorUsuarioId: string;
}

export interface PermisoAdministracion {
  id: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  accion: string;
}

export interface UsuarioRolAdministracion {
  id: string;
  usuarioId: string;
  rolId: string;
  fechaAsignacion: string;
  fechaFin: string;
  estado: boolean;
  asignadoPorUsuarioId: string;
}

export interface RolPermisoAdministracion {
  rolId: string;
  permisoId: string;
}

export interface EstadoAdministracion {
  empresas: EmpresaAdministracion[];
  almacenes: AlmacenAdministracion[];
  roles: RolAdministracion[];
  usuarios: UsuarioAdministracion[];
  permisos: PermisoAdministracion[];
  usuarioRoles: UsuarioRolAdministracion[];
  rolesPermisos: RolPermisoAdministracion[];
}

interface ConId { id: string; }
interface ConAuditoria extends ConId {
  estado: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  creadoPorUsuarioId: string;
  actualizadoPorUsuarioId: string;
}
interface CambiosLocales<T> { modificados: Record<string, Partial<T>>; eliminados: string[]; }

interface EmpresaDb { id_empresa: string; nombre_empresa: string; razon_social: string; rfc: string; direccion: string; telefono: string; email: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; creado_por_usuario: string; actualizado_por_usuario: string; }
interface AlmacenDb { id_almacen: string; id_empresa: string; nombre_almacen: string; direccion: string; es_principal: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; creado_por_usuario: string; actualizado_por_usuario: string; }
interface RolDb { id_rol: string; id_empresa: string; nombre: string; descripcion: string; activo: string; fecha_creacion: string; fecha_actualizacion: string; creado_por_usuario: string; actualizado_por_usuario: string; }
interface UsuarioDb { id_usuario: string; id_empresa: string; nombres: string; apellido_paterno: string; apellido_materno: string; fecha_nacimiento: string; email: string; telefono: string; activo: string; ultimo_acceso: string; intentos_fallidos: string; fecha_bloqueo: string; id_almacen_defecto: string; fecha_creacion: string; fecha_actualizacion: string; creado_por_usuario: string; actualizado_por_usuario: string; }
interface UsuarioRolDb { id_usuario_rol: string; id_usuario: string; id_rol: string; fecha_asignacion: string; fecha_fin: string; activo: string; asignado_por_usuario: string; }
interface RolPermisoDb { id_rol: string; id_permiso: string; }
interface PermisoDb { id_permiso: string; nombre: string; modulo: string; descripcion: string; accion: string; }

@Injectable({ providedIn: 'root' })
export class AdministracionDatos {
  private readonly claves = {
    empresas: 'administracion-empresas-cambios-v1',
    almacenes: 'administracion-almacenes-cambios-v1',
    roles: 'administracion-roles-cambios-v1',
    usuarios: 'administracion-usuarios-cambios-v1',
    usuarioRoles: 'administracion-usuario-roles-v1',
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
        const estadoConCambios: EstadoAdministracion = {
          empresas: this.aplicarCambios(base.empresas, this.claves.empresas),
          almacenes: this.normalizarPrincipales(
            this.aplicarCambios(base.almacenes, this.claves.almacenes),
          ),
          roles: this.aplicarCambios(base.roles, this.claves.roles),
          usuarios: this.aplicarCambios(base.usuarios, this.claves.usuarios),
          permisos: base.permisos,
          usuarioRoles: this.persistencia.leer<UsuarioRolAdministracion[]>(
            this.claves.usuarioRoles,
            base.usuarioRoles,
          ),
          rolesPermisos: base.rolesPermisos,
        };
        this.estado = this.normalizarRelaciones(estadoConCambios);
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
    const empresasSeguras = this.prepararCambios(this.estado.empresas, empresas);
    const activas = new Set(empresasSeguras.filter(empresa => empresa.estado).map(empresa => empresa.id));
    const almacenes = this.normalizarPrincipales(this.estado.almacenes.map(almacen =>
      activas.has(almacen.empresaId) || !almacen.estado ? almacen : this.marcarDesactivado(almacen)));
    const roles = this.estado.roles.map(rol =>
      activas.has(rol.empresaId) || !rol.estado ? rol : this.marcarDesactivado(rol));
    const usuarios = this.estado.usuarios.map(usuario =>
      activas.has(usuario.empresaId) || !usuario.estado ? usuario : this.marcarDesactivado(usuario));
    this.actualizar(this.normalizarRelaciones({ ...this.estado, empresas: empresasSeguras, almacenes, roles, usuarios }));
    this.persistir(this.claves.empresas, empresasSeguras, this.base.empresas);
    this.persistir(this.claves.almacenes, almacenes, this.base.almacenes);
    this.persistir(this.claves.roles, roles, this.base.roles);
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  guardarAlmacenes(almacenes: AlmacenAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const empresas = new Set(this.estado.empresas.map(empresa => empresa.id));
    const validos = almacenes.filter(almacen => empresas.has(almacen.empresaId));
    const preparados = this.normalizarPrincipales(this.prepararCambios(this.estado.almacenes, validos));
    const inactivos = new Set(preparados.filter(almacen => !almacen.estado).map(almacen => almacen.id));
    const usuarios = this.prepararCambios(this.estado.usuarios, this.estado.usuarios.map(usuario =>
      inactivos.has(usuario.almacenId) ? { ...usuario, almacenId: '' } : usuario));
    this.actualizar(this.normalizarRelaciones({ ...this.estado, almacenes: preparados, usuarios }));
    this.persistir(this.claves.almacenes, preparados, this.base.almacenes);
    this.persistir(this.claves.usuarios, usuarios, this.base.usuarios);
  }

  guardarRoles(roles: RolAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const empresas = new Set(this.estado.empresas.map(empresa => empresa.id));
    const validos = roles.filter(rol => empresas.has(rol.empresaId)).map(rol => ({
      ...rol,
      permisoIds: [...new Set(rol.permisoIds.filter(id => this.estado?.permisos.some(permiso => permiso.id === id)))],
    }));
    const preparados = this.prepararCambios(this.estado.roles, validos);
    const estadoActualizado = this.normalizarRelaciones({ ...this.estado, roles: preparados });
    this.actualizar(estadoActualizado);
    this.persistir(this.claves.roles, preparados, this.base.roles);
    this.persistencia.guardar(this.claves.usuarioRoles, estadoActualizado.usuarioRoles);
  }

  guardarUsuarios(usuarios: UsuarioAdministracion[]): void {
    if (!this.estado || !this.base) return;
    const empresas = new Set(this.estado.empresas.map(empresa => empresa.id));
    const validos = usuarios.filter(usuario => empresas.has(usuario.empresaId)).map(usuario => ({
      ...usuario,
      almacenId: this.estado?.almacenes.some(almacen =>
        almacen.id === usuario.almacenId && almacen.empresaId === usuario.empresaId) ? usuario.almacenId : '',
      rolIds: [...new Set(usuario.rolIds.filter(id => this.estado?.roles.some(rol =>
        rol.id === id && rol.empresaId === usuario.empresaId)))],
    }));
    const preparados = this.prepararCambios(this.estado.usuarios, validos);
    const estadoActualizado = this.normalizarRelaciones({ ...this.estado, usuarios: preparados });
    this.actualizar(estadoActualizado);
    this.persistir(this.claves.usuarios, preparados, this.base.usuarios);
    this.persistencia.guardar(this.claves.usuarioRoles, estadoActualizado.usuarioRoles);
  }

  private actualizar(estado: EstadoAdministracion): void {
    this.estado = estado;
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
        creadoPorUsuarioId: empresa.creado_por_usuario, actualizadoPorUsuarioId: empresa.actualizado_por_usuario,
      })),
      almacenes: datos.almacenes.map(almacen => ({
        id: almacen.id_almacen, empresaId: almacen.id_empresa, nombre: almacen.nombre_almacen,
        direccion: almacen.direccion, principal: almacen.es_principal === '1', estado: almacen.activo === '1',
        fechaCreacion: almacen.fecha_creacion, fechaActualizacion: almacen.fecha_actualizacion,
        creadoPorUsuarioId: almacen.creado_por_usuario, actualizadoPorUsuarioId: almacen.actualizado_por_usuario,
      })),
      roles: datos.roles.map(rol => ({
        id: rol.id_rol, empresaId: rol.id_empresa, nombre: rol.nombre, descripcion: rol.descripcion,
        estado: rol.activo === '1', permisoIds: datos.rolesPermisos.filter(relacion => relacion.id_rol === rol.id_rol).map(relacion => relacion.id_permiso),
        fechaCreacion: rol.fecha_creacion, fechaActualizacion: rol.fecha_actualizacion,
        creadoPorUsuarioId: rol.creado_por_usuario, actualizadoPorUsuarioId: rol.actualizado_por_usuario,
      })),
      usuarios: datos.usuarios.map(usuario => ({
        id: usuario.id_usuario, empresaId: usuario.id_empresa, nombres: usuario.nombres,
        apellidoPaterno: usuario.apellido_paterno, apellidoMaterno: usuario.apellido_materno,
        fechaNacimiento: usuario.fecha_nacimiento, email: usuario.email, telefono: usuario.telefono,
        estado: usuario.activo === '1', ultimoAcceso: usuario.ultimo_acceso,
        intentosFallidos: Number(usuario.intentos_fallidos) || 0, fechaBloqueo: usuario.fecha_bloqueo,
        almacenId: usuario.id_almacen_defecto,
        rolIds: datos.usuarioRoles.filter(relacion =>
          relacion.id_usuario === usuario.id_usuario && this.relacionVigente(relacion)).map(relacion => relacion.id_rol),
        fechaCreacion: usuario.fecha_creacion, fechaActualizacion: usuario.fecha_actualizacion,
        creadoPorUsuarioId: usuario.creado_por_usuario, actualizadoPorUsuarioId: usuario.actualizado_por_usuario,
      })),
      permisos: datos.permisos.map(permiso => ({
        id: permiso.id_permiso, nombre: permiso.nombre, modulo: permiso.modulo,
        descripcion: permiso.descripcion, accion: permiso.accion,
      })),
      usuarioRoles: datos.usuarioRoles.map(relacion => ({
        id: relacion.id_usuario_rol, usuarioId: relacion.id_usuario, rolId: relacion.id_rol,
        fechaAsignacion: relacion.fecha_asignacion, fechaFin: relacion.fecha_fin,
        estado: relacion.activo === '1', asignadoPorUsuarioId: relacion.asignado_por_usuario,
      })),
      rolesPermisos: datos.rolesPermisos.map(relacion => ({
        rolId: relacion.id_rol, permisoId: relacion.id_permiso,
      })),
    };
  }

  private aplicarCambios<T extends ConAuditoria>(base: T[], clave: string): T[] {
    const cambios = this.persistencia.leer<CambiosLocales<T>>(clave, { modificados: {}, eliminados: [] });
    const eliminados = new Set(cambios.eliminados);
    const resultado = base
      .map(elemento => {
        const modificado = cambios.modificados[elemento.id];
        if (modificado) return { ...elemento, ...modificado };
        return eliminados.has(elemento.id) ? { ...elemento, estado: false } : elemento;
      });
    const idsBase = new Set(base.map(elemento => elemento.id));
    Object.values(cambios.modificados).forEach(elemento => {
      if (elemento.id && !idsBase.has(elemento.id) && !eliminados.has(elemento.id)) {
        resultado.push(elemento as T);
      }
    });
    return resultado;
  }

  private persistir<T extends ConAuditoria>(clave: string, actuales: T[], base: T[]): void {
    const basePorId = new Map(base.map(elemento => [elemento.id, elemento]));
    const modificados: Record<string, T> = {};
    actuales.forEach(elemento => {
      const original = basePorId.get(elemento.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(elemento)) modificados[elemento.id] = elemento;
    });
    this.persistencia.guardar<CambiosLocales<T>>(clave, { modificados, eliminados: [] });
  }

  private prepararCambios<T extends ConAuditoria>(anteriores: T[], solicitados: T[]): T[] {
    const fecha = this.fechaActual();
    const actor = this.usuarioActualId();
    const solicitadosPorId = new Map(solicitados.map(elemento => [elemento.id, elemento]));
    const resultado = solicitados.map(elemento => {
      const anterior = anteriores.find(actual => actual.id === elemento.id);
      if (!anterior) {
        return {
          ...elemento,
          fechaCreacion: elemento.fechaCreacion || fecha,
          fechaActualizacion: fecha,
          creadoPorUsuarioId: elemento.creadoPorUsuarioId || actor,
          actualizadoPorUsuarioId: actor || elemento.actualizadoPorUsuarioId,
        };
      }
      const comparableAnterior = { ...anterior, fechaActualizacion: '', actualizadoPorUsuarioId: '' };
      const comparableNuevo = { ...elemento, fechaActualizacion: '', actualizadoPorUsuarioId: '' };
      if (JSON.stringify(comparableAnterior) === JSON.stringify(comparableNuevo)) return anterior;
      return {
        ...elemento,
        fechaCreacion: anterior.fechaCreacion,
        creadoPorUsuarioId: anterior.creadoPorUsuarioId,
        fechaActualizacion: fecha,
        actualizadoPorUsuarioId: actor || anterior.actualizadoPorUsuarioId,
      };
    });
    anteriores.filter(elemento => !solicitadosPorId.has(elemento.id)).forEach(elemento => {
      resultado.push(this.marcarDesactivado(elemento));
    });
    return resultado;
  }

  private marcarDesactivado<T extends ConAuditoria>(elemento: T): T {
    if (!elemento.estado) return elemento;
    return {
      ...elemento,
      estado: false,
      fechaActualizacion: this.fechaActual(),
      actualizadoPorUsuarioId: this.usuarioActualId() || elemento.actualizadoPorUsuarioId,
    };
  }

  private normalizarPrincipales(almacenes: AlmacenAdministracion[]): AlmacenAdministracion[] {
    const principales = new Set<string>();
    return almacenes.map(almacen => {
      if (!almacen.estado && almacen.principal) {
        return {
          ...almacen,
          principal: false,
          fechaActualizacion: this.fechaActual(),
          actualizadoPorUsuarioId: this.usuarioActualId() || almacen.actualizadoPorUsuarioId,
        };
      }
      if (!almacen.principal) return almacen;
      if (!principales.has(almacen.empresaId)) {
        principales.add(almacen.empresaId);
        return almacen;
      }
      return {
        ...almacen,
        principal: false,
        fechaActualizacion: this.fechaActual(),
        actualizadoPorUsuarioId: this.usuarioActualId() || almacen.actualizadoPorUsuarioId,
      };
    });
  }

  private normalizarRelaciones(estado: EstadoAdministracion): EstadoAdministracion {
    const rolesPorId = new Map(estado.roles.map(rol => [rol.id, rol]));
    const permisos = new Set(estado.permisos.map(permiso => permiso.id));
    const usuarios = estado.usuarios.map(usuario => ({
      ...usuario,
      almacenId: estado.almacenes.some(almacen =>
        almacen.id === usuario.almacenId && almacen.empresaId === usuario.empresaId) ? usuario.almacenId : '',
      rolIds: [...new Set(usuario.rolIds.filter(id => rolesPorId.get(id)?.empresaId === usuario.empresaId))],
    }));
    const roles = estado.roles.map(rol => ({
      ...rol,
      permisoIds: [...new Set(rol.permisoIds.filter(id => permisos.has(id)))],
    }));

    const hoy = this.fechaActual();
    const relacionesActivas = new Set<string>();
    const usuarioRoles = [...estado.usuarioRoles];
    let siguienteId = Math.max(0, ...estado.usuarioRoles.map(relacion => Number(relacion.id) || 0)) + 1;
    usuarios.forEach(usuario => usuario.rolIds.forEach(rolId => {
      const clave = `${usuario.id}:${rolId}`;
      relacionesActivas.add(clave);
      const vigente = usuarioRoles.some(relacion =>
        relacion.usuarioId === usuario.id &&
        relacion.rolId === rolId &&
        this.relacionAdministracionVigente(relacion, hoy));
      if (!vigente) {
        usuarioRoles.push({
          id: String(siguienteId++), usuarioId: usuario.id, rolId, fechaAsignacion: hoy,
          fechaFin: '', estado: true, asignadoPorUsuarioId: this.usuarioActualId(),
        });
      }
    }));
    const relacionesActualizadas = usuarioRoles.map(relacion =>
      !relacionesActivas.has(`${relacion.usuarioId}:${relacion.rolId}`) &&
      this.relacionAdministracionVigente(relacion, hoy)
        ? { ...relacion, estado: false, fechaFin: hoy }
        : relacion);

    const rolesPermisos = roles.flatMap(rol => rol.permisoIds.map(permisoId => ({ rolId: rol.id, permisoId })));
    return {
      ...estado,
      usuarios,
      roles,
      usuarioRoles: relacionesActualizadas,
      rolesPermisos,
    };
  }

  private relacionVigente(relacion: UsuarioRolDb): boolean {
    const hoy = this.fechaActual();
    return relacion.activo === '1' &&
      (!relacion.fecha_asignacion || relacion.fecha_asignacion <= hoy) &&
      (!relacion.fecha_fin || relacion.fecha_fin >= hoy);
  }

  private relacionAdministracionVigente(
    relacion: UsuarioRolAdministracion,
    hoy: string,
  ): boolean {
    return relacion.estado &&
      (!relacion.fechaAsignacion || relacion.fechaAsignacion <= hoy) &&
      (!relacion.fechaFin || relacion.fechaFin >= hoy);
  }

  private fechaActual(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private usuarioActualId(): string {
    return this.persistencia.leer<{ id?: string } | null>('erp.sesion', null)?.id || '';
  }
}
