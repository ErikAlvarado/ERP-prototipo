import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { GestionInventario } from '../gestion-inventario';
import { Existencias } from './existencias';

describe('Existencias', () => {
  let component: Existencias;
  let fixture: ComponentFixture<Existencias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Existencias],
      providers: [
        provideRouter([]),
        {
          provide: GestionInventario,
          useValue: {
            cargar: () => of({
              productos: [],
              almacenes: [],
              usuarios: [],
              estadosTransferencia: [],
              existencias: [],
              movimientos: [],
              ajustes: [],
              transferencias: [],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Existencias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
