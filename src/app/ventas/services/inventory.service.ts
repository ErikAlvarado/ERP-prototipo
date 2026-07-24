import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { MOCK_PRODUCTS, MOCK_PRODUCT_DETAILS } from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor() {}

  /**
   * Consultar existencia (Check stock)
   */
  checkStock(sku: string): Observable<number> {
    return of(sku).pipe(
      delay(300),
      map(s => {
        const prod = MOCK_PRODUCTS.find(p => p.sku === s);
        return prod ? prod.stock : 0;
      })
    );
  }

  /**
   * Reservar productos (Reserve stock for pending checkouts or orders)
   */
  reserveProducts(items: { sku: string; quantity: number }[]): Observable<boolean> {
    return of(true).pipe(
      delay(500),
      map(() => {
        // Simulate checking and reserving stock on the server
        let allAvailable = true;
        for (const item of items) {
          const prod = MOCK_PRODUCTS.find(p => p.sku === item.sku);
          if (!prod || prod.stock < item.quantity) {
            allAvailable = false;
            break;
          }
        }
        
        if (allAvailable) {
          // Decrement mock stock in our mock DB to simulate reservation
          items.forEach(item => {
            const prod = MOCK_PRODUCTS.find(p => p.sku === item.sku);
            if (prod) prod.stock -= item.quantity;
          });
          return true;
        }
        return false;
      })
    );
  }

  /**
   * Liberar reserva (Release stock from cancelled transactions)
   */
  releaseReservation(items: { sku: string; quantity: number }[]): Observable<boolean> {
    return of(true).pipe(
      delay(400),
      map(() => {
        items.forEach(item => {
          const prod = MOCK_PRODUCTS.find(p => p.sku === item.sku);
          if (prod) prod.stock += item.quantity;
        });
        return true;
      })
    );
  }

  /**
   * Solicitar reingreso por devolución (Request stock return reentry)
   */
  requestReturnReentry(returnNumber: string, items: { sku: string; quantity: number }[]): Observable<boolean> {
    // Simulates an warehouse authorization process
    return of(true).pipe(
      delay(800),
      map(() => {
        items.forEach(item => {
          const prod = MOCK_PRODUCTS.find(p => p.sku === item.sku);
          if (prod) {
            prod.stock += item.quantity; // Put stock back on approval
          }
        });
        return true;
      })
    );
  }

  /**
   * Consultar disponibilidad y ubicación (Get availability and warehouse slot)
   */
  checkAvailability(sku: string): Observable<{ available: boolean; location: string }> {
    return of(sku).pipe(
      delay(250),
      map(s => {
        const prod = MOCK_PRODUCTS.find(p => p.sku === s);
        const details = MOCK_PRODUCT_DETAILS[s];
        return {
          available: prod ? prod.stock > 0 : false,
          location: details ? details.location : 'Ubicación no asignada'
        };
      })
    );
  }

  /**
   * Obtener ubicación del producto
   */
  getProductLocation(sku: string): Observable<string> {
    return of(sku).pipe(
      delay(200),
      map(s => MOCK_PRODUCT_DETAILS[s]?.location || 'Desconocido')
    );
  }

  /**
   * Obtener lote (Get product batch)
   */
  getProductBatch(sku: string): Observable<string> {
    return of(sku).pipe(
      delay(200),
      map(s => MOCK_PRODUCT_DETAILS[s]?.batch || 'LOTE-N/A')
    );
  }

  /**
   * Obtener número de serie (Get product serial number)
   */
  getProductSerialNumber(sku: string): Observable<string> {
    return of(sku).pipe(
      delay(200),
      map(s => MOCK_PRODUCT_DETAILS[s]?.serialNumber || 'SN-N/A')
    );
  }
}
