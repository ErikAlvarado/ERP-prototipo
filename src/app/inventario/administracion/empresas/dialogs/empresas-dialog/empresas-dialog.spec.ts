import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpresasDialog } from './empresas-dialog';

describe('EmpresasDialog', () => {
  let component: EmpresasDialog;
  let fixture: ComponentFixture<EmpresasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpresasDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpresasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
