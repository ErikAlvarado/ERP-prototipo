import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ProductD } from './product-d';

describe('ProductD', () => {
  let component: ProductD;
  let fixture: ComponentFixture<ProductD>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductD],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            opciones: {
              empresas: [{ id: 1, idEmpresa: 1, nombre: 'Empresa' }],
              marcas: [{ id: 1, idEmpresa: 1, nombre: 'Marca' }],
              categorias: [{ id: 1, idEmpresa: 1, nombre: 'Categoría' }],
              unidades: [{
                id: 1,
                idEmpresa: 1,
                nombre: 'Pieza',
                permiteDecimales: false,
              }],
              listasPrecios: [],
            },
            almacenes: [{ id: 1, idEmpresa: 1, nombre: 'Central' }],
            anaqueles: [{ id: '1', idEmpresa: 1, idAlmacen: 1, nombre: 'A1-01', estado: true }],
            productos: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductD);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige stock inicial positivo cuando controla existencias', () => {
    component.producto.producto = 'Producto nuevo';
    component.producto.sku = 'NUEVO-1';
    component.producto.inventarios[0].stock = 0;

    component.guardar();

    expect(component.error).toContain('mayor que cero');
  });
});
