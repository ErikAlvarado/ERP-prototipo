import { computed, inject, Injectable, signal } from '@angular/core';
import { CatalogoProductos, ProductoCatalogo } from '../../shared/services/catalogo-productos';
import {
  CatalogoCompras,
  RelacionProductoProveedorCompra,
} from '../../shared/services/catalogo-compras';

export type NivelStockCompra = 'Agotado' | 'Crítico' | 'Bajo';

export type ProveedorStockCompra = RelacionProductoProveedorCompra;

export interface StockAlmacenCompra {
  id: string;
  productoId: number;
  almacenId: number;
  sku: string;
  producto: string;
  categoria: string;
  unidad: string;
  almacen: string;
  anaquel: string;
  stock: number;
  stockMinimo: number;
  stockCritico: number;
  faltante: number;
  nivel: NivelStockCompra;
  proveedores: ProveedorStockCompra[];
  fechaActualizacion: string;
}

/**
 * Vista de solo lectura del inventario central para Compras.
 * CatalogoProductos ya relaciona inventari_db/productos.txt,
 * inventario.txt y almacenes.txt; no se mantienen cantidades paralelas.
 */
@Injectable({ providedIn: 'root' })
export class InventarioComprasService {
  private readonly catalogo = inject(CatalogoProductos);
  private readonly catalogoCompras = inject(CatalogoCompras);
  private readonly productosInternos = signal<ProductoCatalogo[]>([]);
  private readonly cargandoInventario = signal(true);
  private readonly errorInventario = signal('');

  readonly cargando = computed(() => this.cargandoInventario() || this.catalogoCompras.cargando());
  readonly error = computed(() => this.errorInventario() || this.catalogoCompras.errorCarga());
  readonly productos = this.productosInternos.asReadonly();
  readonly existencias = computed<StockAlmacenCompra[]>(() => {
    const proveedoresPorProducto = new Map(
      this.catalogoCompras.productos().map((producto) => [producto.id, producto.relaciones]),
    );

    return this.productosInternos()
      .filter((producto) => producto.estado && producto.usarExistencias)
      .flatMap((producto) =>
        producto.inventarios.map((inventario) => ({
          id: `${producto.id}:${inventario.idAlmacen}:${inventario.id}`,
          productoId: producto.id,
          almacenId: inventario.idAlmacen,
          sku: producto.sku,
          producto: producto.producto,
          categoria: producto.categoria,
          unidad: producto.medida,
          almacen: inventario.almacen,
          anaquel: inventario.anaquel,
          stock: inventario.stock,
          stockMinimo: inventario.stockReorden,
          stockCritico: inventario.stockCritico,
          faltante: Math.max(0, inventario.stockReorden - inventario.stock),
          nivel: nivelStock(inventario.stock, inventario.stockCritico),
          proveedores: proveedoresPorProducto.get(producto.id) || [],
          fechaActualizacion: inventario.fechaActualizacion,
        })),
      );
  });
  readonly bajoStock = computed(() =>
    this.existencias()
      .filter((item) => item.stockMinimo > 0 && item.stock <= item.stockMinimo)
      .sort(
        (a, b) =>
          prioridadNivel(a.nivel) - prioridadNivel(b.nivel) ||
          b.faltante - a.faltante ||
          a.producto.localeCompare(b.producto, 'es-MX') ||
          a.almacen.localeCompare(b.almacen, 'es-MX'),
      ),
  );

  constructor() {
    this.catalogo.cambios$?.subscribe(() => this.recargar());
    this.recargar();
  }

  recargar(): void {
    this.cargandoInventario.set(true);
    this.errorInventario.set('');
    this.catalogoCompras.recargar();
    this.catalogo.cargar().subscribe({
      next: (productos) => {
        this.productosInternos.set(productos);
        this.cargandoInventario.set(false);
      },
      error: () => {
        this.productosInternos.set([]);
        this.errorInventario.set(
          'No fue posible leer productos, inventario y almacenes desde inventari_db.',
        );
        this.cargandoInventario.set(false);
      },
    });
  }
}

function nivelStock(stock: number, critico: number): NivelStockCompra {
  if (stock <= 0) return 'Agotado';
  return stock <= critico ? 'Crítico' : 'Bajo';
}

function prioridadNivel(nivel: NivelStockCompra): number {
  return nivel === 'Agotado' ? 0 : nivel === 'Crítico' ? 1 : 2;
}
