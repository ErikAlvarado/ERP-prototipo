import { Injectable, Optional } from '@angular/core';
import { PersistenciaInventarioTxt, TablaInventarioTxt } from '../../shared/services/persistencia-inventario-txt';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';

export interface RegistroCatalogo {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosPersistencia {
  constructor(
    private local: PersistenciaLocal,
    @Optional() private persistencia?: PersistenciaInventarioTxt,
  ) {}

  combinar<T extends RegistroCatalogo>(
    clave: string,
    fuente: T[],
    _bajaLogica = false,
  ): { registros: T[]; eliminados: string[] } {
    const estado = this.local.leer<{ registros: T[]; eliminados: string[] }>(clave, { registros: [], eliminados: [] });
    const eliminados = new Set(estado.eliminados || []);
    const locales = new Map((estado.registros || []).map(registro => [registro.id, registro]));
    const idsFuente = new Set(fuente.map(registro => registro.id));
    const registros = fuente.filter(registro => !eliminados.has(registro.id)).map(registro => locales.get(registro.id) || registro);
    for (const registro of estado.registros || []) if (!idsFuente.has(registro.id) && !eliminados.has(registro.id)) registros.push(registro);
    registros.sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id));
    return { registros, eliminados: [...eliminados] };
  }

  guardar<T extends RegistroCatalogo>(clave: string, registros: T[], eliminados: string[]): void {
    const tabla = this.tabla(clave);
    const omitidos = new Set(eliminados.map(String));
    const rows = registros
      .filter(registro => !omitidos.has(String(registro.id)))
      .map(registro => this.aFila(tabla, registro as RegistroCatalogo & Record<string, unknown>));
    this.local.guardar(clave, { registros, eliminados });
    const guardado = this.persistencia?.reemplazar(tabla, rows);
    if (guardado) void guardado.then(() => this.local.eliminar(clave)).catch(() => undefined);
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

  private tabla(clave: string): TablaInventarioTxt {
    const tablas: Record<string, TablaInventarioTxt> = {
      'catalogo-marcas-v2': 'marcas',
      'catalogo-categorias-v2': 'categorias',
      'catalogo-unidades-v2': 'unidades',
      'catalogo-medidas-v2': 'medidas',
      'catalogo-anaqueles-v2': 'anaqueles',
    };
    const tabla = tablas[clave];
    if (!tabla) throw new Error(`No existe persistencia TXT para ${clave}.`);
    return tabla;
  }

  private aFila(tabla: TablaInventarioTxt, registro: RegistroCatalogo & Record<string, unknown>): Record<string, unknown> {
    const activo = registro['estado'] === false ? '0' : '1';
    switch (tabla) {
      case 'marcas': return { id_marca: registro.id, id_empresa: registro['idEmpresa'], nombre: registro['nombre'], activo };
      case 'categorias': return { id_categoria: registro.id, id_empresa: registro['idEmpresa'], id_categoria_padre: registro['idPadre'] || '', nombre_categoria: registro['nombre'], activo };
      case 'unidades': return { id_unidad: registro.id, id_empresa: registro['idEmpresa'], nombre: registro['nombre'], abreviatura: registro['abreviatura'], permitir_decimales: registro['permitirDecimales'] ? '1' : '0' };
      case 'medidas': return { id_medida: registro.id, valor: registro['valor'], id_unidad: registro['unidadId'], activo, fecha_creacion: registro['fechaCreacion'] || new Date().toISOString().slice(0, 10) };
      case 'anaqueles': return { id_anaquel: registro.id, id_almacen: registro['idAlmacen'], nombre_anaquel: registro['nombre'], codigo_barras: registro['codigoBarras'], activo, fecha_creacion: registro['fechaCreacion'] || new Date().toISOString().slice(0, 10), fecha_actualizacion: new Date().toISOString().slice(0, 10) };
      default: throw new Error(`La tabla ${tabla} no es un catálogo.`);
    }
  }
}
