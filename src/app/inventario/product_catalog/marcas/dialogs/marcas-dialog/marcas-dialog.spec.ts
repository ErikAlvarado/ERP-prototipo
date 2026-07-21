import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarcasDialog } from './marcas-dialog';

describe('MarcasDialog', () => {
  let component: MarcasDialog;
  let fixture: ComponentFixture<MarcasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarcasDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(MarcasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
