import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { UnidadesDialog } from './unidades-dialog';

describe('UnidadesDialog', () => {
  let component: UnidadesDialog;
  let fixture: ComponentFixture<UnidadesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnidadesDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'add', empresas: [], existentes: [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
