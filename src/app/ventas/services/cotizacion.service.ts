import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, switchMap, tap } from 'rxjs/operators';
import { Cotizacion, CotizacionStatus } from '../models/cotizacion.model';
import { MOCK_QUOTES } from './mock-data';
import { VentaService } from './venta.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class CotizacionService {
  private quotesSubject = new BehaviorSubject<Cotizacion[]>(MOCK_QUOTES);
  public quotes$: Observable<Cotizacion[]> = this.quotesSubject.asObservable();

  constructor(
    private ventaService: VentaService,
    private notificationService: NotificationService
  ) {}

  getQuotes(): Observable<Cotizacion[]> {
    return this.quotes$.pipe(delay(200));
  }

  getQuoteById(id: string): Observable<Cotizacion | undefined> {
    return this.quotes$.pipe(
      delay(150),
      map(quotes => quotes.find(q => q.id === id))
    );
  }

  addQuote(quote: Omit<Cotizacion, 'id' | 'folio'>): Observable<Cotizacion> {
    const newQuote: Cotizacion = {
      ...quote,
      id: 'q' + Math.random().toString(36).substring(2, 9),
      folio: 'COT-' + (20000 + Math.floor(Math.random() * 80000))
    };

    return of(newQuote).pipe(
      delay(300),
      map(q => {
        const current = this.quotesSubject.value;
        this.quotesSubject.next([q, ...current]);
        this.notificationService.success(`Cotización creada con folio ${q.folio}`);
        return q;
      })
    );
  }

  updateQuote(updated: Cotizacion): Observable<boolean> {
    return of(true).pipe(
      delay(300),
      map(() => {
        const current = this.quotesSubject.value;
        const idx = current.findIndex(q => q.id === updated.id);
        if (idx > -1) {
          const list = [...current];
          list[idx] = updated;
          this.quotesSubject.next(list);
          this.notificationService.info(`Cotización ${updated.folio} actualizada`);
          return true;
        }
        return false;
      })
    );
  }

  deleteQuote(id: string): Observable<boolean> {
    return of(id).pipe(
      delay(250),
      map(qid => {
        const current = this.quotesSubject.value;
        const target = current.find(q => q.id === qid);
        if (target) {
          this.quotesSubject.next(current.filter(q => q.id !== qid));
          this.notificationService.success(`Cotización ${target.folio} eliminada`);
          return true;
        }
        return false;
      })
    );
  }

  duplicateQuote(id: string): Observable<Cotizacion | undefined> {
    return this.getQuoteById(id).pipe(
      delay(300),
      map(original => {
        if (!original) return undefined;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        // Expiration date in 15 days
        const exp = new Date();
        exp.setDate(exp.getDate() + 15);
        const expStr = exp.toISOString().split('T')[0];

        const duplicate: Cotizacion = {
          ...original,
          id: 'q' + Math.random().toString(36).substring(2, 9),
          folio: 'COT-' + (20000 + Math.floor(Math.random() * 80000)),
          date: dateStr,
          expirationDate: expStr,
          status: 'Vigente'
        };

        const current = this.quotesSubject.value;
        this.quotesSubject.next([duplicate, ...current]);
        this.notificationService.success(`Cotización duplicada como ${duplicate.folio}`);
        return duplicate;
      })
    );
  }

  convertQuoteToSale(id: string, cashierName: string): Observable<any> {
    return this.getQuoteById(id).pipe(
      switchMap(quote => {
        if (!quote) return throwError(() => new Error('Cotización no encontrada'));
        if (quote.status !== 'Vigente') {
          return throwError(() => new Error('Solo se pueden convertir cotizaciones Vigentes'));
        }

        // Set cart items in VentaService
        this.ventaService.clearCart();
        this.ventaService.setSelectedClient(quote.client);
        
        quote.items.forEach(item => {
          this.ventaService.addToCart(item.product, item.quantity);
          // Apply line discount
          this.ventaService.updateDiscount(item.product.sku, item.discount);
        });

        // Trigger checkout
        return this.ventaService.checkout(cashierName, `Convertida desde ${quote.folio}`).pipe(
          tap(() => {
            // Update quote status
            this.updateQuoteStatus(quote.id, 'Convertida');
            this.notificationService.success(`Cotización ${quote.folio} convertida a venta.`);
          })
        );
      })
    );
  }

  updateQuoteStatus(id: string, status: CotizacionStatus): void {
    const current = this.quotesSubject.value;
    const idx = current.findIndex(q => q.id === id);
    if (idx > -1) {
      const list = [...current];
      list[idx] = { ...list[idx], status };
      this.quotesSubject.next(list);
    }
  }
}
