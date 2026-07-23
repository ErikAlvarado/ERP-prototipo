import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AjustesDialog } from './ajustes-dialog';

describe('AjustesDialog', () => {
  let component: AjustesDialog;
  let fixture: ComponentFixture<AjustesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjustesDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            productos: [],
            almacenes: [],
            usuarios: [],
            existencias: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AjustesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
