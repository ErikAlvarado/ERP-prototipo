import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AlmacenesDialog } from './almacenes-dialog';

describe('AlmacenesDialog', () => {
  let component: AlmacenesDialog;
  let fixture: ComponentFixture<AlmacenesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlmacenesDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'add', empresas: [], almacenes: [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlmacenesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
