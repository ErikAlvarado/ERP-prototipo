import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { vi } from 'vitest';
import { MatDialog, MatSnackBar } from '../../shared/material/importaciones-material';
import { Autenticacion } from '../../shared/services/autenticacion';
import {
  CatalogoCompras,
  ProveedorCompra,
} from '../../shared/services/catalogo-compras';
import { OrdenesCompraService } from '../services/ordenes-compra.service';
import { AltaProductoProveedorDialog } from './dialogs/alta-producto-proveedor-dialog/alta-producto-proveedor-dialog';
import { CompraRegistrada } from './dialogs/compra-proveedor-dialog/compra-proveedor-dialog';
import { Proveedores } from './proveedores';

describe('Proveedores', () => {
  let component: Proveedores;
  let fixture: ComponentFixture<Proveedores>;
  const crearLote = vi.fn((entradas: Array<Record<string, unknown>>) =>
    entradas.map((entrada, indice) => ({
      folio: `OC-2026-020${indice}`,
      proveedor: String(entrada['proveedor']),
      articulos: 1,
      total: '$116.00',
      solicitante: 'Comprador',
      fecha: '2026-08-07',
      estado: 'Activo' as const,
      cancelable: true,
      actualizadaEn: '2026-08-07T10:00:00.000Z',
      historial: [],
    })));
  const abrirDialogo = vi.fn(() => ({
    afterClosed: () => ({ subscribe: () => undefined }),
  }));
  const proveedor: ProveedorCompra = {
    id: 1,
    inicial: 'E',
    nombre: 'Electronica Empresarial MX',
    razonSocial: 'Electrónica Empresarial de México SA de CV',
    rfc: 'EEM180512AB3',
    direccionFiscal: 'Ciudad de México',
    categoria: 'Tecnología',
    contacto: 'Patricia Reyes',
    correo: 'ventas@electronica.mx',
    telefono: '5500000000',
    activo: true,
    estado: 'Activo',
    ultimaCompra: 'Sin compras',
    totalCompra: '$0',
    tiempoSurtido: '5 días hábiles',
    unidadCompra: 'Pieza',
    productosVinculados: 1,
    origen: 'base',
  };

  beforeEach(async () => {
    crearLote.mockClear();
    abrirDialogo.mockClear();
    await TestBed.configureTestingModule({
      imports: [Proveedores],
      providers: [
        {
          provide: CatalogoCompras,
          useValue: {
            proveedores: signal([proveedor]),
            cargando: signal(false),
            guardandoTxt: signal(false),
            errorCarga: signal(''),
            almacenes: signal([{ id: 1, nombre: 'Central' }]),
            productosDeProveedor: () => [],
            recargar: () => undefined,
          },
        },
        {
          provide: OrdenesCompraService,
          useValue: { ordenes: signal([]), crearLote },
        },
        {
          provide: Autenticacion,
          useValue: { sesion: signal({ nombre: 'Comprador' }) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
        {
          provide: MatDialog,
          useValue: { open: abrirDialogo },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Proveedores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('debe filtrar proveedores por razón social sin distinguir acentos', () => {
    component.buscar('electronica empresarial de mexico');
    expect(component.proveedoresFiltrados().map(item => item.nombre)).toEqual([
      'Electronica Empresarial MX',
    ]);
  });

  it('registra todos los destinos de una compra en un solo lote de contado', () => {
    const compra: CompraRegistrada = {
      total: 232,
      fecha: new Date('2026-08-07T12:00:00'),
      fechaEntrega: '2026-08-15',
      notas: '',
      condiciones: 'Contado',
      destinos: [
        {
          almacenId: 1,
          almacen: 'Central',
          partidas: [{
            productoId: 64,
            nombre: 'Kit',
            sku: 'KIT002',
            cantidad: 1,
            precioUnitario: 100,
            impuestoPorcentaje: 16,
          }],
        },
        {
          almacenId: 2,
          almacen: 'Norte',
          partidas: [{
            productoId: 64,
            nombre: 'Kit',
            sku: 'KIT002',
            cantidad: 1,
            precioUnitario: 100,
            impuestoPorcentaje: 16,
          }],
        },
      ],
    };

    component['registrarOrdenes'](proveedor, compra);

    expect(crearLote).toHaveBeenCalledTimes(1);
    const lote = crearLote.mock.calls[0][0];
    expect(lote).toHaveLength(2);
    expect(lote.map(item => item['almacenId'])).toEqual([1, 2]);
    expect(lote.every(item => item['condiciones'] === 'Contado')).toBe(true);
  });

  it('abre el alta completa de producto para el proveedor', () => {
    component.agregarProducto(proveedor);

    expect(abrirDialogo).toHaveBeenCalledWith(
      AltaProductoProveedorDialog,
      expect.objectContaining({
        data: { proveedor },
        width: '1080px',
      }),
    );
  });
});
