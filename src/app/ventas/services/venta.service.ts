import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Client } from '../models/client.model';
import { Venta, VentaItem, PaymentMethod, PaymentDetails } from '../models/venta.model';
import { InventoryService } from './inventory.service';
import { HistorialService } from './historial.service';
import { MOCK_CLIENTS } from './mock-data';
import { NotificationService } from './notification.service';
import { DescuentoService } from './descuento.service';
import { PersistenciaVentasTxt } from '../../shared/services/persistencia-ventas-txt';

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

  constructor(
    private inventoryService: InventoryService,
    private historialService: HistorialService,
    private notificationService: NotificationService,
    private descuentoService: DescuentoService,
    private ventasTxt: PersistenciaVentasTxt,
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
      this.inventoryService.checkStock(sku, item.product.stock).subscribe(stock => {
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
    let tax = 0;
    let total = 0;

    items.forEach(item => {
      const rate = item.product.taxRate || 0;
      const factor = 1 + rate / 100;
      const grossOriginal = item.product.price * item.quantity;
      const grossFinal = item.subtotal;
      const baseOriginal = grossOriginal / factor;
      const baseFinal = grossFinal / factor;
      subtotal += baseOriginal;
      totalDiscount += baseOriginal - baseFinal;
      tax += grossFinal - baseFinal;
      total += grossFinal;
    });

    return {
      subtotal,
      discount: totalDiscount,
      tax,
      total
    };
  }

  checkout(cashierName: string, observation: string = '', paymentDetails?: PaymentDetails): Observable<Venta> {
    const items = this.cartItemsSubject.value;
    if (items.length === 0) {
      return throwError(() => new Error('El carrito está vacío'));
    }

    const client = this.selectedClientSubject.value;
    const payment = this.selectedPaymentSubject.value;
    const totals = this.getTotals();

    const reservationItems = items.map(i => ({
      sku: i.product.sku,
      quantity: i.quantity,
      fallbackStock: i.product.stock,
    }));

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
          folio: '',
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

        return from(this.persistSale(newSale)).pipe(
          tap(savedSale => {
            this.historialService.addSale(savedSale);
            this.lastCompletedSaleSubject.next(savedSale);
            this.showTicketSubject.next(true);
            this.notificationService.success(`Venta completada con éxito. Folio: ${savedSale.folio}`);
            this.clearCart();
          }),
          catchError(error => this.inventoryService.releaseReservation(reservationItems).pipe(
            switchMap(() => throwError(() => error)),
          )),
        );
      })
    );
  }

  private async persistSale(sale: Venta): Promise<Venta> {
    type Row = Record<string, string>;
    const [sales, details, payments, clients] = await Promise.all([
      this.ventasTxt.leer<Row>('ventas.txt'),
      this.ventasTxt.leer<Row>('ventas_detalle.txt'),
      this.ventasTxt.leer<Row>('pagos_venta.txt'),
      this.ventasTxt.leer<Row>('clientes.txt'),
    ]);
    const nextId = (rows: Row[], field: string) =>
      Math.max(0, ...rows.map(row => Number(row[field]) || 0)) + 1;
    const money = (value: number) => value.toFixed(2);
    const saleId = nextId(sales, 'id_venta');
    const year = new Date().getFullYear();
    const folio = `ZYR-${year}-${String(saleId).padStart(6, '0')}`;
    const clientId = Number(sale.client.id.replace(/\D/g, '')) || 1;
    const validClientId = clients.some(client => Number(client['id_cliente']) === clientId) ? clientId : 1;
    const dateTime = `${sale.date} ${sale.time}:00`;
    const warehouseId = sale.items[0]?.product.warehouseStocks?.find(stock => stock.stock > 0)?.warehouseId || 1;
    sales.push({
      id_venta: String(saleId), folio, id_empresa: '1', id_almacen: String(warehouseId),
      id_usuario: '1', id_cliente: String(validClientId), id_lista_precio: '1', id_moneda: '1',
      fecha_venta: dateTime, subtotal: money(sale.subtotal), descuento: money(sale.discount),
      impuestos: money(sale.tax), total: money(sale.total), estatus: 'Completada',
      tipo_venta: sale.paymentMethod === 'Crédito' ? 'Credito' : 'Contado', observaciones: sale.observation,
    });
    let detailId = nextId(details, 'id_detalle_venta');
    for (const item of sale.items) {
      const taxRate = item.product.taxRate || 0;
      const factor = 1 + taxRate / 100;
      const grossUnitPrice = item.product.price;
      const grossTotal = item.subtotal;
      const net = grossTotal / factor;
      const tax = grossTotal - net;
      const netUnitPrice = grossUnitPrice / factor;
      details.push({
        id_detalle_venta: String(detailId++), id_venta: String(saleId), id_producto: item.product.id,
        id_unidad: '1', cantidad: item.quantity.toFixed(4), precio_unitario: money(netUnitPrice),
        descuento_porcentaje: money(item.discount), tasa_impuesto: money(taxRate),
        subtotal: money(net), impuesto: money(tax), total: money(grossTotal),
      });
    }
    const paymentIds: Record<PaymentMethod, number> = {
      Efectivo: 5, Tarjeta: 3, Transferencia: 1, Vales: 2, Crédito: 4,
    };
    payments.push({
      id_pago_venta: String(nextId(payments, 'id_pago_venta')), id_venta: String(saleId),
      id_metodo_pago: String(paymentIds[sale.paymentMethod]), id_moneda: '1', fecha_pago: dateTime,
      importe: money(sale.total), referencia: sale.paymentDetails?.authorizationCode
        || sale.paymentDetails?.transferReference || sale.paymentDetails?.voucherNumber || '',
      observaciones: sale.paymentMethod,
    });
    await this.ventasTxt.reemplazarVarias({ ventas: sales, detallesVenta: details, pagosVenta: payments });
    return { ...sale, id: `v${saleId}`, folio };
  }

  closeTicket(): void {
    this.showTicketSubject.next(false);
    this.lastCompletedSaleSubject.next(null);
  }
}
