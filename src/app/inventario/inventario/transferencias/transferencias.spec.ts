import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transferencias } from './transferencias';

describe('Transferencias', () => {
  let component: Transferencias;
  let fixture: ComponentFixture<Transferencias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transferencias],
    }).compileComponents();

    fixture = TestBed.createComponent(Transferencias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
