import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {
  Autenticacion, PerfilAccesoPrototipo,
} from '../../../shared/services/autenticacion';

@Component({
  selector: 'app-login',
  imports: [SHARED_IMPORTS],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly formularios = inject(FormBuilder);
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly perfiles = signal<PerfilAccesoPrototipo[]>([]);
  readonly formulario = this.formularios.nonNullable.group({
    usuarioId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.autenticacion.perfilesDisponibles().subscribe({
      next: perfiles => {
        this.perfiles.set(perfiles);
        this.cargando.set(false);
        if (!perfiles.length) this.error.set('No hay usuarios activos disponibles para el prototipo.');
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar la lista de usuarios.');
      },
    });
  }

  iniciarSesion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.autenticacion.iniciarSesionPrototipo(this.formulario.getRawValue().usuarioId)
      .subscribe({
        next: valido => {
          if (valido) {
            void this.router.navigate(['/dashboard']);
            return;
          }
          this.error.set('El usuario seleccionado ya no está activo.');
        },
        error: () => this.error.set('No fue posible iniciar el modo prototipo.'),
      });
  }
}
