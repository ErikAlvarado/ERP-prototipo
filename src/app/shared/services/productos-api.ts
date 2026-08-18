import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ProductoApi {
  id: number; companyId: number; sku: string; barcode: string | null; name: string;
  type: string; description: string | null; brandId: number | null; categoryId: number | null;
  unitId: number; status: string; defaultLocation: string | null; pointOfSale: boolean;
  onlineCatalog: boolean; requiresPrescription: boolean; trackInventory: boolean;
  satCode: string | null; createdAt: string; updatedAt: string | null;
}
export interface PaginaProductosApi { items: ProductoApi[]; page: number; pageSize: number; total: number; }
export type GuardarProductoApi = Omit<ProductoApi, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class ProductosApi {
  private readonly ruta = '/api/v1/productos';
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<PaginaProductosApi> {
    return this.http.get<PaginaProductosApi>(this.ruta, { params: new HttpParams().set('pagina', 1).set('tamano', 100) });
  }
  crear(producto: GuardarProductoApi): Observable<ProductoApi> { return this.http.post<ProductoApi>(this.ruta, producto); }
  actualizar(id: number, producto: GuardarProductoApi): Observable<ProductoApi> { return this.http.put<ProductoApi>(`${this.ruta}/${id}`, producto); }
  desactivar(id: number): Observable<void> { return this.http.delete<void>(`${this.ruta}/${id}`); }
}
