import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Filtro } from './filtro';

describe('Filtro', () => {
  let component: Filtro;
  let fixture: ComponentFixture<Filtro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Filtro],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            filtros: {
              empresa: '',
              categoria: '',
              marca: '',
              unidad: '',
              tipo: '',
              anaquel: '',
              conCodigo: null,
              pos: null,
              visible: null,
              estado: null,
              requiereReceta: null,
              usarExistencias: null,
            },
            empresas: [],
            categorias: [],
            marcas: [],
            unidades: [],
            anaqueles: [],
            tipos: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Filtro);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
