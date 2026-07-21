import { Component, HostBinding, signal } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { routes } from '../../../app.routes';

export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
}


@Component({
  selector: 'app-sidebar',
  imports: [SHARED_IMPORTS],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar {
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
    title: 'Catálogo de Productos',
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
        title: 'Medidas',
        icon: 'straighten',
        route: '/medidas'
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
        title: 'Gestion de Compras',
        icon: 'shopping_cart_checkout',
        route: '/compras/gestion-compras'
      },
      {
        title: 'Consultas',
        icon: 'description',
        route: '/compras/consultas'
      },
      {
        title: 'Catalogo',
        icon: 'inventory_2',
        route: '/compras/catalogo'
      },
      {
        title: 'Preferencias',
        icon: 'tune',
        route: '/compras/preferencias'
      }
    ]
  },
  {
    title: 'Administracion',
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
    return;
  }

  this.toggleMenuItem(index);
}
}


