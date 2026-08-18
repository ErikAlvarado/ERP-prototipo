import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type TablaVentasTxt =
  | 'cajas' | 'clientesVenta' | 'ventas' | 'detallesVenta' | 'pagosVenta'
  | 'devolucionesVenta' | 'detallesDevolucionVenta'
  | 'cortesCaja' | 'detallesCorteCaja'
  | 'cotizacionesVenta' | 'detallesCotizacionVenta'
  | 'impuestos' | 'productosImpuestos' | 'monedas' | 'metodosPagoVenta' | 'turnosVenta';

@Injectable({ providedIn: 'root' })
export class PersistenciaVentasTxt {
  private readonly rutaApi = '/api/ventas-txt';
  private readonly rutaDatos = '/assets/db/ventas_bd';
  private cola: Promise<unknown> = Promise.resolve();
  readonly guardando = signal(false);
  readonly ultimoError = signal('');

  constructor(private http: HttpClient) {}

  async leer<T extends Record<string, string>>(archivo: string): Promise<T[]> {
    const texto = await firstValueFrom(this.http.get(
      `${this.rutaDatos}/${encodeURIComponent(archivo)}?v=${Date.now()}`,
      { responseType: 'text' },
    ));
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const columnas = (lineas.shift() || '').split('|');
    return lineas.filter(Boolean).map(linea => {
      const valores = linea.split('|');
      return Object.fromEntries(columnas.map((columna, i) => [columna, valores[i] ?? ''])) as T;
    });
  }

  async leerInventario<T extends Record<string, string>>(archivo: string): Promise<T[]> {
    const texto = await firstValueFrom(this.http.get(
      `/assets/db/inventari_db/${encodeURIComponent(archivo)}?v=${Date.now()}`,
      { responseType: 'text' },
    ));
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const columnas = (lineas.shift() || '').split('|');
    return lineas.filter(Boolean).map(linea => {
      const valores = linea.split('|');
      return Object.fromEntries(columnas.map((columna, i) => [columna, valores[i] ?? ''])) as T;
    });
  }

  reemplazarVarias(tables: Partial<Record<TablaVentasTxt, readonly Record<string, unknown>[]>>): Promise<void> {
    return this.encolar(async () => {
      await firstValueFrom(this.http.put(`${this.rutaApi}/tablas`, { tables }));
    });
  }

  private encolar(solicitud: () => Promise<void>): Promise<void> {
    this.guardando.set(true);
    this.ultimoError.set('');
    const operacion = this.cola.then(solicitud, solicitud).catch(error => {
      const mensaje = error?.status === 0
        ? 'No se pudo conectar con el guardado TXT. Inicia el proyecto con "npm start".'
        : error?.error?.error || error?.message || 'No fue posible guardar Ventas en TXT.';
      this.ultimoError.set(String(mensaje));
      throw error;
    }).finally(() => this.guardando.set(false));
    this.cola = operacion.catch(() => undefined);
    return operacion;
  }
}
