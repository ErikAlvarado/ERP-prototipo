import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type TablaInventarioTxt =
  | 'productos' | 'precios' | 'inventario' | 'kardex' | 'categorias' | 'marcas'
  | 'unidades' | 'medidas' | 'anaqueles' | 'componentesKit' | 'imagenesProducto'
  | 'transferencias' | 'detallesTransferencia';

@Injectable({ providedIn: 'root' })
export class PersistenciaInventarioTxt {
  private readonly ruta = '/api/inventario-txt';
  private cola: Promise<unknown> = Promise.resolve();
  readonly guardando = signal(false);
  readonly ultimoError = signal('');

  constructor(private http: HttpClient) {}

  reemplazar(tabla: TablaInventarioTxt, rows: readonly Record<string, unknown>[]): Promise<void> {
    return this.reemplazarVarias({ [tabla]: rows });
  }

  reemplazarVarias(tables: Partial<Record<TablaInventarioTxt, readonly Record<string, unknown>[]>>): Promise<void> {
    this.guardando.set(true);
    this.ultimoError.set('');
    const operacion = this.cola.then(async () => {
      await firstValueFrom(this.http.put(`${this.ruta}/tablas`, { tables }));
    }).catch(error => {
      const mensaje = error?.status === 0
        ? 'No se pudo conectar con el guardado TXT. Inicia el proyecto con "npm start".'
        : error?.error?.error || error?.message || 'No fue posible guardar Inventario en TXT.';
      this.ultimoError.set(String(mensaje));
      console.error('Persistencia TXT de Inventario:', mensaje);
      throw error;
    }).finally(() => this.guardando.set(false));
    this.cola = operacion.catch(() => undefined);
    return operacion;
  }

  registrarAjuste(ajuste: Record<string, unknown>): Promise<void> {
    return this.encolar(async () => {
      await firstValueFrom(this.http.post(`${this.ruta}/ajustes`, ajuste));
    });
  }

  guardarTransferencia(transferencia: Record<string, unknown>): Promise<void> {
    return this.encolar(async () => {
      await firstValueFrom(this.http.put(`${this.ruta}/transferencias`, { transferencia }));
    });
  }

  eliminarTransferencia(id: number): Promise<void> {
    return this.encolar(async () => {
      await firstValueFrom(this.http.request('DELETE', `${this.ruta}/transferencias/${id}`, { body: {} }));
    });
  }

  private encolar(solicitud: () => Promise<void>): Promise<void> {
    this.guardando.set(true);
    this.ultimoError.set('');
    const operacion = this.cola.then(solicitud).catch(error => {
      const mensaje = error?.status === 0
        ? 'No se pudo conectar con el guardado TXT. Inicia el proyecto con "npm start".'
        : error?.error?.error || error?.message || 'No fue posible guardar Inventario en TXT.';
      this.ultimoError.set(String(mensaje));
      console.error('Persistencia TXT de Inventario:', mensaje);
      throw error;
    }).finally(() => this.guardando.set(false));
    this.cola = operacion.catch(() => undefined);
    return operacion;
  }
}
