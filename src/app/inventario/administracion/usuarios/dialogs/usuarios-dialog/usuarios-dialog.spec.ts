import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuariosDialog } from './usuarios-dialog';

describe('UsuariosDialog', () => {
  let component: UsuariosDialog;
  let fixture: ComponentFixture<UsuariosDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
