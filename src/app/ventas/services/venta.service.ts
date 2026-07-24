import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Client } from '../models/client.model';
import { Venta, VentaItem, PaymentMethod, PaymentDetails } from '../models/venta.model';
import { InventoryService } from './inventory.service';
import { HistorialService } from './historial.service';
import { MOCK_CLIENTS } from './mock-data';
import { NotificationService } from './notification.service';
import { DescuentoService } from './descuento.service';

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private cartItemsSubject = new BehaviorSubject<VentaItem[]>([]);
  public cartItems$: Observable<VentaItem[]> = this.cartItemsSubject.asObservable();

  private selectedClientSubject = new BehaviorSubject<Client>(MOCK_CLIENTS[0]); // General Client ("Público General")
  public selectedClient$: Observable<Client> = this.selectedClientSubject.asObservable();

  private selectedPaymentSubject = new BehaviorSubject<PaymentMethod>('Efectivo');
  public selectedPayment$: Observable<PaymentMethod> = this.selectedPaymentSubject.asObservable();

  private lastCompletedSaleSubject = new BehaviorSubject<Venta | null>(null);
  public lastCompletedSale$: Observable<Venta | null> = this.lastCompletedSaleSubject.asObservable();

  private showTicketSubject = new BehaviorSubject<boolean>(false);
  public showTicket$: Observable<boolean> = this.showTicketSubject.asObservable();

  private folioCounter = 254;

  constructor(
    private inventoryService: InventoryService,
    private historialService: HistorialService,
    private notificationService: NotificationService,
    private descuentoService: DescuentoService
  ) {}

  getCartItems(): VentaItem[] {
    return this.cartItemsSubject.value;
  }

  getSelectedClient(): Client {
    return this.selectedClientSubject.value;
  }

  setSelectedClient(client: Client): void {
    this.selectedClientSubject.next(client);
  }

  setSelectedPayment(method: PaymentMethod): void {
    this.selectedPaymentSubject.next(method);
  }

  addToCart(product: Product, qty: number = 1): void {
    const current = this.cartItemsSubject.value;
    const existing = current.find(item => item.product.sku === product.sku);

    if (existing) {
      this.updateQuantity(product.sku, existing.quantity + qty);
    } else {
      // Calculate discount automatically from DescuentoService catalog
      const discountPct = this.descuentoService.getDiscountForProduct(product);
      const discountAmount = product.price * (discountPct / 100);
      
      const newItem: VentaItem = {
        product,
        quantity: qty,
        discount: discountPct,
        subtotal: (product.price - discountAmount) * qty
      };
      this.cartItemsSubject.next([...current, newItem]);
      this.notificationService.success(`Agregado: ${product.name}`);
    }
  }

  updateQuantity(sku: string, qty: number): void {
    if (qty <= 0) {
      this.removeFromCart(sku);
      return;
    }

    const current = this.cartItemsSubject.value;
    const item = current.find(i => i.product.sku === sku);

    if (item) {
      this.inventoryService.checkStock(sku).subscribe(stock => {
        if (qty > stock) {
          this.notificationService.warning(
            `Existencias insuficientes. Stock máximo: ${stock} pzas.`, 
            'Alerta de Stock'
          );
          qty = stock;
        }

        const updated = current.map(i => {
          if (i.product.sku === sku) {
            const discountPct = this.descuentoService.getDiscountForProduct(i.product);
            const discountAmount = i.product.price * (discountPct / 100);
            return {
              ...i,
              discount: discountPct,
              quantity: qty,
              subtotal: (i.product.price - discountAmount) * qty
            };
          }
          return i;
        });
        this.cartItemsSubject.next(updated);
      });
    }
  }

  updateDiscount(sku: string, discountPct: number): void {
    const current = this.cartItemsSubject.value;
    const updated = current.map(i => {
      if (i.product.sku === sku) {
        const pct = Math.max(0, Math.min(100, discountPct));
        const discountAmount = i.product.price * (pct / 100);
        return {
          ...i,
          discount: pct,
          subtotal: (i.product.price - discountAmount) * i.quantity
        };
      }
      return i;
    });
    this.cartItemsSubject.next(updated);
  }

  removeFromCart(sku: string): void {
    const current = this.cartItemsSubject.value;
    const filtered = current.filter(item => item.product.sku !== sku);
    this.cartItemsSubject.next(filtered);
    this.notificationService.info('Producto eliminado del carrito');
  }

  clearCart(): void {
    this.cartItemsSubject.next([]);
    this.selectedClientSubject.next(MOCK_CLIENTS[0]);
    this.selectedPaymentSubject.next('Efectivo');
  }

  getTotals() {
    const items = this.cartItemsSubject.value;
    let subtotal = 0;
    let totalDiscount = 0;
    
    items.forEach(item => {
      const originalSub = item.product.price * item.quantity;
      const finalSub = item.subtotal;
      subtotal += originalSub;
      totalDiscount += (originalSub - finalSub);
    });

    const netSubtotal = subtotal - totalDiscount;
    const tax = netSubtotal * 0.16; // 16% IVA
    const total = netSubtotal + tax;

    return {
      subtotal,
      discount: totalDiscount,
      tax,
      total
    };
  }

  private generateFolio(): string {
    this.folioCounter++;
    const padded = this.folioCounter.toString().padStart(6, '0');
    return `ZYR-2026-${padded}`;
  }

  checkout(cashierName: string, observation: string = '', paymentDetails?: PaymentDetails): Observable<Venta> {
    const items = this.cartItemsSubject.value;
    if (items.length === 0) {
      return throwError(() => new Error('El carrito está vacío'));
    }

    const client = this.selectedClientSubject.value;
    const payment = this.selectedPaymentSubject.value;
    const totals = this.getTotals();

    const reservationItems = items.map(i => ({ sku: i.product.sku, quantity: i.quantity }));

    return this.inventoryService.reserveProducts(reservationItems).pipe(
      switchMap(success => {
        if (!success) {
          this.notificationService.error(
            'Error al procesar la venta: Existencias insuficientes en inventario.',
            'Error de Inventario'
          );
          return throwError(() => new Error('Stock insuficiente en almacén'));
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const newSale: Venta = {
          id: 'v' + Math.random().toString(36).substring(2, 9),
          folio: this.generateFolio(),
          date: dateStr,
          time: timeStr,
          client,
          items: [...items],
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          paymentMethod: payment,
          paymentDetails,
          operationType: 'Venta',
          status: 'Pagada',
          cashier: cashierName,
          numProducts: items.reduce((acc, curr) => acc + curr.quantity, 0),
          observation: observation || (payment === 'Crédito' ? 'Crédito autorizado' : 'Venta de mostrador')
        };

        this.historialService.addSale(newSale);
        
        this.lastCompletedSaleSubject.next(newSale);
        this.showTicketSubject.next(true);

        this.notificationService.success(`Venta completada con éxito. Folio: ${newSale.folio}`);
        this.clearCart();
        return of(newSale);
      })
    );
  }

  closeTicket(): void {
    this.showTicketSubject.next(false);
    this.lastCompletedSaleSubject.next(null);
  }
}
