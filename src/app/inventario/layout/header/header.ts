import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';

@Component({
  selector: 'app-header',
  imports: [...SHARED_IMPORTS],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private router = inject(Router);
  
  // Signal para el título dinámico
  moduleTitle = signal<string>('Inventory');

  // Diccionario completo de equivalencias de rutas a títulos
  private routeTitleMap: Record<string, string> = {
    // Dashboard principal
    '/dashboard': 'Dashboard',

    // Catálogo de Productos
    '/products': 'Catálogo / Productos',
    '/kits': 'Catálogo / Kits',
    '/categorias': 'Catálogo / Categorías',
    '/marcas': 'Catálogo / Marcas',
    '/medidas': 'Catálogo / Medidas',
    '/unidades': 'Catálogo / Unidades',

    // Inventario
    '/existencias': 'Inventario / Existencias',
    '/kardex': 'Inventario / Kardex',
    '/ajustes': 'Inventario / Ajustes',
    '/transferencias': 'Inventario / Transferencias',

    // Compras (Nuevas rutas agregadas)
    '/compras/dashboard': 'Compras / Dashboard',
    '/compras/proveedores': 'Compras / Proveedores',
    '/compras/gestion-compras': 'Compras / Gestión de Compras',
    '/compras/consultas': 'Compras / Consultas',
    '/compras/catalogo': 'Compras / Catálogo',
    '/compras/preferencias': 'Compras / Preferencias',

    // Administración
    '/almacenes': 'Administración / Almacenes',
    '/usuarios': 'Administración / Usuarios',
    '/roles': 'Administración / Roles',
    '/empresas': 'Administración / Empresas',
  };

  constructor() {
    // Escuchar cambios de navegación
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

    // Título por defecto si no encuentra coincidencia
    this.moduleTitle.set('Inventory');
  }
}