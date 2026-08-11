import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Autenticacion } from '../../shared/services/autenticacion';
import {
  OrdenCompraTxtPersistida,
  PersistenciaComprasTxt,
} from '../../shared/services/persistencia-compras-txt';
import { NuevaOrdenCompra, OrdenesCompraService } from './ordenes-compra.service';

const ordenPersistida = (estado = 'Activo'): OrdenCompraTxtPersistida => ({
  folio: 'OC-2026-0100',
  proveedor: 'Proveedor Uno',
  articulos: 2,
  total: '$232.00',
  solicitante: 'Compras',
  fecha: '2026-08-10',
  estado,
  cancelable: true,
  actualizadaEn: '2026-08-10T12:00:00',
  historial: [{ id: '1', estado, fecha: '2026-08-10T12:00:00', comentario: 'Orden registrada.' }],
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
});

describe('OrdenesCompraService', () => {
  const api = {
    listarOrdenes: vi.fn(),
    registrarOrdenes: vi.fn(),
    actualizarEstadoOrden: vi.fn(),
  };

  beforeEach(() => {
    api.listarOrdenes.mockReset().mockResolvedValue([]);
    api.registrarOrdenes.mockReset().mockResolvedValue([ordenPersistida()]);
    api.actualizarEstadoOrden.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        OrdenesCompraService,
        { provide: PersistenciaComprasTxt, useValue: api },
        { provide: Autenticacion, useValue: { sesion: () => ({ id: '1' }) } },
      ],
    });
  });

  it('carga las órdenes desde compras_bd, no desde localStorage', async () => {
    api.listarOrdenes.mockResolvedValue([ordenPersistida()]);
    const servicio = TestBed.inject(OrdenesCompraService);

    await servicio.recargar();

    expect(servicio.ordenes()[0].folio).toBe('OC-2026-0100');
    expect(api.listarOrdenes).toHaveBeenCalled();
  });

  it('crea un lote mediante la API TXT', async () => {
    const servicio = TestBed.inject(OrdenesCompraService);
    const entradas: NuevaOrdenCompra[] = [{
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
    }];

    const creadas = await servicio.crearLote(entradas);

    expect(creadas[0].folio).toBe('OC-2026-0100');
    expect(api.registrarOrdenes).toHaveBeenCalledWith([
      expect.objectContaining({ proveedor: 'Proveedor Uno', compradorId: 1, almacenId: 1 }),
    ]);
  });

  it('guarda el cambio de estado en TXT y recarga', async () => {
    api.listarOrdenes
      .mockResolvedValueOnce([ordenPersistida()])
      .mockResolvedValue([ordenPersistida('En transito')]);
    const servicio = TestBed.inject(OrdenesCompraService);
    await servicio.recargar();

    await servicio.actualizarEstado('OC-2026-0100', 'En transito');

    expect(api.actualizarEstadoOrden).toHaveBeenCalledWith(
      'OC-2026-0100', 'En transito', 1, 'Estado actualizado a En transito.',
    );
    expect(servicio.ordenes()[0].estado).toBe('En transito');
  });
});
