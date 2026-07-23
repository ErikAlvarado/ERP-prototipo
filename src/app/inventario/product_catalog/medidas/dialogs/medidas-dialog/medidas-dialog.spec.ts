import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MedidasDialog } from './medidas-dialog';

describe('MedidasDialog', () => {
  let component: MedidasDialog;
  let fixture: ComponentFixture<MedidasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedidasDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'add', unidades: [], existentes: [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedidasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
