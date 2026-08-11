import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { GestionInventario } from '../gestion-inventario';
import { Ajustes } from './ajustes';

describe('Ajustes', () => {
  let component: Ajustes;
  let fixture: ComponentFixture<Ajustes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ajustes],
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

    fixture = TestBed.createComponent(Ajustes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
