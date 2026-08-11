import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PersistenciaComprasTxt } from './persistencia-compras-txt';

describe('PersistenciaComprasTxt', () => {
  let servicio: PersistenciaComprasTxt;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PersistenciaComprasTxt,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    servicio = TestBed.inject(PersistenciaComprasTxt);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía el producto del proveedor al servicio que escribe los TXT', async () => {
    const guardado = servicio.registrarProductoProveedor(7, {
      producto: {} as never,
      relacion: {
        skuProveedor: 'SKU-01',
        precioReferencia: 100,
        diasEntrega: 2,
        cantidadMinima: 1,
      },
    });

    await Promise.resolve();
    const solicitud = http.expectOne('/api/compras-txt/proveedores/7/productos');
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ ok: true });

    await expect(guardado).resolves.toBeUndefined();
  });
});
