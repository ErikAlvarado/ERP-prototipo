import { Routes } from '@angular/router';

export const product_catalogRoutes: Routes = [
    {
        path: 'products/:id',
        loadComponent: () =>
            import('./products/product-detail/product-detail').then(c => c.ProductDetail)
    },
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
        path: 'precios',
        loadComponent: () =>
            import('./precios/precios').then(c => c.Precios)
    },
    {
        path: 'marcas',
        loadComponent: () =>
            import('./marcas/marcas').then(c => c.Marcas)
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
