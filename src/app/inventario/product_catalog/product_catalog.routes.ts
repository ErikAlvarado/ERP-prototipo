import { Routes } from '@angular/router';

export const product_catalogRoutes: Routes = [
    {
        path: 'products',
        loadComponent: () =>
            import('./products/products').then(c => c.Products)
    },
    {
        path: 'kits',
        loadComponent: () =>
            import('./kits/kits').then(c => c.Kits)
    },
    {
        path: 'marcas',
        loadComponent: () =>
            import('./marcas/marcas').then(c => c.Marcas)
    },
    {
        path: 'medidas',
        loadComponent: () =>
            import('./medidas/medidas').then(c => c.Medidas)
    },
    {
        path: 'categorias',
        loadComponent: () =>
            import('./categorias/categorias').then(c => c.Categorias)   
    },
    {
        path: 'unidades',
        loadComponent: () =>
            import('./unidades/unidades').then(c => c.Unidades)   
    }
];
