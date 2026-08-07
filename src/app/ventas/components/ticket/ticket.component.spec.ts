import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { Venta } from '../../models/venta.model';
import { buildTicketPdfLines } from './ticket.component';

describe('contenido del PDF de ticket', () => {
  it('incluye empresa, operación, partidas, impuestos, pago y cambio', () => {
    const content = buildTicketPdfLines(createSale())
      .map(line => line.text)
      .join('\n');

    expect(content).toContain('ZYRO POS');
    expect(content).toContain('RFC: ZYR260101XYZ');
    expect(content).toContain('FOLIO: F-TEST-001');
    expect(content).toContain('FECHA: 2026-08-07 11:30');
    expect(content).toContain('EMPLEADO / CAJERO: EMP-001 - Ana Cajera');
    expect(content).toContain('CLIENTE: Cliente Prueba');
    expect(content).toContain('RFC CLIENTE: CUPR800101AA1');
    expect(content).toContain('1. Producto de prueba');
    expect(content).toContain('CANTIDAD / PRECIO U.: 2 x $100.00');
    expect(content).toContain('DESCUENTO CATÁLOGO (10%): -$20.00');
    expect(content).toContain('SUBTOTAL: $200.00');
    expect(content).toContain('IVA (16%): $28.80');
    expect(content).toContain('TOTAL: $208.80 MXN');
    expect(content).toContain('FORMA DE PAGO: EFECTIVO');
    expect(content).toContain('EFECTIVO RECIBIDO: $250.00');
    expect(content).toContain('CAMBIO ENTREGADO: $41.20');
    expect(content).toContain('OBSERVACIÓN: Venta completa de prueba');
  });
});

function createSale(): Venta {
  return {
    id: 'sale-test',
    folio: 'F-TEST-001',
    date: '2026-08-07',
    time: '11:30',
    client: {
      id: 'client-test',
      name: 'Cliente Prueba',
      email: 'cliente@example.com',
      phone: '555-0101',
      rfc: 'CUPR800101AA1',
      address: 'Av. Prueba 123',
    },
    items: [{
      product: {
        id: '10',
        code: '750000000010',
        name: 'Producto de prueba',
        sku: 'SKU-TEST',
        price: 100,
        unit: 'Pieza',
        stock: 12,
        discount: 0,
        category: 'Pruebas',
      },
      quantity: 2,
      discount: 10,
      subtotal: 180,
    }],
    subtotal: 200,
    tax: 28.8,
    discount: 20,
    total: 208.8,
    paymentMethod: 'Efectivo',
    paymentDetails: {
      cashReceived: 250,
      changeGiven: 41.2,
    },
    operationType: 'Venta',
    status: 'Pagada',
    cashier: 'Ana Cajera',
    numProducts: 2,
    observation: 'Venta completa de prueba',
  };
}
