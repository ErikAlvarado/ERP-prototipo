import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';
import {
  NuevaOrdenCompra,
  OrdenesCompraService,
} from './ordenes-compra.service';

describe('OrdenesCompraService', () => {
  const persistencia = {
    leer: vi.fn(),
    guardar: vi.fn(),
  };

  beforeEach(() => {
    persistencia.leer.mockReset().mockReturnValue([]);
    persistencia.guardar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        OrdenesCompraService,
        { provide: PersistenciaLocal, useValue: persistencia },
      ],
    });
  });

  it('migra solo la orden demo antigua en tránsito a completada', () => {
    persistencia.leer.mockReturnValue([{
      folio: 'OC-2025-0088',
      proveedor: 'Electrónica Empresarial MX',
      articulos: 3,
      total: '$42,300',
      solicitante: 'Marco Jiménez',
      fecha: '2025-06-16',
      estado: 'En transito',
      cancelable: true,
    }]);

    const servicio = TestBed.inject(OrdenesCompraService);
    const migrada = servicio.ordenes().find(orden =>
      orden.folio === 'OC-2025-0088');

    expect(migrada?.estado).toBe('Completado');
    expect(migrada?.cancelable).toBe(false);
    expect(migrada?.historial.at(-1)?.estado).toBe('Completado');
  });

  it('crea un lote multialmacén de forma atómica e incluye IVA', () => {
    const servicio = TestBed.inject(OrdenesCompraService);
    persistencia.guardar.mockClear();
    const entradas: NuevaOrdenCompra[] = [
      {
        proveedor: 'Proveedor Uno',
        solicitante: 'Compras',
        almacenId: 1,
        almacen: 'Almacén Central',
        fechaEntrega: '2026-08-20',
        condiciones: 'Contado',
        partidas: [{
          productoId: 10,
          nombre: 'Producto gravado',
          sku: 'SKU-10',
          cantidad: 2,
          precioUnitario: 100,
          impuestoPorcentaje: 16,
        }],
      },
      {
        proveedor: 'Proveedor Uno',
        solicitante: 'Compras',
        almacenId: 2,
        almacen: 'Almacén Norte',
        fechaEntrega: '2026-08-22',
        condiciones: 'Contado',
        partidas: [{
          productoId: 11,
          nombre: 'Producto tasa cero',
          sku: 'SKU-11',
          cantidad: 1,
          precioUnitario: 50,
          impuestoPorcentaje: 0,
        }],
      },
    ];

    const creadas = servicio.crearLote(entradas);

    expect(creadas).toHaveLength(2);
    expect(new Set(creadas.map(orden => orden.folio)).size).toBe(2);
    expect(creadas[0].total.replace(/[^\d.]/g, '')).toBe('232.00');
    expect(creadas[0].almacen).toBe('Almacén Central');
    expect(creadas[0].condiciones).toBe('Contado');
    expect(servicio.ordenes().slice(0, 2)).toEqual(creadas);
    expect(persistencia.guardar).toHaveBeenCalledTimes(1);
  });

  it('publica los cambios de estado en la misma signal compartida', () => {
    const servicio = TestBed.inject(OrdenesCompraService);
    const folio = servicio.ordenes()[0].folio;

    servicio.actualizarEstado(folio, 'En transito');

    expect(servicio.ordenes().find(orden => orden.folio === folio)?.estado)
      .toBe('En transito');
    expect(servicio.actividadReciente()[0].folio).toBe(folio);
  });
});
