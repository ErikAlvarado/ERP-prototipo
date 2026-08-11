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

describe('relación de anaqueles del catálogo de productos', () => {
  const archivosBase = (inventario: Record<string, string>) => ({
    'productos.txt': [{
      id_producto: '1', id_empresa: '1', sku: 'SKU-1', codigo_barras: '',
      nombre_producto: 'Producto', tipo: 'Físico', descripcion: '', id_marca: '1',
      id_categoria: '1', id_unidad: '1', estatus: 'Vigente', ubicacion_default: '',
      en_punto_venta: '1', en_catalogo_linea: '0', requiere_receta: '0',
      usar_existencias: '1', clave_sat: '', fecha_creacion: '', fecha_actualizacion: '',
    }],
    'empresas.txt': [{ id_empresa: '1', nombre_empresa: 'Empresa', activo: '1' }],
    'categorias.txt': [{ id_categoria: '1', id_empresa: '1', nombre_categoria: 'General', activo: '1' }],
    'unidades.txt': [{ id_unidad: '1', id_empresa: '1', nombre: 'Pieza', permitir_decimales: '0' }],
    'marcas.txt': [{ id_marca: '1', id_empresa: '1', nombre: 'Marca', activo: '1' }],
    'productos_precios.txt': [],
    'listas_precios.txt': [],
    'inventario.txt': [inventario],
    'anaqueles.txt': [{ id_anaquel: '9', id_almacen: '2', nombre_anaquel: 'Año', activo: '1' }],
    'almacenes.txt': [{ id_almacen: '2', id_empresa: '1', nombre_almacen: 'Central' }],
    'producto_imagenes.txt': [],
    'kardex_inventario.txt': [],
  });

  it('resuelve por FK el nombre renombrado en el catálogo local', async () => {
    const archivos = archivosBase({
      id_inventario: '1', id_producto: '1', id_almacen: '2', id_anaquel: '9',
      stock: '3', stock_reorden: '1', stock_critico: '0', stock_maximo: '10',
      fecha_actualizacion: '2026-08-01',
    });
    const estados: Record<string, unknown> = {
      'catalogo-anaqueles-v2': {
        registros: [{
          id: '9', idEmpresa: 1, idAlmacen: 2, nombre: 'Año renombrado', estado: true,
        }],
        eliminados: [],
      },
    };
    const servicio = new CatalogoProductos(
      { leer: (archivo: keyof typeof archivos) => of(archivos[archivo] || []) } as never,
      { leer: <T>(clave: string, inicial: T): T => (estados[clave] as T) ?? inicial } as never,
    );

    const [producto] = await firstValueFrom(servicio.cargar());

    expect(producto.inventarios[0]).toEqual(expect.objectContaining({
      idAnaquel: 9,
      anaquel: 'Año renombrado',
    }));
  });

  it('migra un cambio local legacy por almacén y nombre normalizado', async () => {
    const archivos = archivosBase({
      id_inventario: '1', id_producto: '1', id_almacen: '2', id_anaquel: '9',
      stock: '3', stock_reorden: '1', stock_critico: '0', stock_maximo: '10',
      fecha_actualizacion: '2026-08-01',
    });
    const estados: Record<string, unknown> = {
      'catalogo-productos-cambios-v3': {
        actualizaciones: [{
          id: 1,
          inventarios: [{
            id: 1, idAlmacen: 2, almacen: 'Central', stock: 3, stockReorden: 1,
            stockCritico: 0, stockMaximo: 10, anaquel: 'Ano', fechaActualizacion: '2026-08-01',
          }],
        }],
        agregados: [],
        eliminados: [],
      },
    };
    const servicio = new CatalogoProductos(
      { leer: (archivo: keyof typeof archivos) => of(archivos[archivo] || []) } as never,
      { leer: <T>(clave: string, inicial: T): T => (estados[clave] as T) ?? inicial } as never,
    );

    const [producto] = await firstValueFrom(servicio.cargar());

    expect(producto.inventarios[0]).toEqual(expect.objectContaining({
      idAnaquel: 9,
      anaquel: 'Año',
    }));
  });
});
