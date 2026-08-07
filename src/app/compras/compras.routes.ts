import { Routes } from '@angular/router';

export const comprasRoutes: Routes = [
  {
    path: 'proveedores',
    loadComponent: () =>
      import('./proveedores/proveedores').then((component) => component.Proveedores),
  },
  {
    path: 'gestion-compras',
    loadComponent: () =>
      import('./gestion-compras/gestion-compras').then(
        (component) => component.GestionCompras,
      ),
  },
  {
    path: 'consultas',
    loadComponent: () =>
      import('./consultas/consultas').then((component) => component.Consultas),
  },
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./catalogos/catalogos').then((component) => component.Catalogos),
  },
  {
    path: 'bajo-stock',
    loadComponent: () =>
      import('./bajo-stock/bajo-stock').then((component) => component.BajoStock),
  },
  {
    path: 'preferencias',
    loadComponent: () =>
      import('./preferencias/preferencias').then((component) => component.Preferencias),
  },
];
