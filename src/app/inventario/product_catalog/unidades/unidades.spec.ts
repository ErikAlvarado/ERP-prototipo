import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Unidades } from './unidades';

describe('Unidades', () => {
  let component: Unidades;
  let fixture: ComponentFixture<Unidades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Unidades],
    }).compileComponents();

    fixture = TestBed.createComponent(Unidades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
