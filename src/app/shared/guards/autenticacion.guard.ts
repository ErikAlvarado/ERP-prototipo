import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/autenticacion';

export const autenticacionGuard: CanActivateFn = () => {
  const autenticacion = inject(Autenticacion);
  const router = inject(Router);
  return autenticacion.sesion() ? true : router.createUrlTree(['/login']);
};
