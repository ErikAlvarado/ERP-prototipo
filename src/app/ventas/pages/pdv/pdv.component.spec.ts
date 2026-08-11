import '@angular/compiler';
import { ElementRef } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { Client } from '../../models/client.model';
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
    };
    const clientService = { clients$: of([client]) };
    const authService = {
      currentUser$: of({ name: 'Cajera', status: 'Online' }),
    };
    const discountService = { DISCOUNT_RULES: [] };
    const component = new PdvComponent(
      saleService as never,
      clientService as never,
      {} as never,
      authService as never,
      {} as never,
      discountService as never,
      new ElementRef({ querySelector: () => null }),
    );

    expect(() => component.ngOnInit()).not.toThrow();
    expect(await firstValueFrom(component.completedSale$)).toBeNull();
  });
});
