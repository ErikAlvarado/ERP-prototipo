import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Autenticacion } from '../../../shared/services/autenticacion';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: Autenticacion,
          useValue: {
            perfilesDisponibles: () => of([]),
            iniciarSesionPrototipo: () => of(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request only a prototype profile, never a password', () => {
    expect(component.formulario.contains('usuarioId')).toBe(true);
    expect(component.formulario.contains('password')).toBe(false);
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
  });
});
