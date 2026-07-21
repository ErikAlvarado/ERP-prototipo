import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjustesDialog } from './ajustes-dialog';

describe('AjustesDialog', () => {
  let component: AjustesDialog;
  let fixture: ComponentFixture<AjustesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjustesDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(AjustesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
