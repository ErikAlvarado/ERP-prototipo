import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
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

export interface RecepcionCompraTxtNueva {
  folio: string;
  orden: string;
  proveedor: string;
  almacenId: number;
  responsableId?: number;
  fecha: string;
  documento?: string;
  observaciones?: string;
  partidas: Array<{ productoId: number; cantidad: number; costoUnitario?: number }>;
}

export interface OrdenCompraTxtNueva {
  proveedor: string;
  compradorId: number;
  almacenId: number;
  partidas: Array<{
    productoId: number;
    cantidad: number;
    precioUnitario: number;
    impuestoPorcentaje: number;
  }>;
  fecha: string;
  fechaEntrega: string;
  condiciones: string;
  estado: string;
  observaciones?: string;
}

export interface OrdenCompraTxtPersistida {
  folio: string;
  proveedor: string;
  articulos: number;
  total: string;
  solicitante: string;
  fecha: string;
  estado: string;
  cancelable: boolean;
  actualizadaEn: string;
  historial: Array<{ id: string; estado: string; fecha: string; comentario: string }>;
  almacenId: number;
  almacen: string;
  fechaEntrega: string;
  condiciones: string;
  partidas: Array<{
    productoId: number;
    nombre: string;
    sku: string;
    cantidad: number;
    precioUnitario: number;
    impuestoPorcentaje: number;
  }>;
}

/**
 * Puente con el servicio local que escribe los archivos TXT del proyecto.
 */
@Injectable({ providedIn: 'root' })
export class PersistenciaComprasTxt {
  private readonly http = inject(HttpClient);
  private readonly ruta = '/api/compras-txt';
  private cola: Promise<void> = Promise.resolve();
  private pendientes = 0;

  readonly guardando = signal(false);
  readonly ultimoError = signal('');
  readonly ultimaPersistencia = signal('');

  registrarProveedor(proveedor: ProveedorTxtNuevo): Promise<void> {
    return this.encolar(() => this.post('/proveedores', proveedor));
  }

  cambiarEstadoProveedor(idProveedor: number, activo: boolean): Promise<void> {
    return this.encolar(() => this.patch(`/proveedores/${idProveedor}`, { activo }));
  }

  reemplazarRelaciones(
    idProveedor: number,
    relaciones: readonly RelacionProveedorTxt[],
  ): Promise<void> {
    return this.encolar(() => this.put(
      `/proveedores/${idProveedor}/relaciones`,
      { relaciones },
    ));
  }

  registrarProductoProveedor(
    idProveedor: number,
    nuevo: ProductoProveedorTxtNuevo,
  ): Promise<void> {
    return this.encolar(() => this.post(
      `/proveedores/${idProveedor}/productos`,
      nuevo,
    ));
  }

  registrarRecepcion(recepcion: RecepcionCompraTxtNueva): Promise<void> {
    return this.encolar(() => this.post('/recepciones', recepcion));
  }

  async listarOrdenes(): Promise<OrdenCompraTxtPersistida[]> {
    const respuesta = await firstValueFrom(this.http.get<{
      ok: boolean;
      ordenes: OrdenCompraTxtPersistida[];
    }>(`${this.ruta}/ordenes`));
    return respuesta.ordenes || [];
  }

  registrarOrdenes(ordenes: readonly OrdenCompraTxtNueva[]): Promise<OrdenCompraTxtPersistida[]> {
    return this.encolarResultado(async () => {
      const respuesta = await firstValueFrom(this.http.post<{
        ok: boolean;
        ordenes: OrdenCompraTxtPersistida[];
      }>(`${this.ruta}/ordenes/lote`, { ordenes }));
      return respuesta.ordenes || [];
    });
  }

  actualizarEstadoOrden(
    folio: string,
    estado: string,
    usuarioId: number,
    comentario: string,
  ): Promise<void> {
    return this.encolar(() => this.patch(
      `/ordenes/${encodeURIComponent(folio)}/estado`,
      { estado, usuarioId, comentario },
    ));
  }

  private async post(ruta: string, cuerpo: unknown): Promise<void> {
    await firstValueFrom(this.http.post(`${this.ruta}${ruta}`, cuerpo));
  }

  private async patch(ruta: string, cuerpo: unknown): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.ruta}${ruta}`, cuerpo));
  }

  private async put(ruta: string, cuerpo: unknown): Promise<void> {
    await firstValueFrom(this.http.put(`${this.ruta}${ruta}`, cuerpo));
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
        const mensaje = error?.status === 0
          ? 'No se pudo conectar con el guardado TXT. Inicia el proyecto con "npm start".'
          : error?.error?.error
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

  private encolarResultado<T>(solicitud: () => Promise<T>): Promise<T> {
    this.pendientes += 1;
    this.guardando.set(true);
    this.ultimoError.set('');
    const operacion = this.cola.then(solicitud);
    const seguimiento = operacion
      .then(() => this.ultimaPersistencia.set(new Date().toISOString()))
      .catch(error => {
        const mensaje = error?.status === 0
          ? 'No se pudo conectar con el guardado TXT. Inicia el proyecto con "npm start".'
          : error?.error?.error || error?.message || 'No fue posible guardar la orden en los archivos TXT.';
        this.ultimoError.set(String(mensaje));
        throw error;
      })
      .finally(() => {
        this.pendientes -= 1;
        this.guardando.set(this.pendientes > 0);
      });
    this.cola = seguimiento.catch(() => undefined);
    return operacion;
  }
}
