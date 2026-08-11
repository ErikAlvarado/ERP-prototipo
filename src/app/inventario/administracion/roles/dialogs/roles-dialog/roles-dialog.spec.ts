import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { RolesDialog } from './roles-dialog';

describe('RolesDialog', () => {
  let component: RolesDialog;
  let fixture: ComponentFixture<RolesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            empresas: [],
            permisos: [],
            roles: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
