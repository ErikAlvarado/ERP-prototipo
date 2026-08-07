import { Injectable } from '@angular/core';
import { AlmacenAdministracion } from '../../administracion/administracion-datos';
import { PersistenciaLocal } from '../../../shared/services/persistencia-local';
import { ProductoCatalogo } from '../../../shared/services/catalogo-productos';

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
}

interface EstadoAnaqueles {
  inicializado: boolean;
  registros: AnaquelCatalogo[];
}

@Injectable({ providedIn: 'root' })
export class AnaquelesCatalogo {
  private readonly clave = 'catalogo-anaqueles-v1';

  constructor(private persistencia: PersistenciaLocal) {}

  cargar(
    productos: ProductoCatalogo[],
    almacenes: AlmacenAdministracion[],
  ): AnaquelCatalogo[] {
    const estado = this.persistencia.leer<EstadoAnaqueles>(this.clave, {
      inicializado: false,
      registros: [],
    });
    if (estado.inicializado) return this.normalizar(estado.registros);

    const empresaPorAlmacen = new Map(
      almacenes.map(almacen => [Number(almacen.id), Number(almacen.empresaId)]),
    );
    const conocidos = new Set<string>();
    const registros: AnaquelCatalogo[] = [];

    for (const producto of productos) {
      for (const inventario of producto.inventarios || []) {
        const nombre = this.limpiarNombre(inventario.anaquel);
        const idAlmacen = Number(inventario.idAlmacen);
        const idEmpresa = empresaPorAlmacen.get(idAlmacen) || Number(producto.idEmpresa);
        const firma = this.firma(idAlmacen, nombre);
        if (!nombre || !idAlmacen || !idEmpresa || conocidos.has(firma)) continue;
        conocidos.add(firma);
        registros.push({
          id: String(registros.length + 1),
          idEmpresa,
          idAlmacen,
          nombre,
          estado: true,
        });
      }
    }

    this.guardar(registros);
    return registros;
  }

  guardar(registros: AnaquelCatalogo[]): void {
    this.persistencia.guardar<EstadoAnaqueles>(this.clave, {
      inicializado: true,
      registros: this.normalizar(registros),
    });
  }

  siguienteId(registros: AnaquelCatalogo[]): string {
    return String(Math.max(0, ...registros.map(registro => Number(registro.id) || 0)) + 1);
  }

  coinciden(
    anaquel: Pick<AnaquelCatalogo, 'idAlmacen' | 'nombre'>,
    idAlmacen: number,
    nombre: string,
  ): boolean {
    return Number(anaquel.idAlmacen) === Number(idAlmacen)
      && this.normalizarTexto(anaquel.nombre) === this.normalizarTexto(nombre);
  }

  private normalizar(registros: AnaquelCatalogo[]): AnaquelCatalogo[] {
    return (registros || []).map(registro => ({
      ...registro,
      id: String(registro.id),
      idEmpresa: Number(registro.idEmpresa),
      idAlmacen: Number(registro.idAlmacen),
      nombre: this.limpiarNombre(registro.nombre),
      estado: registro.estado !== false,
    }));
  }

  private limpiarNombre(nombre: string): string {
    const valor = String(nombre || '').trim();
    return valor === '—' || valor === '-' ? '' : valor;
  }

  private firma(idAlmacen: number, nombre: string): string {
    return `${Number(idAlmacen)}:${this.normalizarTexto(nombre)}`;
  }

  private normalizarTexto(valor: string): string {
    return normalizarNombreAnaquel(valor);
  }
}
