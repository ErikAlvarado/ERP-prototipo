import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnidadesDialog } from './unidades-dialog';

describe('UnidadesDialog', () => {
  let component: UnidadesDialog;
  let fixture: ComponentFixture<UnidadesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnidadesDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
