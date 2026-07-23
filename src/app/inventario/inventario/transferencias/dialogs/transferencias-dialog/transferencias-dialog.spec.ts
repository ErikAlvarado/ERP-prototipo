import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TransferenciasDialog } from './transferencias-dialog';

describe('TransferenciasDialog', () => {
  let component: TransferenciasDialog;
  let fixture: ComponentFixture<TransferenciasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferenciasDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            productos: [],
            almacenes: [],
            usuarios: [],
            estados: ['Pendiente'],
            existencias: [],
            transferencias: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferenciasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
