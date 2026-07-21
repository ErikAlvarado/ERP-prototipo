import { Routes } from '@angular/router';

export const administracionRoutes: Routes = [
    {
        path: 'almacenes',
        loadComponent: () =>
            import('./almacenes/almacenes').then(c => c.Almacenes)
    },
    {
        path: 'usuarios',
        loadComponent: () =>
            import('./usuarios/usuarios').then(c => c.Usuarios)
    },
    {
        path: 'roles',
        loadComponent: () =>
            import('./roles/roles').then(c => c.Roles)
    },
    {
        path: 'empresas',
        loadComponent: () =>
            import('./empresas/empresas').then(c => c.Empresas)
    },
];
