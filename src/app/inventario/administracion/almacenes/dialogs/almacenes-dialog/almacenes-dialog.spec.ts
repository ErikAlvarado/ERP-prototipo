import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlmacenesDialog } from './almacenes-dialog';

describe('AlmacenesDialog', () => {
  let component: AlmacenesDialog;
  let fixture: ComponentFixture<AlmacenesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlmacenesDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(AlmacenesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
