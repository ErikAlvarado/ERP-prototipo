import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, Observable, of, take } from 'rxjs';
import { AdministracionDatos } from '../../inventario/administracion/administracion-datos';
import { DatosDb } from './datos-db';
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
  version: 3;
}

interface CredencialDb {
  id_usuario: string;
  email: string;
  password_hash: string;
  activo: string;
}

interface CuentaLocal {
  id: string;
  nombre: string;
  correo: string;
  contrasena: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class Autenticacion {
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly administracion = inject(AdministracionDatos);
  private readonly db = inject(DatosDb);
  private readonly claveSesion = 'erp.sesion';
  private readonly claveCuentas = 'erp.cuentas-registradas';
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

  iniciarSesion(correo: string, contrasena: string): Observable<boolean> {
    const email = correo.trim().toLocaleLowerCase();
    const local = this.cuentasLocales().find(
      cuenta => cuenta.correo.toLocaleLowerCase() === email && cuenta.contrasena === contrasena,
    );
    if (local) {
      this.establecerSesion({
        id: local.id,
        nombre: local.nombre,
        correo: local.correo,
        roles: local.roles,
        empresaId: '1',
        empresa: 'SuperMart',
      });
      return of(true);
    }

    return forkJoin({
      estado: this.administracion.cargar().pipe(take(1)),
      credenciales: this.db.leer<CredencialDb>('usuarios.txt'),
    }).pipe(
      take(1),
      map(({ estado, credenciales }) => {
        const credencial = credenciales.find(item =>
          item.activo !== '0' &&
          item.email.trim().toLocaleLowerCase() === email &&
          item.password_hash === contrasena);
        const usuario = estado.usuarios.find(item =>
          item.id === credencial?.id_usuario && item.estado);
        const empresa = estado.empresas.find(item =>
          item.id === usuario?.empresaId && item.estado);
        if (!usuario || !empresa) return false;

        const roles = usuario.rolIds
          .map(id => estado.roles.find(rol =>
            rol.id === id && rol.empresaId === usuario.empresaId && rol.estado))
          .filter(rol => !!rol)
          .map(rol => rol.nombre);
        this.establecerSesion({
          id: usuario.id,
          nombre: [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno]
            .filter(Boolean).join(' '),
          correo: usuario.email,
          roles,
          empresaId: empresa.id,
          empresa: empresa.nombre,
        });
        return true;
      }),
    );
  }

  registrar(nombre: string, correo: string, contrasena: string, rol: 'Inventario' | 'Comprador' | 'Ventas'): boolean {
    const email = correo.trim().toLocaleLowerCase();
    if (this.cuentasLocales().some(cuenta => cuenta.correo.toLocaleLowerCase() === email)) return false;
    const cuentas = [...this.cuentasLocales(), {
      id: `local-${Date.now()}`,
      nombre: nombre.trim(),
      correo: email,
      contrasena,
      roles: [rol],
    }];
    this.persistencia.guardar(this.claveCuentas, cuentas);
    return true;
  }

  esAdministrador(): boolean {
    return this.tieneRol('Administrador', 'Admin');
  }

  puedeVerInventario(): boolean {
    return this.esAdministrador() || this.tieneRol('Inventario', 'Almacenista', 'Jefe de inventarios');
  }

  esJefeInventarios(): boolean {
    return this.esAdministrador() || this.tieneRol('Jefe de inventarios');
  }

  puedeVerCompras(): boolean {
    return this.esAdministrador() || this.tieneRol('Comprador', 'Compras');
  }

  puedeVerVentas(): boolean {
    return this.esAdministrador() || this.tieneRol('Ventas', 'Vendedor');
  }

  rutaInicial(): string {
    if (this.esAdministrador()) return '/dashboard';
    if (this.puedeVerInventario()) return '/inventario-dashboard';
    if (this.puedeVerCompras()) return '/compras/dashboard';
    if (this.puedeVerVentas()) return '/ventas/dashboard';
    return '/login';
  }

  puedeAcceder(url: string): boolean {
    if (!this.sesion()) return false;
    if (this.esAdministrador()) return true;
    if (url.startsWith('/compras')) return this.puedeVerCompras();
    if (url.startsWith('/ventas')) return this.puedeVerVentas();
    if (['/usuarios', '/roles', '/empresas', '/almacenes'].some(ruta => url.startsWith(ruta))) {
      return false;
    }
    if (!this.puedeVerInventario()) return false;
    const rutasCatalogo = ['/products', '/kits', '/precios', '/marcas', '/categorias', '/unidades'];
    if (rutasCatalogo.some(ruta => url.startsWith(ruta))) return this.esJefeInventarios();
    if (url === '/dashboard' || url.startsWith('/dashboard?')) return false;
    return true;
  }

  cerrarSesion(): void {
    this.sesion.set(null);
    this.persistencia.eliminar(this.claveSesion);
  }

  private cargarSesionGuardada(): SesionUsuario | null {
    const sesion = this.persistencia.leer<Partial<SesionUsuario> | null>(this.claveSesion, null);
    if (!sesion || sesion.modo !== 'prototipo' || sesion.version !== 3 ||
      !sesion.id || !sesion.nombre || !sesion.correo || !sesion.empresaId ||
      !Array.isArray(sesion.roles)) {
      this.persistencia.eliminar(this.claveSesion);
      return null;
    }
    return sesion as SesionUsuario;
  }

  private tieneRol(...roles: string[]): boolean {
    const actuales = (this.sesion()?.roles || []).map(rol => rol.toLocaleLowerCase());
    return roles.some(rol => actuales.includes(rol.toLocaleLowerCase()));
  }

  private cuentasLocales(): CuentaLocal[] {
    return this.persistencia.leer<CuentaLocal[]>(this.claveCuentas, []);
  }

  private establecerSesion(datos: Omit<SesionUsuario, 'rol' | 'modo' | 'version'>): void {
    const sesion: SesionUsuario = {
      ...datos,
      rol: datos.roles.join(', ') || 'Sin rol asignado',
      modo: 'prototipo',
      version: 3,
    };
    this.sesion.set(sesion);
    this.persistencia.guardar(this.claveSesion, sesion);
  }
}
