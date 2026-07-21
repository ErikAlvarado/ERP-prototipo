import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Autenticacion } from '../../../shared/services/autenticacion';

@Component({
  selector: 'app-header',
  imports: [SHARED_IMPORTS],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  readonly sesion = this.autenticacion.sesion;

  cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
