import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProductoCatalogo } from './catalogo-productos';

export interface ProveedorTxtNuevo {
  id: number;
  idEmpresa?: number;
  razonSocial: string;
  nombreComercial: string;
  rfc?: string;
  correo: string;
  telefono: string;
  direccionFiscal: string;
  contacto: string;
  puestoContacto?: string;
  correoContacto?: string;
  telefonoContacto?: string;
}

export interface RelacionProveedorTxt {
  productoId: number;
  skuProveedor: string;
  precioReferencia: number;
  diasEntrega: number;
  cantidadMinima: number;
  activo: boolean;
}

export interface ProductoProveedorTxtNuevo {
  producto: ProductoCatalogo;
  relacion: Omit<RelacionProveedorTxt, 'productoId' | 'activo'>;
}

/**
 * Puente hacia el proceso local que es el único autorizado para escribir los
 * TXT. Las llamadas se serializan para conservar el mismo orden de las
 * acciones de la interfaz; el estado local sigue siendo el respaldo inmediato
 * si la API no está disponible.
 */
@Injectable({ providedIn: 'root' })
export class PersistenciaComprasTxt {
  private readonly endpoint = '/api/compras-txt';
  private cola: Promise<void> = Promise.resolve();
  private pendientes = 0;

  readonly guardando = signal(false);
  readonly ultimoError = signal('');
  readonly ultimaPersistencia = signal('');

  constructor(private readonly http: HttpClient) {}

  registrarProveedor(proveedor: ProveedorTxtNuevo): Promise<void> {
    return this.encolar(() =>
      firstValueFrom(this.http.post(`${this.endpoint}/proveedores`, proveedor)));
  }

  cambiarEstadoProveedor(idProveedor: number, activo: boolean): Promise<void> {
    return this.encolar(() =>
      firstValueFrom(
        this.http.patch(
          `${this.endpoint}/proveedores/${encodeURIComponent(idProveedor)}`,
          { activo },
        ),
      ));
  }

  reemplazarRelaciones(
    idProveedor: number,
    relaciones: readonly RelacionProveedorTxt[],
  ): Promise<void> {
    return this.encolar(() =>
      firstValueFrom(
        this.http.put(
          `${this.endpoint}/proveedores/${encodeURIComponent(idProveedor)}/relaciones`,
          { relaciones },
        ),
      ));
  }

  registrarProductoProveedor(
    idProveedor: number,
    nuevo: ProductoProveedorTxtNuevo,
  ): Promise<void> {
    return this.encolar(() =>
      firstValueFrom(
        this.http.post(
          `${this.endpoint}/proveedores/${encodeURIComponent(idProveedor)}/productos`,
          nuevo,
        ),
      ));
  }

  private encolar(solicitud: () => Promise<unknown>): Promise<void> {
    this.pendientes += 1;
    this.guardando.set(true);
    this.ultimoError.set('');
    const operacion = this.cola
      .then(async () => {
        await solicitud();
        this.ultimaPersistencia.set(new Date().toISOString());
      })
      .catch(error => {
        const mensaje =
          error?.error?.error
          || error?.message
          || 'No fue posible guardar los cambios en los archivos TXT.';
        this.ultimoError.set(String(mensaje));
        console.error('Persistencia TXT de Compras:', mensaje);
        throw error;
      })
      .finally(() => {
        this.pendientes -= 1;
        this.guardando.set(this.pendientes > 0);
      });
    this.cola = operacion.catch(() => undefined);
    return operacion;
  }
}
