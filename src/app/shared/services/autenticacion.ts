import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, take } from 'rxjs';
import { AdministracionDatos } from '../../inventario/administracion/administracion-datos';
import { PersistenciaLocal } from './persistencia-local';

export interface PerfilAccesoPrototipo {
  id: string;
  nombre: string;
  correo: string;
  empresa: string;
  roles: string[];
}

export interface SesionUsuario {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  roles: string[];
  empresaId: string;
  empresa: string;
  modo: 'prototipo';
  version: 2;
}

@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly administracion = inject(AdministracionDatos);
  private readonly claveSesion = 'erp.sesion';
  readonly sesion = signal<SesionUsuario | null>(this.cargarSesionGuardada());

  constructor() {
    // Elimina el formato anterior, que almacenaba contraseñas en texto plano.
    this.persistencia.eliminar('erp.usuarios');
  }

  perfilesDisponibles(): Observable<PerfilAccesoPrototipo[]> {
    return this.administracion.cargar().pipe(
      take(1),
      map(estado => estado.usuarios
        .filter(usuario =>
          usuario.estado &&
          estado.empresas.some(empresa => empresa.id === usuario.empresaId && empresa.estado))
        .map(usuario => {
          const empresa = estado.empresas.find(item => item.id === usuario.empresaId);
          const roles = usuario.rolIds
            .map(id => estado.roles.find(rol => rol.id === id && rol.estado))
            .filter(rol => !!rol)
            .map(rol => rol.nombre);
          return {
            id: usuario.id,
            nombre: [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno]
              .filter(Boolean).join(' '),
            correo: usuario.email,
            empresa: empresa?.nombre || '',
            roles,
          };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
    );
  }

  iniciarSesionPrototipo(usuarioId: string): Observable<boolean> {
    return this.administracion.cargar().pipe(
      take(1),
      map(estado => {
        const usuario = estado.usuarios.find(item => item.id === usuarioId && item.estado);
        const empresa = estado.empresas.find(item =>
          item.id === usuario?.empresaId && item.estado);
        if (!usuario || !empresa) return false;

        const roles = usuario.rolIds
          .map(id => estado.roles.find(rol =>
            rol.id === id && rol.empresaId === usuario.empresaId && rol.estado))
          .filter(rol => !!rol)
          .map(rol => rol.nombre);
        const sesion: SesionUsuario = {
          id: usuario.id,
          nombre: [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno]
            .filter(Boolean).join(' '),
          correo: usuario.email,
          rol: roles.join(', ') || 'Sin rol asignado',
          roles,
          empresaId: empresa.id,
          empresa: empresa.nombre,
          modo: 'prototipo',
          version: 2,
        };
        this.sesion.set(sesion);
        this.persistencia.guardar(this.claveSesion, sesion);
        return true;
      }),
    );
  }

  cerrarSesion(): void {
    this.sesion.set(null);
    this.persistencia.eliminar(this.claveSesion);
  }

  private cargarSesionGuardada(): SesionUsuario | null {
    const sesion = this.persistencia.leer<Partial<SesionUsuario> | null>(this.claveSesion, null);
    if (!sesion || sesion.modo !== 'prototipo' || sesion.version !== 2 ||
      !sesion.id || !sesion.nombre || !sesion.correo || !sesion.empresaId ||
      !Array.isArray(sesion.roles)) {
      this.persistencia.eliminar(this.claveSesion);
      return null;
    }
    return sesion as SesionUsuario;
  }
}
