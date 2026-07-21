import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesDialog } from './roles-dialog';

describe('RolesDialog', () => {
  let component: RolesDialog;
  let fixture: ComponentFixture<RolesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
