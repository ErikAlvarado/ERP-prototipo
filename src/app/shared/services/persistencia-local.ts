import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PersistenciaLocal {
  leer<T>(clave: string, valorInicial: T): T {
    try {
      const valor = localStorage.getItem(clave);
      return valor ? (JSON.parse(valor) as T) : valorInicial;
    } catch {
      return valorInicial;
    }
  }

  guardar<T>(clave: string, valor: T): void {
    localStorage.setItem(clave, JSON.stringify(valor));
  }

  eliminar(clave: string): void {
    localStorage.removeItem(clave);
  }
}
