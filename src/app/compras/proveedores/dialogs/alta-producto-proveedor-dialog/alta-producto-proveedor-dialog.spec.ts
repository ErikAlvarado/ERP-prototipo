import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatSnackBar,
} from '../../../../shared/material/importaciones-material';
import {
  CatalogoCompras,
  ProductoCompra,
  ProveedorCompra,
} from '../../../../shared/services/catalogo-compras';
import { CatalogoProductos } from '../../../../shared/services/catalogo-productos';
import { AdministracionDatos } from '../../../../inventario/administracion/administracion-datos';
import { AnaquelesCatalogo } from '../../../../inventario/product_catalog/anaqueles/anaqueles-catalogo';
import {
  AltaProductoProveedorDialog,
  DatosAltaProductoProveedorDialog,
} from './alta-producto-proveedor-dialog';

describe('AltaProductoProveedorDialog', () => {
  let fixture: ComponentFixture<AltaProductoProveedorDialog>;
  let component: AltaProductoProveedorDialog;

  const proveedor: ProveedorCompra = {
    id: 7,
    inicial: 'T',
    nombre: 'Tecnología del Centro',
    razonSocial: 'Tecnología del Centro SA de CV',
    rfc: 'TCE200101AB1',
    direccionFiscal: 'Ciudad de México',
    categoria: 'Tecnología',
    contacto: 'Ana Pérez',
    correo: 'ventas@tecnologia.test',
    telefono: '5555555555',
    activo: true,
    estado: 'Activo',
    ultimaCompra: 'Sin compras',
    totalCompra: '$0',
    tiempoSurtido: '2 días hábiles',
    unidadCompra: 'Pieza',
    productosVinculados: 0,
    origen: 'base',
  };

  const productoCreado: ProductoCompra = {
    id: 101,
    sku: 'MON-NEW-01',
    codigo: '750000000001',
    categoria: 'Monitores',
    nombre: 'Monitor profesional 27 pulgadas',
    proveedorId: proveedor.id,
    proveedor: proveedor.nombre,
    skuProveedor: 'PROV-MON-27',
    precio: 2800,
    unidad: 'Pieza',
    stock: 1,
    stockReorden: 4,
    existencias: [],
    relaciones: [],
    cantidadMinima: 2,
    diasEntrega: 3,
    favorito: false,
  };

  const registrarProductoProveedor = vi.fn(async () => productoCreado);
  const cerrar = vi.fn();

  beforeEach(async () => {
    registrarProductoProveedor.mockClear();
    cerrar.mockClear();

    await TestBed.configureTestingModule({
      imports: [AltaProductoProveedorDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            proveedor,
          } satisfies DatosAltaProductoProveedorDialog,
        },
        {
          provide: MatDialogRef,
          useValue: { close: cerrar },
        },
        {
          provide: MatSnackBar,
          useValue: { open: vi.fn() },
        },
        {
          provide: CatalogoCompras,
          useValue: { registrarProductoProveedor },
        },
        {
          provide: CatalogoProductos,
          useValue: {
            cargarOpciones: () => of({
              empresas: [{ id: 1, idEmpresa: 1, nombre: 'Empresa principal' }],
              marcas: [{ id: 2, idEmpresa: 1, nombre: 'ViewPro' }],
              categorias: [{ id: 3, idEmpresa: 1, nombre: 'Monitores' }],
              unidades: [{ id: 4, idEmpresa: 1, nombre: 'Pieza' }],
              listasPrecios: [],
            }),
            cargar: () => of([]),
          },
        },
        {
          provide: AdministracionDatos,
          useValue: {
            cargar: () => of({
              empresas: [{
                id: '1',
                nombre: 'Empresa principal',
                estado: true,
              }],
              almacenes: [{
                id: '10',
                empresaId: '1',
                nombre: 'Almacén central',
                estado: true,
              }],
            }),
          },
        },
        {
          provide: AnaquelesCatalogo,
          useValue: {
            cargar: () => of([{
              id: '30',
              idEmpresa: 1,
              idAlmacen: 10,
              nombre: 'A-03',
              estado: true,
            }]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaProductoProveedorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('crea el producto completo y lo vincula al proveedor seleccionado', async () => {
    component.formulario.patchValue({
      nombre: 'Monitor profesional 27 pulgadas',
      sku: 'MON-NEW-01',
      codigo: '750000000001',
      descripcion: 'Monitor IPS para estaciones de trabajo',
      tipo: 'Físico',
      costo: 2500,
      precio: 3200,
      skuProveedor: 'PROV-MON-27',
      precioReferencia: 2800,
      diasEntrega: 3,
      cantidadMinima: 2,
    });
    component.inventarios.at(0).patchValue({
      stock: 1,
      stockCritico: 1,
      stockReorden: 4,
      stockMaximo: 20,
      idAnaquel: 30,
    });

    await component.guardar();

    expect(registrarProductoProveedor).toHaveBeenCalledTimes(1);
    expect(registrarProductoProveedor).toHaveBeenCalledWith(
      proveedor.id,
      expect.objectContaining({
        nombre: 'Monitor profesional 27 pulgadas',
        sku: 'MON-NEW-01',
        codigo: '750000000001',
        idEmpresa: 1,
        idMarca: 2,
        idCategoria: 3,
        idUnidad: 4,
        skuProveedor: 'PROV-MON-27',
        precioReferencia: 2800,
        inventarios: [{
          idAlmacen: 10,
          idAnaquel: 30,
          stock: 1,
          stockCritico: 1,
          stockReorden: 4,
          stockMaximo: 20,
          anaquel: 'A-03',
        }],
      }),
    );
    expect(cerrar).toHaveBeenCalledWith(productoCreado);
  });

  it('utiliza controles oficiales de Angular Material', () => {
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelectorAll('mat-form-field').length).toBeGreaterThan(10);
    expect(elemento.querySelectorAll('mat-checkbox')).toHaveLength(4);
    expect(elemento.querySelector('button[mat-flat-button]')).toBeTruthy();
  });
});
