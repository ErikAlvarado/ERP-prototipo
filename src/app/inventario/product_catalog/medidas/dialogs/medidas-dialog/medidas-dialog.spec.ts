import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedidasDialog } from './medidas-dialog';

describe('MedidasDialog', () => {
  let component: MedidasDialog;
  let fixture: ComponentFixture<MedidasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedidasDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(MedidasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
