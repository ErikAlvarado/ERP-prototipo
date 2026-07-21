import { inject, Injectable, signal } from '@angular/core';
import { PersistenciaLocal } from './persistencia-local';

interface UsuarioRegistrado {
  nombre: string;
  correo: string;
  password: string;
}

export interface SesionUsuario {
  nombre: string;
  correo: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly claveUsuarios = 'erp.usuarios';
  private readonly claveSesion = 'erp.sesion';
  readonly sesion = signal<SesionUsuario | null>(
    this.persistencia.leer<SesionUsuario | null>(this.claveSesion, null),
  );

  iniciarSesion(correo: string, password: string): boolean {
    const usuarios = this.persistencia.leer<UsuarioRegistrado[]>(this.claveUsuarios, []);
    const usuario = usuarios.find(
      (item) => item.correo.toLowerCase() === correo.toLowerCase() && item.password === password,
    );
    const demoValido = correo.toLowerCase() === 'admin@zyro.mx' && password === 'admin123';
    if (!usuario && !demoValido) return false;

    const sesion: SesionUsuario = {
      nombre: usuario?.nombre ?? 'Administrador',
      correo,
      rol: 'Jefatura de Compras',
    };
    this.sesion.set(sesion);
    this.persistencia.guardar(this.claveSesion, sesion);
    return true;
  }

  registrar(nombre: string, correo: string, password: string): boolean {
    const usuarios = this.persistencia.leer<UsuarioRegistrado[]>(this.claveUsuarios, []);
    if (usuarios.some((usuario) => usuario.correo.toLowerCase() === correo.toLowerCase())) {
      return false;
    }
    this.persistencia.guardar(this.claveUsuarios, [...usuarios, { nombre, correo, password }]);
    return true;
  }

  cerrarSesion(): void {
    this.sesion.set(null);
    this.persistencia.eliminar(this.claveSesion);
  }
}
