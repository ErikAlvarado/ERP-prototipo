import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MarcasDialog } from './marcas-dialog';

describe('MarcasDialog', () => {
  let component: MarcasDialog;
  let fixture: ComponentFixture<MarcasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarcasDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'add', empresas: [], existentes: [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarcasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
