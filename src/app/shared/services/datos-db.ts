import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatosDb {
  private readonly rutaBase = '/assets/db';

  constructor(private http: HttpClient) {}

  leer<T>(archivo: string, requerido = false): Observable<T[]> {
    const nombreSeguro = archivo.split('/').pop() || archivo;
    return this.http.get(`${this.rutaBase}/${encodeURIComponent(nombreSeguro)}?v=${Date.now()}`, { responseType: 'text' }).pipe(
      map(texto => this.parsear<T>(texto)),
      catchError(error => requerido
        ? throwError(() => new Error(`No se pudo cargar ${nombreSeguro} desde ${this.rutaBase}.`, { cause: error }))
        : of([] as T[])),
    );
  }

  private parsear<T>(texto: string): T[] {
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const encabezado = lineas.shift();
    if (!encabezado || !encabezado.includes('|') || /^\s*<!doctype|^\s*<html/i.test(encabezado)) return [];
    const columnas = encabezado.split('|').map(columna => columna.trim());
    return lineas.filter(fila => fila.trim()).map(fila => {
      const valores = fila.split('|');
      return Object.fromEntries(columnas.map((columna, indice) => [columna, valores[indice] ?? ''])) as T;
    });
  }
}
