import { Component, HostBinding, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../shared/services/autenticacion';

export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [SHARED_IMPORTS, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar {
  private readonly autenticacion = inject(Autenticacion);
  expanded = signal(false);
  showFiller = signal(false);

  @HostBinding('class.expanded')
  get isExpanded() {
    return this.expanded();
  }

  toggleMenu() {
    this.expanded.update(value => !value);
  }

  menus = signal<MenuItem[]>([
  {
    title: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard'
  },
  {
    title: 'Catálogo de productos',
    icon: 'deployed_code',
    expanded: false,
    children: [
      {
        title: 'Productos',
        icon: 'inventory',
        route: '/products'
      },
      { 
        title: 'Kits', 
        icon: 'home_repair_service',
        route: '/kits'
      },
      {
        title: 'Categorías',
        icon: 'category',
        route: '/categorias'
      },
      {
        title: 'Marcas',
        icon: 'star',
        route: '/marcas'
      },
      {
        title: 'Precios',
        icon: 'sell',
        route: '/precios'
      },
      {
        title: 'Unidades',
        icon: 'balance',
        route: '/unidades'
      },
    ]
  },
  {
    title: 'Inventario',
    icon: 'assignment',
    expanded: false,
    children: [
      {
        title: 'Dashboard de Inventario',
        icon: 'dashboard',
        route: '/inventario-dashboard'
      },
      {
        title: 'Existencias',
        icon: 'inventory_2',
        route: '/existencias'
      },
      {
        title: 'Kardex',
        icon: 'receipt_long',
        route: '/kardex'
      },
      {
        title: 'Ajustes de Inventario',
        icon: 'tune',
        route: '/ajustes'
      },
      {
        title: 'Transferencias de Productos',
        icon: 'local_shipping',
        route: '/transferencias'
      },
      {
        title: 'Recepción',
        icon: 'move_to_inbox',
        route: '/recepcion'
      },
    ]
  },
    {
    title: 'Compras',
    icon: 'shopping_cart',
    expanded: false,
    children: [
      {
        title: 'Dashboard de Compras',
        icon: 'dashboard',
        route: '/compras/dashboard'
      },
      {
        title: 'Proveedores',
        icon: 'apartment',
        route: '/compras/proveedores'
      },
      {
        title: 'Gestión de compras',
        icon: 'shopping_cart_checkout',
        route: '/compras/gestion-compras'
      },
      {
        title: 'Consultas',
        icon: 'description',
        route: '/compras/consultas'
      },
      {
        title: 'Catálogo',
        icon: 'inventory_2',
        route: '/compras/catalogo'
      },
      {
        title: 'Productos bajo stock',
        icon: 'inventory',
        route: '/compras/bajo-stock'
      },
      {
        title: 'Favoritos',
        icon: 'favorite',
        route: '/compras/preferencias'
      }
    ]
  },
  {
    title: 'Ventas',
    icon: 'point_of_sale',
    expanded: false,
    children: [
      { title: 'Punto de Venta', icon: 'point_of_sale', route: '/ventas/pdv' },
      { title: 'Cotizaciones', icon: 'request_quote', route: '/ventas/cotizaciones' },
      { title: 'Historial de Ventas', icon: 'history', route: '/ventas/historial' },
      { title: 'Devoluciones', icon: 'assignment_return', route: '/ventas/devoluciones' },
      { title: 'Gestión de Devoluciones', icon: 'published_with_changes', route: '/ventas/gestion-devoluciones' },
      { title: 'Configuración', icon: 'settings', route: '/ventas/configuracion' }
    ]
  },
  {
    title: 'Administración',
    icon: 'settings',
    expanded: false,
    children: [
      {
        title: 'Almacenes',
        icon: 'garage_home',
        route: '/almacenes'
      },
      {
        title: 'Usuarios',
        icon: 'people',
        route: '/usuarios'
      },
      {
        title: 'Roles',
        icon: 'security',
        route: '/roles'
      },
      {
        title: 'Empresas',
        icon: 'business',
        route: '/empresas'
      }
    ]
  }
]);

  constructor() {
    if (this.autenticacion.esAdministrador()) return;
    if (this.autenticacion.puedeVerCompras()) {
      this.menus.set(this.menus().filter(menu => menu.title === 'Compras'));
      return;
    }
    if (this.autenticacion.puedeVerVentas()) {
      this.menus.set(this.menus().filter(menu => menu.title === 'Ventas'));
      return;
    }
    if (this.autenticacion.puedeVerInventario()) {
      this.menus.set(this.menus().filter(menu =>
        menu.title === 'Inventario'
        || (this.autenticacion.esJefeInventarios() && menu.icon === 'deployed_code')));
      return;
    }
    this.menus.set([]);
  }

  toggleMenuItem(index: number) {
    this.menus.update(menus =>
      menus.map((menu, i) => {
        if (i !== index || !menu.children?.length) {
          return menu;
        }
        return { ...menu, expanded: !menu.expanded };
      })
    );
  }

  onMenuClick(index: number) {
    const menu = this.menus()[index];

    if (!menu.children?.length) {
      return;
    }

    if (!this.expanded()) {
      this.expanded.set(true);
    }

    this.toggleMenuItem(index);
  }
}
