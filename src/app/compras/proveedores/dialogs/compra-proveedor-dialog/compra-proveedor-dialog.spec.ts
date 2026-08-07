import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '../../../../shared/material/importaciones-material';
import { ProductoCompra } from '../../../../shared/services/catalogo-compras';
import {
  CompraProveedorDialog,
  DatosCompraProveedorDialog,
} from './compra-proveedor-dialog';

describe('CompraProveedorDialog', () => {
  const cerrar = vi.fn();
  const producto: ProductoCompra = {
    id: 64,
    sku: 'KIT002',
    codigo: '750999000112',
    categoria: 'Tecnología',
    nombre: 'Kit Home Office',
    proveedorId: 1,
    proveedor: 'TecnoCentro',
    skuProveedor: 'TC-HO-001',
    precio: 100,
    unidad: 'Pieza',
    stock: 15,
    stockReorden: 20,
    existencias: [
      {
        almacenId: 1,
        almacen: 'Central',
        stock: 10,
        stockReorden: 5,
        stockCritico: 2,
        stockMaximo: 50,
        actualizadaEn: '2026-07-23',
      },
      {
        almacenId: 2,
        almacen: 'Norte',
        stock: 5,
        stockReorden: 10,
        stockCritico: 5,
        stockMaximo: 100,
        actualizadaEn: '2026-07-23',
      },
    ],
    relaciones: [],
    cantidadMinima: 2,
    diasEntrega: 5,
    favorito: false,
  };
  const data: DatosCompraProveedorDialog = {
    proveedor: {
      id: 1,
      inicial: 'T',
      nombre: 'TecnoCentro',
      razonSocial: 'Tecnología Integral SA',
      rfc: 'TIC180512AB3',
      direccionFiscal: 'Ciudad de México',
      categoria: 'Tecnología',
      contacto: 'Laura',
      correo: 'ventas@tecnocentro.mx',
      telefono: '5551001001',
      activo: true,
      estado: 'Activo',
      ultimaCompra: 'Sin compras',
      totalCompra: '$0',
      tiempoSurtido: '5 días hábiles',
      unidadCompra: 'Pieza',
      productosVinculados: 1,
      origen: 'base',
    },
    productos: [producto],
    almacenes: [
      { id: 1, nombre: 'Central' },
      { id: 2, nombre: 'Norte' },
    ],
  };

  beforeEach(() => {
    cerrar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
  });

  it('distribuye un producto entre varios almacenes sin folio ni crédito', () => {
    const dialogo = TestBed.runInInjectionContext(
      () => new CompraProveedorDialog(),
    );
    dialogo.agregarProducto(producto);
    dialogo.agregarDestino(producto.id);
    dialogo.guardar();

    expect(dialogo.formulario.contains('folio')).toBe(false);
    expect(dialogo.formulario.contains('condicionesPago')).toBe(false);
    const compra = cerrar.mock.calls[0][0];
    expect(compra.condiciones).toBe('Contado');
    expect(compra.destinos.map((destino: { almacenId: number }) =>
      destino.almacenId)).toEqual([1, 2]);
    expect(compra.total).toBeCloseTo(348);
  });
});
