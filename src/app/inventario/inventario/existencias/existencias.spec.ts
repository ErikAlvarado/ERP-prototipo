import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Existencias } from './existencias';

describe('Existencias', () => {
  let component: Existencias;
  let fixture: ComponentFixture<Existencias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Existencias],
    }).compileComponents();

    fixture = TestBed.createComponent(Existencias);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
