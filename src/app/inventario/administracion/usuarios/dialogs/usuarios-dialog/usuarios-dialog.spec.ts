import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { UsuariosDialog } from './usuarios-dialog';

describe('UsuariosDialog', () => {
  let component: UsuariosDialog;
  let fixture: ComponentFixture<UsuariosDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'add',
            empresas: [],
            roles: [],
            almacenes: [],
            usuarios: [],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
