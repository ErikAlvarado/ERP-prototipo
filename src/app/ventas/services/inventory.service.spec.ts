import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProductoCatalogo } from '../../shared/services/catalogo-productos';
import {
  InventoryService,
  mapCatalogProductToSale,
  warehouseSummary,
} from './inventory.service';

describe('InventoryService para Ventas', () => {
  it('mapea el catálogo central con stock real desglosado por almacén', () => {
    const product = mapCatalogProductToSale(createCatalogProduct());

    expect(product).toEqual(expect.objectContaining({
      id: '10',
      sku: 'SKU-REAL-10',
      name: 'Producto real',
      price: 150,
      stock: 12,
    }));
    expect(product.warehouseStocks).toEqual([
      expect.objectContaining({ warehouse: 'Almacén Central', stock: 10, shelf: 'A-01' }),
      expect.objectContaining({ warehouse: 'Almacén Norte', stock: 2, shelf: 'N-02' }),
    ]);
    expect(warehouseSummary(product)).toContain('Almacén Central: 10 Pieza (A-01)');
    expect(warehouseSummary(product)).toContain('Almacén Norte: 2 Pieza (N-02)');
  });

  it('reserva existencias en el catálogo compartido y conserva el desglose', async () => {
    const guardar = vi.fn();
    const catalog = {
      cargar: () => of([createCatalogProduct()]),
      guardar,
    };
    const service = new InventoryService(catalog as never);

    const reserved = await firstValueFrom(service.reserveProducts([
      { sku: 'SKU-REAL-10', quantity: 6 },
    ]));
    const products = await firstValueFrom(service.products$);
    const persisted = guardar.mock.calls.at(-1)?.[0] as ProductoCatalogo[];

    expect(reserved).toBe(true);
    expect(products[0].stock).toBe(6);
    expect(products[0].warehouseStocks?.map(stock => stock.stock)).toEqual([4, 2]);
    expect(persisted[0].stock).toBe(6);
    expect(persisted[0].inventarios.map(stock => stock.stock)).toEqual([4, 2]);
  });
});

function createCatalogProduct(): ProductoCatalogo {
  return {
    id: 10,
    idEmpresa: 1,
    empresa: 'Empresa Demo',
    sku: 'SKU-REAL-10',
    codigo: '750000000010',
    producto: 'Producto real',
    descripcion: 'Producto leído de inventari_db',
    tipo: 'Producto',
    idMarca: 1,
    marca: 'Marca real',
    idCategoria: 2,
    categoria: 'Categoría real',
    idUnidad: 1,
    medida: 'Pieza',
    estatus: 'Vigente',
    precio: 150,
    costo: 100,
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
        idAnaquel: 1,
        almacen: 'Almacén Central',
        stock: 10,
        stockReorden: 4,
        stockCritico: 2,
        stockMaximo: 30,
        anaquel: 'A-01',
        fechaActualizacion: '2026-08-07',
      },
      {
        id: 2,
        idAlmacen: 2,
        idAnaquel: 2,
        almacen: 'Almacén Norte',
        stock: 2,
        stockReorden: 3,
        stockCritico: 1,
        stockMaximo: 20,
        anaquel: 'N-02',
        fechaActualizacion: '2026-08-07',
      },
    ],
    stock: 12,
    stockReorden: 7,
    stockCritico: 3,
    stockMaximo: 50,
    ubicacionDefault: 'Pasillo A',
    claveSat: '43210000',
    imagen: '',
    imagenes: [],
    ultimoMovimiento: '2026-08-07 · VENTA · -1',
    fechaActualizacion: '2026-08-07',
    fechaCreacion: '2026-01-01',
  };
}
