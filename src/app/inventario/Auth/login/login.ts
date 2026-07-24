import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../shared/services/autenticacion';

@Component({
  selector: 'app-login',
  imports: [SHARED_IMPORTS],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formularios = inject(FormBuilder);
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly cargando = signal(false);
  readonly formulario = this.formularios.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
  });

  iniciarSesion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    const { correo, contrasena } = this.formulario.getRawValue();
    this.autenticacion.iniciarSesion(correo, contrasena).subscribe({
      next: valido => {
        this.cargando.set(false);
        if (valido) {
          void this.router.navigateByUrl(this.autenticacion.rutaInicial());
          return;
        }
        this.error.set('Correo o contrasena incorrectos.');
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No fue posible validar la cuenta.');
      },
    });
  }
}
