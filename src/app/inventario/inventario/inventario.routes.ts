import { Routes } from '@angular/router';

export const inventarioRoutes: Routes = [
    {
        path: 'existencias',
        loadComponent: () =>
            import('./existencias/existencias').then(c => c.Existencias)
    },
    {
        path: 'kardex',
        loadComponent: () =>
            import('./kardex/kardex').then(c => c.Kardex)
    },
    {
        path: 'ajustes',
        loadComponent: () =>
            import('./ajustes/ajustes').then(c => c.Ajustes)
    },
    {
        path: 'transferencias',
        loadComponent: () =>
            import('./transferencias/transferencias').then(c => c.Transferencias)
    },
    {
        path: 'recepcion',
        loadComponent: () =>
            import('./recepcion/recepcion').then(c => c.Recepcion)
    }

];
