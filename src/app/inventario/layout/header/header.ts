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
  
  // Signal para el título dinámico
  moduleTitle = signal<string>('Inventory');

  // Diccionario de equivalencias de rutas a títulos
  private routeTitleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/products': 'Catálogo / Productos',
    '/kits': 'Catálogo / Kits',
    '/categorias': 'Catálogo / Categorías',
    '/marcas': 'Catálogo / Marcas',
    '/medidas': 'Catálogo / Medidas',
    '/unidades': 'Catálogo / Unidades',
    '/existencias': 'Inventario / Existencias',
    '/kardex': 'Inventario / Kardex',
    '/ajustes': 'Inventario / Ajustes',
    '/transferencias': 'Inventario / Transferencias',
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
    // Extraer la ruta base ignorando query params o IDs (ej. /products/123 -> /products)
    const baseUrl = '/' + url.split('/')[1]; 
    const title = this.routeTitleMap[baseUrl] || 'Inventory';
    this.moduleTitle.set(title);
  }

  iniciales(nombre: string): string {
    return nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }

  cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
