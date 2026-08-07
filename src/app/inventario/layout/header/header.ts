import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../shared/services/autenticacion';

@Component({
  selector: 'app-header',
  imports: [...SHARED_IMPORTS],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly autenticacion = inject(Autenticacion);
  readonly sesion = this.autenticacion.sesion;
  
  moduleTitle = signal<string>('Inventario');

  private routeTitleMap: Record<string, string> = {
    // Dashboard principal
    '/dashboard': 'Dashboard',
    '/inventario-dashboard': 'Inventario / Reportes inventario',

    // Catálogo de Productos
    '/products': 'Catálogo / Productos',
    '/kits': 'Catálogo / Kits',
    '/precios': 'Catálogo / Precios',
    '/categorias': 'Catálogo / Categorías',
    '/marcas': 'Catálogo / Marcas',
    '/unidades': 'Catálogo / Unidades',
    '/anaqueles': 'Catálogo / Anaqueles',

    // Inventario
    '/existencias': 'Inventario / Existencias',
    '/kardex': 'Inventario / Kardex',
    '/ajustes': 'Inventario / Ajustes',
    '/transferencias': 'Inventario / Transferencias',
    '/recepcion': 'Inventario / Recepción',

    // Compras (Nuevas rutas agregadas)
    '/compras/dashboard': 'Compras / Dashboard',
    '/compras/proveedores': 'Compras / Proveedores',
    '/compras/gestion-compras': 'Compras / Gestión de Compras',
    '/compras/consultas': 'Compras / Consultas',
    '/compras/catalogo': 'Compras / Catálogo',
    '/compras/preferencias': 'Compras / Preferencias',

    // Ventas
    '/ventas/dashboard': 'Ventas / Dashboard',
    '/ventas/pdv': 'Ventas / Punto de Venta',
    '/ventas/cotizaciones': 'Ventas / Cotizaciones',
    '/ventas/historial': 'Ventas / Historial',
    '/ventas/devoluciones': 'Ventas / Devoluciones',
    '/ventas/gestion-devoluciones': 'Ventas / Gestión de Devoluciones',
    '/ventas/configuracion': 'Ventas / Configuración',

    // Administración
    '/almacenes': 'Administración / Almacenes',
    '/usuarios': 'Administración / Usuarios',
    '/roles': 'Administración / Roles',
    '/empresas': 'Administración / Empresas',
  };

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateTitle(event.urlAfterRedirects || event.url);
      });
  }

  private updateTitle(url: string) {
    // Limpia la URL removiendo query params (?) y fragmentos (#)
    const cleanUrl = url.split('?')[0].split('#')[0];

    // 1. Busca coincidencia exacta (ej. '/compras/proveedores')
    if (this.routeTitleMap[cleanUrl]) {
      this.moduleTitle.set(this.routeTitleMap[cleanUrl]);
      return;
    }

    // 2. Si es una subruta más profunda (ej. '/compras/proveedores/123'), prueba quitando el ID final
    const parts = cleanUrl.split('/').filter(p => p.length > 0);
    if (parts.length >= 2) {
      const parentUrl = `/${parts[0]}/${parts[1]}`;
      if (this.routeTitleMap[parentUrl]) {
        this.moduleTitle.set(this.routeTitleMap[parentUrl]);
        return;
      }
    }

    // 3. Prueba solo con la ruta base (ej. '/products/edit' -> '/products')
    if (parts.length >= 1) {
      const baseUrl = `/${parts[0]}`;
      if (this.routeTitleMap[baseUrl]) {
        this.moduleTitle.set(this.routeTitleMap[baseUrl]);
        return;
      }
    }

    this.moduleTitle.set('Inventario');
  }

  iniciales(nombre: string): string {
    return nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }

  cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
