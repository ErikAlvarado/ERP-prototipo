import { Injectable } from '@angular/core';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';

export interface RegistroCatalogo {
  id: string;
}

interface EstadoCatalogo<T> {
  registros: T[];
  eliminados: string[];
}

@Injectable({ providedIn: 'root' })
export class CatalogosPersistencia {
  constructor(private persistencia: PersistenciaLocal) {}

  combinar<T extends RegistroCatalogo>(clave: string, fuente: T[]): { registros: T[]; eliminados: string[] } {
    const estado = this.persistencia.leer<EstadoCatalogo<T>>(clave, { registros: [], eliminados: [] });
    const eliminados = new Set(estado.eliminados || []);
    const locales = new Map((estado.registros || []).map(registro => [registro.id, registro]));
    const idsFuente = new Set(fuente.map(registro => registro.id));

    const registros = fuente
      .filter(registro => !eliminados.has(registro.id))
      .map(registro => locales.get(registro.id) || registro);

    for (const registro of estado.registros || []) {
      if (!idsFuente.has(registro.id) && !eliminados.has(registro.id)) registros.push(registro);
    }

    return { registros, eliminados: [...eliminados] };
  }

  guardar<T extends RegistroCatalogo>(clave: string, registros: T[], eliminados: string[]): void {
    this.persistencia.guardar<EstadoCatalogo<T>>(clave, { registros, eliminados });
  }

  nuevoId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
