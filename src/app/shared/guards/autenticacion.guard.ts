import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { Autenticacion } from '../services/autenticacion';

const validarAcceso = (_route: unknown, state: { url: string }) => {
  const autenticacion = inject(Autenticacion);
  const router = inject(Router);
  if (!autenticacion.sesion()) return router.createUrlTree(['/login']);
  return autenticacion.puedeAcceder(state.url)
    ? true
    : router.createUrlTree([autenticacion.rutaInicial()]);
};

export const autenticacionGuard: CanActivateFn = validarAcceso;
export const autorizacionHijosGuard: CanActivateChildFn = validarAcceso;
