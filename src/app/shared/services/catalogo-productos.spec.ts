import { firstValueFrom, of } from 'rxjs';
import {
  calcularMargenPrecio,
  CatalogoProductos,
  precioEstaVigente,
} from './catalogo-productos';

describe('reglas de precios del catálogo', () => {
  it('calcula el margen sobre el costo, como lo guarda la base', () => {
    expect(calcularMargenPrecio(100, 150)).toBe(50);
    expect(calcularMargenPrecio(15, 45)).toBe(200);
  });

  it('evita divisiones inválidas cuando el costo es cero', () => {
    expect(calcularMargenPrecio(0, 100)).toBe(0);
  });

  it('respeta lista activa y rango inclusivo de vigencia', () => {
    const precio = {
      listaActiva: true,
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-31',
    };
    expect(precioEstaVigente(precio, '2026-07-01')).toBe(true);
    expect(precioEstaVigente(precio, '2026-07-31')).toBe(true);
    expect(precioEstaVigente(precio, '2026-08-01')).toBe(false);
    expect(precioEstaVigente({ ...precio, listaActiva: false }, '2026-07-15')).toBe(false);
  });
});

describe('opciones locales del catálogo', () => {
  it('incluye altas numéricas activas y descarta relaciones legacy inválidas', async () => {
    const archivos: Record<string, unknown[]> = {
      'empresas.txt': [{ id_empresa: '1', nombre_empresa: 'Empresa', activo: '1' }],
      'categorias.txt': [],
      'marcas.txt': [],
      'unidades.txt': [],
      'listas_precios.txt': [],
    };
    const estados: Record<string, unknown> = {
      'catalogo-categorias-v2': {
        registros: [
          { id: '1760000000000', idEmpresa: '1', nombre: 'Local', estado: true },
          { id: 'local-antigua', idEmpresa: '1', nombre: 'Legacy', estado: true },
        ],
        eliminados: [],
      },
      'catalogo-marcas-v2': { registros: [], eliminados: [] },
      'catalogo-unidades-v2': {
        registros: [{
          id: '1760000000001',
          idEmpresa: '1',
          nombre: 'Caja',
          permitirDecimales: false,
        }],
        eliminados: [],
      },
    };
    const db = { leer: (archivo: string) => of(archivos[archivo] || []) };
    const persistencia = {
      leer: <T>(clave: string, valor: T): T => (estados[clave] as T) || valor,
      guardar: () => undefined,
    };
    const servicio = new CatalogoProductos(db as never, persistencia as never);

    const opciones = await firstValueFrom(servicio.cargarOpciones());

    expect(opciones.categorias.map(item => item.nombre)).toEqual(['Local']);
    expect(opciones.categorias[0].id).toBe(1760000000000);
    expect(opciones.unidades[0]).toEqual(expect.objectContaining({
      id: 1760000000001,
      nombre: 'Caja',
      permiteDecimales: false,
    }));
  });
});
