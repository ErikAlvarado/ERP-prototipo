import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { KitsDialog } from './kits-dialog';

describe('KitsDialog', () => {
  let component: KitsDialog;
  let fixture: ComponentFixture<KitsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitsDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            productos: [],
            opciones: {
              empresas: [],
              marcas: [],
              categorias: [],
              unidades: [],
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
});
