import { Routes } from '@angular/router';
import { authRoutes } from './inventario/Auth/auth.routes';
import {product_catalogRoutes} from './inventario/product_catalog/product_catalog.routes';
import { Dashboard } from './inventario/dashboard/dashboard';
import { inventarioRoutes } from './inventario/inventario/inventario.routes';
import { Layout } from './inventario/layout/layout/layout';
import { administracionRoutes } from './inventario/administracion/administracion.routes';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
      },

      ...product_catalogRoutes,
      ...inventarioRoutes,
      ...administracionRoutes
    ]
  },

  ...authRoutes,

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
