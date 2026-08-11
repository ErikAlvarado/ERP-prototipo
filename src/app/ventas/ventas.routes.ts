import { Routes } from '@angular/router';

export const ventasRoutes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'pdv', loadComponent: () => import('./pages/pdv/pdv.component').then(m => m.PdvComponent) },
  { path: 'cotizaciones', loadComponent: () => import('./pages/cotizaciones/cotizaciones.component').then(m => m.CotizacionesComponent) },
  { path: 'historial', loadComponent: () => import('./pages/historial/historial.component').then(m => m.HistorialComponent) },
  { path: 'devoluciones', loadComponent: () => import('./pages/devoluciones/devoluciones.component').then(m => m.DevolucionesComponent) },
  { path: 'gestion-devoluciones', loadComponent: () => import('./pages/gestion-devoluciones/gestion-devoluciones.component').then(m => m.GestionDevolucionesComponent) },
  { path: 'configuracion', loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
