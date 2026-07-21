import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferenciasDialog } from './transferencias-dialog';

describe('TransferenciasDialog', () => {
  let component: TransferenciasDialog;
  let fixture: ComponentFixture<TransferenciasDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferenciasDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferenciasDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
