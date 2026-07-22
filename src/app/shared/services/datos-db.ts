import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatosDb {
  constructor(private http: HttpClient) {}

  leer<T>(archivo: string): Observable<T[]> {
    return this.http.get(`assets/db/${archivo}?v=${Date.now()}`, { responseType: 'text' }).pipe(
      map(texto => this.parsear<T>(texto)),
      catchError(() => of([] as T[])),
    );
  }

  private parsear<T>(texto: string): T[] {
    const [encabezado, ...filas] = texto.trim().split(/\r?\n/);
    if (!encabezado) return [];
    const columnas = encabezado.split('|');
    return filas.filter(Boolean).map(fila => {
      const valores = fila.split('|');
      return Object.fromEntries(columnas.map((columna, indice) => [columna, valores[indice] || ''])) as T;
    });
  }
}
