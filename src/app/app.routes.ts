import { Routes } from '@angular/router';
import { authRoutes } from './inventario/Auth/auth.routes';
import {product_catalogRoutes} from './inventario/product_catalog/product_catalog.routes';
import { Dashboard } from './inventario/dashboard/dashboard';
import { inventarioRoutes } from './inventario/inventario/inventario.routes';
import { Layout } from './inventario/layout/layout/layout';
import { administracionRoutes } from './inventario/administracion/administracion.routes';
import { comprasRoutes } from './compras/compras.routes';
import { Dashboard as ComprasDashboard } from './compras/dashboard/dashboard';
import { autenticacionGuard, autorizacionHijosGuard } from './shared/guards/autenticacion.guard';
import { ventasRoutes } from './ventas/ventas.routes';
import { DashboardComponent as VentasDashboard } from './ventas/pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    canActivate: [autenticacionGuard],
    canActivateChild: [autorizacionHijosGuard],
    children: [
      {
        path: 'dashboard',
        component: VentasDashboard,
      },
      {
        path: 'inventario-dashboard',
        component: Dashboard,
      },

      ...product_catalogRoutes,
      ...inventarioRoutes,
      ...administracionRoutes,
      {
        path: 'compras',
        children: [
          {
            path: 'dashboard',
            component: ComprasDashboard,
          },
          ...comprasRoutes,
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'ventas',
        children: ventasRoutes,
      },
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
