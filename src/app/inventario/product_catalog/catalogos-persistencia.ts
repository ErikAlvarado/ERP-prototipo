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

  combinar<T extends RegistroCatalogo>(
    clave: string,
    fuente: T[],
    bajaLogica = fuente.some(registro => this.tieneEstado(registro)),
  ): { registros: T[]; eliminados: string[] } {
    const estado = this.persistencia.leer<EstadoCatalogo<T>>(clave, { registros: [], eliminados: [] });
    const eliminados = new Set(estado.eliminados || []);
    const locales = new Map((estado.registros || []).map(registro => [registro.id, registro]));
    const idsFuente = new Set(fuente.map(registro => registro.id));
    const admiteBajaLogica = bajaLogica;

    const registros = fuente
      .filter(registro => !eliminados.has(registro.id) || admiteBajaLogica)
      .map(registro => {
        const combinado = locales.get(registro.id) || registro;
        return eliminados.has(registro.id) && this.tieneEstado(combinado)
          ? { ...combinado, estado: false }
          : combinado;
      });

    for (const registro of estado.registros || []) {
      if (!idsFuente.has(registro.id) && !eliminados.has(registro.id)) registros.push(registro);
    }

    registros.sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id));
    return { registros, eliminados: admiteBajaLogica ? [] : [...eliminados] };
  }

  guardar<T extends RegistroCatalogo>(clave: string, registros: T[], eliminados: string[]): void {
    this.persistencia.guardar<EstadoCatalogo<T>>(clave, { registros, eliminados });
  }

  nuevoId(): string {
    // Catalog foreign keys are numeric in the TXT schema. A timestamp keeps
    // local additions unique while remaining a valid numeric FK for products.
    return String(Date.now());
  }

  private numeroId(id: string): number {
    const directo = Number(id);
    if (Number.isFinite(directo)) return directo;
    const numeros = id.match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : Number.MAX_SAFE_INTEGER;
  }

  private tieneEstado(registro: RegistroCatalogo): registro is RegistroCatalogo & { estado: boolean } {
    return typeof (registro as RegistroCatalogo & { estado?: unknown }).estado === 'boolean';
  }
}
