import '@angular/compiler';
import { ElementRef } from '@angular/core';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { Client } from '../../models/client.model';
import { Venta } from '../../models/venta.model';
import { PdvComponent } from './pdv.component';

describe('PdvComponent', () => {
  it('inicializa la venta completada al entrar y no requiere un segundo clic', async () => {
    const client: Client = {
      id: 'general',
      name: 'Público general',
      email: 'ventas@example.com',
      phone: '',
      rfc: 'XAXX010101000',
      address: 'Mostrador',
    };
    const saleService = {
      cartItems$: of([]),
      selectedClient$: of(client),
      selectedPayment$: of('Efectivo'),
      showTicket$: of(false),
      lastCompletedSale$: of(null),
      getAvailablePaymentMethods: async () => ['Efectivo'],
      setSelectedPayment: () => undefined,
    };
    const clientService = { clients$: of([client]) };
    const authService = {
      currentUser$: of({ name: 'Cajera', status: 'Online' }),
    };
    const discountService = { DISCOUNT_RULES: [] };
    const component = new PdvComponent(
      saleService as never,
      clientService as never,
      { warning: () => undefined } as never,
      authService as never,
      {} as never,
      discountService as never,
      new ElementRef({ querySelector: () => null }),
      {} as never,
    );

    expect(() => component.ngOnInit()).not.toThrow();
    expect(await firstValueFrom(component.completedSale$)).toBeNull();
  });

  it('muestra el ticket cuando el servicio publica la venta completada', () => {
    const client: Client = {
      id: 'general', name: 'Público general', email: '', phone: '',
      rfc: 'XAXX010101000', address: '',
    };
    const completedSale = new BehaviorSubject<Venta | null>(null);
    const saleService = {
      cartItems$: of([]), selectedClient$: of(client), selectedPayment$: of('Efectivo'),
      lastCompletedSale$: completedSale.asObservable(),
      getAvailablePaymentMethods: async () => ['Efectivo'],
      setSelectedPayment: () => undefined,
    };
    const component = new PdvComponent(
      saleService as never,
      { clients$: of([client]) } as never,
      { warning: () => undefined } as never,
      { currentUser$: of({ name: 'Cajera', status: 'Online' }) } as never,
      {} as never,
      { DISCOUNT_RULES: [] } as never,
      new ElementRef({ querySelector: () => null }),
      {} as never,
    );
    component.ngOnInit();

    completedSale.next({ folio: '1-1-1-20260818-000001' } as Venta);

    expect(component.showTicket()).toBe(true);
    expect(component.ticketSaleData.folio).toBe('1-1-1-20260818-000001');
  });
});
