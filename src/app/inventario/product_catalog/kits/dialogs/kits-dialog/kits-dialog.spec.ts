import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { KitDialogResult, KitsDialog } from './kits-dialog';

describe('KitsDialog', () => {
  let component: KitsDialog;
  let fixture: ComponentFixture<KitsDialog>;
  let resultadoCerrado: KitDialogResult | undefined;

  beforeEach(async () => {
    resultadoCerrado = undefined;
    await TestBed.configureTestingModule({
      imports: [KitsDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: (resultado: KitDialogResult) => { resultadoCerrado = resultado; } } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            productos: [{
              idProducto: 10,
              idEmpresa: 1,
              empresa: 'Empresa de prueba',
              sku: 'PROD-10',
              nombre: 'Producto de prueba',
              costo: 12.5,
              precio: 20,
              stock: 3,
            }],
            opciones: {
              empresas: [{ id: 1, idEmpresa: 1, nombre: 'Empresa de prueba' }],
              marcas: [{ id: 2, idEmpresa: 1, nombre: 'Marca de prueba' }],
              categorias: [{ id: 3, idEmpresa: 1, nombre: 'Categoría de prueba' }],
              unidades: [{ id: 4, idEmpresa: 1, nombre: 'Pieza' }],
              listasPrecios: [],
            },
            nombres: [],
            skus: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KitsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calcula el costo automáticamente al agregar y cambiar cantidades', () => {
    component.nuevoProductoId = 10;
    component.cantidadNueva = 2;
    component.agregarElemento();

    expect(component.kit.costo).toBe(25);
    component.kit.elementos[0].cantidad = 3;
    component.actualizarCantidad(component.kit.elementos[0]);
    expect(component.kit.costo).toBe(37.5);
  });

  it('impide agregar una cantidad mayor al stock disponible', () => {
    component.nuevoProductoId = 10;
    component.cantidadNueva = 4;
    component.agregarElemento();

    expect(component.kit.elementos).toHaveLength(0);
    expect(component.error).toContain('stock disponible de 3');
  });

  it('considera lo ya incluido al validar el stock del producto', () => {
    component.nuevoProductoId = 10;
    component.cantidadNueva = 2;
    component.agregarElemento();
    component.nuevoProductoId = 10;
    component.cantidadNueva = 2;
    component.agregarElemento();

    expect(component.kit.elementos[0].cantidad).toBe(2);
    expect(component.error).toContain('El kit ya incluye 2');
  });

  it('ignora cualquier costo manual y entrega el costo calculado al guardar', () => {
    component.kit.sku = 'KIT-PRUEBA';
    component.kit.nombre = 'Kit de prueba';
    component.kit.precio = 50;
    component.nuevoProductoId = 10;
    component.cantidadNueva = 2;
    component.agregarElemento();
    component.kit.costo = 999;

    component.guardar();

    expect(resultadoCerrado?.costo).toBe(25);
  });
});
