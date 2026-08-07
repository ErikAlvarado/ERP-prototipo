import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Venta, VentaStatus, PaymentMethod } from '../models/venta.model';
import { MOCK_SALES } from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private salesSubject = new BehaviorSubject<Venta[]>(MOCK_SALES);
  public sales$: Observable<Venta[]> = this.salesSubject.asObservable();

  constructor() {}

  getSales(): Observable<Venta[]> {
    return this.sales$;
  }

  getSaleByFolio(folio: string): Observable<Venta | undefined> {
    return this.sales$.pipe(
      delay(150),
      map(sales => sales.find(s => s.folio.toUpperCase() === folio.toUpperCase()))
    );
  }

  addSale(sale: Venta): void {
    const current = this.salesSubject.value;
    // Prepend to show newest first
    this.salesSubject.next([sale, ...current]);
  }

  updateSaleStatus(folio: string, status: VentaStatus, observation?: string): Observable<boolean> {
    return of(true).pipe(
      delay(300),
      map(() => {
        const current = this.salesSubject.value;
        const index = current.findIndex(s => s.folio === folio);
        if (index > -1) {
          const updated = [...current];
          updated[index] = {
            ...updated[index],
            status,
            observation: observation !== undefined ? observation : updated[index].observation
          };
          this.salesSubject.next(updated);
          return true;
        }
        return false;
      })
    );
  }

  getFilteredSales(filters: {
    startDate?: string;
    endDate?: string;
    clientName?: string;
    status?: VentaStatus;
    paymentMethod?: PaymentMethod;
    cashier?: string;
  }): Observable<Venta[]> {
    return this.sales$.pipe(
      delay(200),
      map(sales => {
        return sales.filter(s => {
          if (filters.startDate && s.date < filters.startDate) return false;
          if (filters.endDate && s.date > filters.endDate) return false;
          if (filters.clientName && !s.client.name.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
          if (filters.status && s.status !== filters.status) return false;
          if (filters.paymentMethod && s.paymentMethod !== filters.paymentMethod) return false;
          if (filters.cashier && !s.cashier.toLowerCase().includes(filters.cashier.toLowerCase())) return false;
          return true;
        });
      })
    );
  }

  // Dashboard Aggregations
  getSalesStats() {
    const sales = this.salesSubject.value;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7); // YYYY-MM

    let soldToday = 0;
    let salesCountToday = 0;
    let soldThisMonth = 0;
    let salesCountThisMonth = 0;

    sales.forEach(sale => {
      if (sale.status !== 'Cancelada') {
        if (sale.date === todayStr) {
          soldToday += sale.total;
          salesCountToday++;
        }
        if (sale.date.startsWith(currentMonth)) {
          soldThisMonth += sale.total;
          salesCountThisMonth++;
        }
      }
    });

    return {
      soldToday,
      salesCountToday,
      soldThisMonth,
      salesCountThisMonth
    };
  }
}
