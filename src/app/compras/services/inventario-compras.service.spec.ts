import { Injector, runInInjectionContext, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CatalogoCompras } from '../../shared/services/catalogo-compras';
import { CatalogoProductos, ProductoCatalogo } from '../../shared/services/catalogo-productos';
import { InventarioComprasService } from './inventario-compras.service';

describe('InventarioComprasService', () => {
  it('calcula bajo stock por producto y almacén desde inventarios', () => {
    const catalogo = { cargar: () => of([productoPrueba()]) };
    const productosCompra = signal([
      {
        id: 10,
        relaciones: [
          {
            proveedorId: 3,
            proveedor: 'Proveedor de prueba',
            skuProveedor: 'PROV-10',
            precioReferencia: 45,
            diasEntrega: 2,
            cantidadMinima: 4,
          },
        ],
      },
    ]);
    const injector = Injector.create({
      providers: [
        {
          provide: CatalogoProductos,
          useValue: catalogo,
        },
        {
          provide: CatalogoCompras,
          useValue: {
            productos: productosCompra,
            cargando: signal(false),
            errorCarga: signal(''),
            recargar: () => undefined,
          },
        },
      ],
    });

    const servicio = runInInjectionContext(injector, () => new InventarioComprasService());

    expect(servicio.bajoStock()).toHaveLength(2);
    expect(servicio.bajoStock().map((item) => item.almacen)).toEqual([
      'Almacén Norte',
      'Almacén Central',
    ]);
    expect(servicio.bajoStock()[0]).toMatchObject({
      producto: 'Producto real',
      stock: 0,
      stockMinimo: 5,
      nivel: 'Agotado',
      faltante: 5,
      proveedores: [
        expect.objectContaining({
          proveedorId: 3,
          proveedor: 'Proveedor de prueba',
        }),
      ],
    });

    productosCompra.set([{ id: 10, relaciones: [] }]);
    expect(servicio.bajoStock()[0].proveedores).toEqual([]);
  });

  it('expone error y termina el estado de carga', () => {
    const injector = Injector.create({
      providers: [
        {
          provide: CatalogoProductos,
          useValue: { cargar: () => throwError(() => new Error('sin red')) },
        },
        {
          provide: CatalogoCompras,
          useValue: {
            productos: signal([]),
            cargando: signal(false),
            errorCarga: signal(''),
            recargar: () => undefined,
          },
        },
      ],
    });

    const servicio = runInInjectionContext(injector, () => new InventarioComprasService());

    expect(servicio.cargando()).toBe(false);
    expect(servicio.error()).toContain('inventari_db');
    expect(servicio.bajoStock()).toEqual([]);
  });
});

function productoPrueba(): ProductoCatalogo {
  return {
    id: 10,
    idEmpresa: 1,
    empresa: 'Empresa',
    sku: 'SKU-10',
    codigo: '750',
    producto: 'Producto real',
    descripcion: '',
    tipo: 'Físico',
    idMarca: 1,
    marca: 'Marca',
    idCategoria: 1,
    categoria: 'Categoría',
    idUnidad: 1,
    medida: 'Pieza',
    estatus: 'Vigente',
    precio: 100,
    costo: 50,
    margen: 50,
    listaPrecio: 'General',
    precios: [],
    pos: true,
    linea: true,
    estado: true,
    requiereReceta: false,
    usarExistencias: true,
    almacen: '2 almacenes',
    anaquel: '—',
    inventarios: [
      {
        id: 1,
        idAlmacen: 1,
        almacen: 'Almacén Central',
        stock: 4,
        stockReorden: 5,
        stockCritico: 2,
        stockMaximo: 20,
        anaquel: 'A-1',
        fechaActualizacion: '2026-08-01',
      },
      {
        id: 2,
        idAlmacen: 2,
        almacen: 'Almacén Norte',
        stock: 0,
        stockReorden: 5,
        stockCritico: 2,
        stockMaximo: 20,
        anaquel: 'B-1',
        fechaActualizacion: '2026-08-02',
      },
      {
        id: 3,
        idAlmacen: 3,
        almacen: 'Almacén Sur',
        stock: 8,
        stockReorden: 5,
        stockCritico: 2,
        stockMaximo: 20,
        anaquel: 'C-1',
        fechaActualizacion: '2026-08-03',
      },
    ],
    stock: 12,
    stockReorden: 15,
    stockCritico: 6,
    stockMaximo: 60,
    ubicacionDefault: '',
    claveSat: '',
    imagen: '',
    imagenes: [],
    ultimoMovimiento: '',
    fechaActualizacion: '2026-08-03',
    fechaCreacion: '2026-01-01',
  };
}
