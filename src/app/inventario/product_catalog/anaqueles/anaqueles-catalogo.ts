import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { DatosDb } from '../../../shared/services/datos-db';
import { CatalogosPersistencia } from '../catalogos-persistencia';

export function normalizarNombreAnaquel(valor: string): string {
  return String(valor || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

export interface AnaquelCatalogo {
  id: string;
  idEmpresa: number;
  idAlmacen: number;
  nombre: string;
  estado: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

interface AnaquelDb {
  id_anaquel: string;
  id_almacen: string;
  nombre_anaquel: string;
  activo: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface AlmacenDb {
  id_almacen: string;
  id_empresa: string;
}

@Injectable({ providedIn: 'root' })
export class AnaquelesCatalogo {
  private readonly clave = 'catalogo-anaqueles-v2';
  private eliminados: string[] = [];

  constructor(
    private db: DatosDb,
    private persistencia: CatalogosPersistencia,
  ) {}

  cargar(): Observable<AnaquelCatalogo[]> {
    return forkJoin({
      anaqueles: this.db.leer<AnaquelDb>('anaqueles.txt', true),
      almacenes: this.db.leer<AlmacenDb>('almacenes.txt', true),
    }).pipe(map(({ anaqueles, almacenes }) => {
      const empresaPorAlmacen = new Map(
        almacenes.map(almacen => [Number(almacen.id_almacen), Number(almacen.id_empresa)]),
      );
      const fuente = anaqueles.map(fila => ({
        id: fila.id_anaquel,
        idEmpresa: empresaPorAlmacen.get(Number(fila.id_almacen)) || 0,
        idAlmacen: Number(fila.id_almacen),
        nombre: fila.nombre_anaquel,
        estado: fila.activo !== '0',
        fechaCreacion: fila.fecha_creacion || '',
        fechaActualizacion: fila.fecha_actualizacion || '',
      }));
      const estado = this.persistencia.combinar(this.clave, fuente, false);
      this.eliminados = estado.eliminados;
      return this.normalizar(estado.registros).map(anaquel => ({
        ...anaquel,
        idEmpresa: empresaPorAlmacen.get(anaquel.idAlmacen) || anaquel.idEmpresa,
      }));
    }));
  }

  guardar(registros: AnaquelCatalogo[]): void {
    this.persistencia.guardar(this.clave, this.normalizar(registros), this.eliminados);
  }

  eliminar(id: string, registros: AnaquelCatalogo[]): void {
    this.eliminados = [...new Set([...this.eliminados, String(id)])];
    this.guardar(registros);
  }

  siguienteId(_registros: AnaquelCatalogo[]): string {
    return this.persistencia.nuevoId();
  }

  private normalizar(registros: AnaquelCatalogo[]): AnaquelCatalogo[] {
    return (registros || []).map(registro => ({
      ...registro,
      id: String(registro.id),
      idEmpresa: Number(registro.idEmpresa),
      idAlmacen: Number(registro.idAlmacen),
      nombre: this.limpiarNombre(registro.nombre),
      estado: registro.estado !== false,
      fechaCreacion: registro.fechaCreacion || '',
      fechaActualizacion: registro.fechaActualizacion || '',
    }));
  }

  private limpiarNombre(nombre: string): string {
    const valor = String(nombre || '').trim();
    return valor === '—' || valor === '-' ? '' : valor;
  }

}
