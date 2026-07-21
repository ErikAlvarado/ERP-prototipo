import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../shared/services/autenticacion';

@Component({
  selector: 'app-register',
  imports: [SHARED_IMPORTS],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formularios = inject(FormBuilder);
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly error = signal('');
  readonly formulario = this.formularios.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmacion: ['', Validators.required],
  });

  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const datos = this.formulario.getRawValue();
    if (datos.password !== datos.confirmacion) {
      this.error.set('Las contrasenas no coinciden.');
      return;
    }
    if (!this.autenticacion.registrar(datos.nombre.trim(), datos.correo.trim(), datos.password)) {
      this.error.set('Ya existe una cuenta con ese correo.');
      return;
    }
    void this.router.navigate(['/login']);
  }

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update((valor) => !valor);
    event.stopPropagation();
  }

  toggleConfirmPasswordVisibility(event: MouseEvent): void {
    this.hideConfirmPassword.update((valor) => !valor);
    event.stopPropagation();
  }
}
