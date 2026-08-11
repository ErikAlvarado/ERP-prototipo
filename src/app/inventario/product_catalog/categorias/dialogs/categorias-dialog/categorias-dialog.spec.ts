import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CategoriasDialog } from './categorias-dialog';

describe('CategoriasDialog', () => {
  let component: CategoriasDialog;
  let fixture: ComponentFixture<CategoriasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriasDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            categorias: [],
            empresas: [],
            existentes: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
