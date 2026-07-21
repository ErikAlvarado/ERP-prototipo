import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KitsDialog } from './kits-dialog';

describe('KitsDialog', () => {
  let component: KitsDialog;
  let fixture: ComponentFixture<KitsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitsDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(KitsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
