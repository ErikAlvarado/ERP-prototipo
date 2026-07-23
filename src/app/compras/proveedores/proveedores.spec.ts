import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Proveedores } from './proveedores';

describe('Proveedores', () => {
  let component: Proveedores;
  let fixture: ComponentFixture<Proveedores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Proveedores],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Proveedores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe filtrar proveedores por razón social sin distinguir acentos', () => {
    component.buscar('electronica empresarial de mexico');
    expect(component.proveedoresFiltrados().map((proveedor) => proveedor.nombre)).toEqual([
      'Electronica Empresarial MX',
    ]);
  });
});
