import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Medidas } from './medidas';

describe('Medidas', () => {
  let component: Medidas;
  let fixture: ComponentFixture<Medidas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medidas],
    }).compileComponents();

    fixture = TestBed.createComponent(Medidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
