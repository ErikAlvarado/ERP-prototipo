import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { EmpresasDialog } from './empresas-dialog';

describe('EmpresasDialog', () => {
  let component: EmpresasDialog;
  let fixture: ComponentFixture<EmpresasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpresasDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'add', rfcs: [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpresasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
