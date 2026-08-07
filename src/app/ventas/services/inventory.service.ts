import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import {
  CatalogoProductos,
  ProductoCatalogo,
} from '../../shared/services/catalogo-productos';
import { Product, ProductWarehouseStock } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  readonly products$ = this.productsSubject.asObservable();

  private catalogProducts: ProductoCatalogo[] = [];
  private loadingRequest?: Observable<Product[]>;
  private readonly legacyStocks = new Map<string, number>();

  constructor(private catalog: CatalogoProductos) {
    this.catalog.cambios$?.subscribe(() => {
      this.loadProducts(true).subscribe({
        error: () => {
          // Mantiene la Ãºltima lectura vÃ¡lida y permite reintentar despuÃ©s.
        },
      });
    });
    this.loadProducts().subscribe({
      error: () => {
        // Las pantallas pueden reintentar la lectura en la siguiente consulta.
      },
    });
  }

  /**
   * Catálogo comercial derivado de productos.txt, productos_precios.txt,
   * inventario.txt y almacenes.txt. La petición se comparte entre pantallas.
   */
  loadProducts(force = false): Observable<Product[]> {
    if (!force && this.catalogProducts.length) return of(this.productsSubject.value);
    if (!force && this.loadingRequest) return this.loadingRequest;

    const request = this.catalog.cargar().pipe(
      map(products => {
        // Conserva las referencias de relaciones sin mutar el origen del catálogo.
        this.catalogProducts = products.map(product => ({ ...product }));
        return this.mapSalesProducts();
      }),
      tap(products => this.productsSubject.next(products)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.loadingRequest = request;
    request.subscribe({
      error: () => {
        this.loadingRequest = undefined;
      },
      complete: () => {
        this.loadingRequest = undefined;
      },
    });
    return request;
  }

  checkStock(sku: string, fallbackStock?: number): Observable<number> {
    return this.ensureProductsLoaded().pipe(
      map(products => {
        const product = products.find(item => item.sku === sku);
        return product ? product.stock : this.getLegacyStock(sku, fallbackStock);
      }),
    );
  }

  reserveProducts(
    items: { sku: string; quantity: number; fallbackStock?: number }[],
  ): Observable<boolean> {
    return this.ensureProductsLoaded().pipe(
      map(products => {
        const requested = this.groupQuantities(items);
        for (const [sku, quantity] of requested) {
          const product = products.find(item => item.sku === sku);
          if (product) {
            if (product.tracksInventory !== false && product.stock < quantity) return false;
          } else {
            const fallback = items.find(item => item.sku === sku)?.fallbackStock;
            if (this.getLegacyStock(sku, fallback) < quantity) return false;
          }
        }

        for (const [sku, quantity] of requested) {
          if (this.catalogProducts.some(item => item.sku === sku)) {
            this.applyStockMovement(sku, -quantity);
          } else {
            this.legacyStocks.set(sku, this.getLegacyStock(sku) - quantity);
          }
        }
        this.persistCatalogStock();
        return true;
      }),
    );
  }

  releaseReservation(
    items: { sku: string; quantity: number; fallbackStock?: number }[],
  ): Observable<boolean> {
    return this.ensureProductsLoaded().pipe(
      map(() => {
        for (const item of items) {
          if (this.catalogProducts.some(product => product.sku === item.sku)) {
            this.applyStockMovement(item.sku, item.quantity);
          } else {
            this.legacyStocks.set(
              item.sku,
              this.getLegacyStock(item.sku, item.fallbackStock) + item.quantity,
            );
          }
        }
        this.persistCatalogStock();
        return true;
      }),
    );
  }

  requestReturnReentry(
    returnNumber: string,
    items: { sku: string; quantity: number; fallbackStock?: number }[],
  ): Observable<boolean> {
    return this.releaseReservation(items);
  }

  checkAvailability(sku: string): Observable<{ available: boolean; location: string }> {
    return this.ensureProductsLoaded().pipe(
      map(products => {
        const product = products.find(item => item.sku === sku);
        return {
          available: Boolean(product && (product.tracksInventory === false || product.stock > 0)),
          location: product ? warehouseSummary(product) : 'Ubicación no asignada',
        };
      }),
    );
  }

  getProductLocation(sku: string): Observable<string> {
    return this.ensureProductsLoaded().pipe(
      map(products => {
        const product = products.find(item => item.sku === sku);
        return product ? warehouseSummary(product) : 'Ubicación no asignada';
      }),
    );
  }

  getProductBatch(sku: string): Observable<string> {
    return of('Sin control de lote');
  }

  getProductSerialNumber(sku: string): Observable<string> {
    return of('Sin número de serie');
  }

  private ensureProductsLoaded(): Observable<Product[]> {
    return this.catalogProducts.length ? of(this.productsSubject.value) : this.loadProducts();
  }

  private mapSalesProducts(): Product[] {
    return this.catalogProducts
      .filter(product => product.pos && product.estado)
      .map(mapCatalogProductToSale)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private groupQuantities(
    items: { sku: string; quantity: number }[],
  ): Map<string, number> {
    const grouped = new Map<string, number>();
    for (const item of items) {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      grouped.set(item.sku, (grouped.get(item.sku) || 0) + quantity);
    }
    return grouped;
  }

  private getLegacyStock(sku: string, fallbackStock?: number): number {
    if (!this.legacyStocks.has(sku) && Number.isFinite(Number(fallbackStock))) {
      this.legacyStocks.set(sku, Math.max(0, Number(fallbackStock)));
    }
    return this.legacyStocks.get(sku) || 0;
  }

  private applyStockMovement(sku: string, movement: number): void {
    const index = this.catalogProducts.findIndex(product => product.sku === sku);
    if (index < 0 || movement === 0) return;
    const current = this.catalogProducts[index];
    if (!current.usarExistencias) return;

    const inventories = current.inventarios.map(inventory => ({ ...inventory }));
    if (movement < 0) {
      let pending = Math.abs(movement);
      for (const inventory of inventories) {
        const quantity = Math.min(Math.max(0, inventory.stock), pending);
        inventory.stock -= quantity;
        pending -= quantity;
        if (pending <= 0) break;
      }
    } else if (inventories.length) {
      inventories[0].stock += movement;
    }

    const stock = inventories.reduce((total, inventory) => total + inventory.stock, 0);
    this.catalogProducts[index] = {
      ...current,
      inventarios: inventories,
      stock,
      almacen: inventories.length === 1
        ? inventories[0].almacen
        : inventories.length ? `${inventories.length} almacenes` : 'Sin inventario',
      anaquel: inventories.length === 1 ? inventories[0].anaquel : '—',
    };
  }

  private persistCatalogStock(): void {
    if (!this.catalogProducts.length) return;
    this.catalog.guardar(this.catalogProducts);
    this.productsSubject.next(this.mapSalesProducts());
  }
}

export function mapCatalogProductToSale(product: ProductoCatalogo): Product {
  const warehouseStocks: ProductWarehouseStock[] = (product.inventarios || []).map(inventory => ({
    warehouseId: inventory.idAlmacen,
    warehouse: inventory.almacen,
    stock: inventory.stock,
    reorderPoint: inventory.stockReorden,
    criticalStock: inventory.stockCritico,
    maxStock: inventory.stockMaximo,
    shelf: inventory.anaquel,
    updatedAt: inventory.fechaActualizacion,
  }));
  return {
    id: String(product.id),
    code: product.codigo || product.sku,
    name: product.producto,
    sku: product.sku,
    price: product.precio,
    unit: product.medida,
    stock: warehouseStocks.reduce((total, inventory) => total + inventory.stock, 0),
    discount: 0,
    category: product.categoria,
    brand: product.marca,
    image: product.imagen || undefined,
    tracksInventory: product.usarExistencias,
    warehouseStocks,
  };
}

export function warehouseSummary(product: Product): string {
  const warehouses = product.warehouseStocks || [];
  if (!warehouses.length) {
    return product.tracksInventory === false
      ? 'Producto sin control de existencias'
      : 'Sin inventario por almacén';
  }
  return warehouses
    .map(item =>
      `${item.warehouse}: ${item.stock} ${product.unit}`
      + (item.shelf && item.shelf !== '—' ? ` (${item.shelf})` : ''),
    )
    .join(' · ');
}
