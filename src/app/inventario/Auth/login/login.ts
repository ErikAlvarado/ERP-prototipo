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
  readonly hide = signal(true);
  readonly error = signal('');
  readonly formulario = this.formularios.nonNullable.group({
    correo: ['admin@zyro.mx', [Validators.required, Validators.email]],
    password: ['admin123', Validators.required],
  });

  iniciarSesion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { correo, password } = this.formulario.getRawValue();
    if (!this.autenticacion.iniciarSesion(correo, password)) {
      this.error.set('El correo o la contrasena no son correctos.');
      return;
    }
    void this.router.navigate(['/dashboard']);
  }

  clickEvent(event: MouseEvent): void {
    this.hide.update((valor) => !valor);
    event.stopPropagation();
  }
}
