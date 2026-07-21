import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductD } from './product-d';

describe('ProductD', () => {
  let component: ProductD;
  let fixture: ComponentFixture<ProductD>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductD],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductD);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
