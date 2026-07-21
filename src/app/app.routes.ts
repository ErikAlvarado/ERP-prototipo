import { Routes } from '@angular/router';
import { authRoutes } from './components/Auth/auth.routes';
import {product_catalogRoutes} from './components/product_catalog/product_catalog.routes';
import { Dashboard } from './components/dashboard/dashboard';
import { inventarioRoutes } from './components/inventario/inventario.routes';
import { Layout } from './components/layout/layout/layout';
import { administracionRoutes } from './components/administracion/administracion.routes';

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
