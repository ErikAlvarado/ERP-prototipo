import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriasDialog } from './categorias-dialog';

describe('CategoriasDialog', () => {
  let component: CategoriasDialog;
  let fixture: ComponentFixture<CategoriasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriasDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
