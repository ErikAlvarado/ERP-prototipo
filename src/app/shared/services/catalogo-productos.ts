import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { PersistenciaLocal } from './persistencia-local';
import { DatosDb } from './datos-db';

export interface OpcionProducto {
  id: number;
  nombre: string;
  idEmpresa: number;
  permiteDecimales?: boolean;
}

export interface OpcionListaPrecio extends OpcionProducto {
  predeterminada: boolean;
  activa: boolean;
}

export interface OpcionesProducto {
  empresas: OpcionProducto[];
  categorias: OpcionProducto[];
  marcas: OpcionProducto[];
  unidades: OpcionProducto[];
  listasPrecios: OpcionListaPrecio[];
}

export interface PrecioProductoCatalogo {
  id: number;
  idLista: number;
  idEmpresa: number;
  lista: string;
  listaPredeterminada: boolean;
  listaActiva: boolean;
  costo: number;
  precio: number;
  margen: number;
  fechaInicio: string;
  fechaFin: string;
  vigente: boolean;
}

export interface InventarioProductoCatalogo {
  id: number;
  idAlmacen: number;
  almacen: string;
  stock: number;
  stockReorden: number;
  stockCritico: number;
  stockMaximo: number;
  anaquel: string;
  fechaActualizacion: string;
}

export interface ProductoCatalogo {
  id: number;
  idEmpresa: number;
  empresa: string;
  sku: string;
  codigo: string;
  producto: string;
  descripcion: string;
  tipo: string;
  idMarca: number;
  marca: string;
  idCategoria: number;
  categoria: string;
  idUnidad: number;
  medida: string;
  estatus: string;
  precio: number;
  costo: number;
  margen: number;
  listaPrecio: string;
  precios: PrecioProductoCatalogo[];
  pos: boolean;
  linea: boolean;
  estado: boolean;
  requiereReceta: boolean;
  usarExistencias: boolean;
  almacen: string;
  anaquel: string;
  inventarios: InventarioProductoCatalogo[];
  stock: number;
  stockReorden: number;
  stockCritico: number;
  stockMaximo: number;
  ubicacionDefault: string;
  claveSat: string;
  imagen: string;
  imagenes: string[];
  ultimoMovimiento: string;
  fechaActualizacion: string;
  fechaCreacion: string;
}

interface ProductoDb {
  id_producto: string;
  id_empresa: string;
  sku: string;
  codigo_barras: string;
  nombre_producto: string;
  tipo: string;
  descripcion: string;
  id_marca: string;
  id_categoria: string;
  id_unidad: string;
  estatus: string;
  ubicacion_default: string;
  en_punto_venta: string;
  en_catalogo_linea: string;
  requiere_receta: string;
  usar_existencias: string;
  clave_sat: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface EmpresaDb { id_empresa: string; nombre_empresa: string; activo: string; }
interface CategoriaDb { id_categoria: string; id_empresa: string; nombre_categoria: string; activo: string; }
interface UnidadDb {
  id_unidad: string;
  id_empresa: string;
  nombre: string;
  permitir_decimales: string;
}
interface MarcaDb { id_marca: string; id_empresa: string; nombre: string; activo: string; }
interface AlmacenDb { id_almacen: string; id_empresa: string; nombre_almacen: string; }
interface ImagenDb { id_producto: string; url_imagen: string; es_principal: string; orden: string; }
interface InventarioDb { id_inventario: string; id_producto: string; id_almacen: string; stock: string; stock_reorden: string; stock_critico: string; stock_maximo: string; anaquel: string; fecha_actualizacion: string; }
interface PrecioDb { id_precio: string; id_producto: string; id_lista_precio: string; precio_costo: string; precio_venta: string; fecha_inicio: string; fecha_fin: string; }
interface ListaPrecioDb { id_lista_precio: string; id_empresa: string; nombre: string; es_predeterminado: string; activo: string; }
interface MovimientoDb { id_producto: string; cantidad: string; referencia: string; fecha: string; }
interface CategoriaLocal {
  id: string;
  idEmpresa: string;
  nombre: string;
  estado: boolean;
}
interface MarcaLocal {
  id: string;
  idEmpresa: string;
  nombre: string;
  estado: boolean;
}
interface UnidadLocal {
  id: string;
  idEmpresa: string;
  nombre: string;
  permitirDecimales: boolean;
}
interface EstadoCatalogoLocal<T> {
  registros: T[];
  eliminados: string[];
}

interface CambiosLocalesProducto {
  actualizaciones: Array<Partial<ProductoCatalogo> & Pick<ProductoCatalogo, 'id'>>;
  agregados: ProductoCatalogo[];
  eliminados: number[];
}

type DatosRelacionados = {
  productos: ProductoDb[];
  empresas: EmpresaDb[];
  categorias: CategoriaDb[];
  unidades: UnidadDb[];
  marcas: MarcaDb[];
  precios: PrecioDb[];
  listasPrecios: ListaPrecioDb[];
  inventario: InventarioDb[];
  almacenes: AlmacenDb[];
  imagenes: ImagenDb[];
  kardex: MovimientoDb[];
};

@Injectable({ providedIn: 'root' })
export class CatalogoProductos {
  /*
   * La versión 3 guarda únicamente diferencias hechas desde la interfaz.
   * Así, una copia antigua de localStorage nunca reemplaza las filas nuevas de
   * productos.txt ni sus relaciones actualizadas.
   */
  private readonly claveCambios = 'catalogo-productos-cambios-v3';
  private origenPorId = new Map<number, ProductoCatalogo>();

  constructor(private db: DatosDb, private persistencia: PersistenciaLocal) {}

  cargar(): Observable<ProductoCatalogo[]> {
    return this.cargarArchivos().pipe(
      map(datos => this.relacionar(datos)),
      map(productosOrigen => this.combinarConCambiosLocales(productosOrigen)),
    );
  }

  cargarOpciones(): Observable<OpcionesProducto> {
    return forkJoin({
      empresas: this.leer<EmpresaDb>('empresas.txt'),
      categorias: this.leer<CategoriaDb>('categorias.txt'),
      marcas: this.leer<MarcaDb>('marcas.txt'),
      unidades: this.leer<UnidadDb>('unidades.txt'),
      listasPrecios: this.leer<ListaPrecioDb>('listas_precios.txt'),
    }).pipe(map(datos => {
      const categorias = this.combinarCatalogoLocal<CategoriaLocal>(
        'catalogo-categorias-v2',
        datos.categorias.map(fila => ({
          id: fila.id_categoria,
          idEmpresa: fila.id_empresa,
          nombre: fila.nombre_categoria,
          estado: fila.activo !== '0',
        })),
      );
      const marcas = this.combinarCatalogoLocal<MarcaLocal>(
        'catalogo-marcas-v2',
        datos.marcas.map(fila => ({
          id: fila.id_marca,
          idEmpresa: fila.id_empresa,
          nombre: fila.nombre,
          estado: fila.activo !== '0',
        })),
      );
      const unidades = this.combinarCatalogoLocal<UnidadLocal>(
        'catalogo-unidades-v2',
        datos.unidades.map(fila => ({
          id: fila.id_unidad,
          idEmpresa: fila.id_empresa,
          nombre: fila.nombre,
          permitirDecimales: fila.permitir_decimales === '1',
        })),
      );
      return {
        empresas: datos.empresas
          .filter(fila => fila.activo !== '0')
          .map(fila => ({
            id: Number(fila.id_empresa),
            nombre: fila.nombre_empresa,
            idEmpresa: Number(fila.id_empresa),
          })),
        categorias: categorias
          .filter(fila =>
            fila.estado && this.idOpcionCatalogo(fila.id) > 0 && Number(fila.idEmpresa) > 0)
          .map(fila => ({
            id: this.idOpcionCatalogo(fila.id),
            nombre: fila.nombre,
            idEmpresa: Number(fila.idEmpresa),
          })),
        marcas: marcas
          .filter(fila =>
            fila.estado && this.idOpcionCatalogo(fila.id) > 0 && Number(fila.idEmpresa) > 0)
          .map(fila => ({
            id: this.idOpcionCatalogo(fila.id),
            nombre: fila.nombre,
            idEmpresa: Number(fila.idEmpresa),
          })),
        unidades: unidades
          .filter(fila =>
            this.idOpcionCatalogo(fila.id) > 0 && Number(fila.idEmpresa) > 0)
          .map(fila => ({
            id: this.idOpcionCatalogo(fila.id),
            nombre: fila.nombre,
            idEmpresa: Number(fila.idEmpresa),
            permiteDecimales: fila.permitirDecimales,
          })),
        listasPrecios: datos.listasPrecios.map(fila => ({
          id: Number(fila.id_lista_precio),
          nombre: fila.nombre,
          idEmpresa: Number(fila.id_empresa),
          predeterminada: fila.es_predeterminado === '1',
          activa: fila.activo === '1',
        })),
      };
    }));
  }

  guardar(productos: ProductoCatalogo[]): void {
    const campos = Object.keys(this.origenPorId.values().next().value || {}) as Array<keyof ProductoCatalogo>;
    const actualizaciones: CambiosLocalesProducto['actualizaciones'] = [];
    const agregados: ProductoCatalogo[] = [];

    for (const producto of productos) {
      const original = this.origenPorId.get(producto.id);
      if (!original) {
        agregados.push(producto);
        continue;
      }

      const cambio: Partial<ProductoCatalogo> & Pick<ProductoCatalogo, 'id'> = { id: producto.id };
      for (const campo of campos) {
        if (campo !== 'id' && producto[campo] !== original[campo]) {
          (cambio as Record<string, unknown>)[campo] = producto[campo];
        }
      }
      if (Object.keys(cambio).length > 1) actualizaciones.push(cambio);
    }

    const idsActuales = new Set(productos.map(producto => producto.id));
    const eliminados = [...this.origenPorId.keys()].filter(id => !idsActuales.has(id));
    this.persistencia.guardar<CambiosLocalesProducto>(this.claveCambios, { actualizaciones, agregados, eliminados });
  }

  actualizarResumenPrecio(producto: ProductoCatalogo, fecha = this.hoy()): ProductoCatalogo {
    const precios = (producto.precios || []).map(precio => ({
      ...precio,
      margen: calcularMargenPrecio(precio.costo, precio.precio),
      vigente: precioEstaVigente(precio, fecha),
    }));
    const principal = this.seleccionarPrecioPrincipal(
      precios.filter(precio => !precio.idEmpresa || precio.idEmpresa === producto.idEmpresa),
    );
    return {
      ...producto,
      precios,
      precio: principal?.precio || 0,
      costo: principal?.costo || 0,
      margen: principal?.margen || 0,
      listaPrecio: principal?.lista || 'Sin precio vigente',
    };
  }

  private cargarArchivos(): Observable<DatosRelacionados> {
    return forkJoin({
      productos: this.leer<ProductoDb>('productos.txt', true),
      empresas: this.leer<EmpresaDb>('empresas.txt'),
      categorias: this.leer<CategoriaDb>('categorias.txt'),
      unidades: this.leer<UnidadDb>('unidades.txt'),
      marcas: this.leer<MarcaDb>('marcas.txt'),
      precios: this.leer<PrecioDb>('productos_precios.txt'),
      listasPrecios: this.leer<ListaPrecioDb>('listas_precios.txt'),
      inventario: this.leer<InventarioDb>('inventario.txt'),
      almacenes: this.leer<AlmacenDb>('almacenes.txt'),
      imagenes: this.leer<ImagenDb>('producto_imagenes.txt'),
      kardex: this.leer<MovimientoDb>('kardex_inventario.txt'),
    });
  }

  private combinarConCambiosLocales(productosOrigen: ProductoCatalogo[]): ProductoCatalogo[] {
    this.origenPorId = new Map(productosOrigen.map(producto => [producto.id, producto]));
    const cambios = this.persistencia.leer<CambiosLocalesProducto>(this.claveCambios, {
      actualizaciones: [],
      agregados: [],
      eliminados: [],
    });
    const eliminados = new Set(cambios.eliminados);
    const actualizaciones = new Map(cambios.actualizaciones.map(cambio => [cambio.id, cambio]));
    const relacionados = productosOrigen
      .filter(producto => !eliminados.has(producto.id))
      .map(producto => this.normalizarProducto({ ...producto, ...(actualizaciones.get(producto.id) || {}) }));
    const idsOrigen = new Set(productosOrigen.map(producto => producto.id));
    const agregados = cambios.agregados
      .filter(producto => !idsOrigen.has(producto.id))
      .map(producto => this.normalizarProducto(producto));
    return [...relacionados, ...agregados];
  }

  private relacionar(datos: DatosRelacionados): ProductoCatalogo[] {
    const empresas = new Map(datos.empresas.map(fila => [fila.id_empresa, fila.nombre_empresa]));
    const categorias = new Map(datos.categorias.map(fila => [fila.id_categoria, fila.nombre_categoria]));
    const unidades = new Map(datos.unidades.map(fila => [fila.id_unidad, fila.nombre]));
    const marcas = new Map(datos.marcas.map(fila => [fila.id_marca, fila.nombre]));
    const almacenes = new Map(datos.almacenes.map(fila => [fila.id_almacen, fila.nombre_almacen]));
    const listasPrecios = new Map(datos.listasPrecios.map(fila => [fila.id_lista_precio, fila]));
    const fechaActual = this.hoy();

    return datos.productos.map(producto => {
      const inventarios: InventarioProductoCatalogo[] = datos.inventario
        .filter(fila => fila.id_producto === producto.id_producto)
        .map(fila => ({
          id: Number(fila.id_inventario),
          idAlmacen: Number(fila.id_almacen),
          almacen: almacenes.get(fila.id_almacen) || `Almacén ${fila.id_almacen}`,
          stock: Number(fila.stock) || 0,
          stockReorden: Number(fila.stock_reorden) || 0,
          stockCritico: Number(fila.stock_critico) || 0,
          stockMaximo: Number(fila.stock_maximo) || 0,
          anaquel: fila.anaquel || '—',
          fechaActualizacion: fila.fecha_actualizacion || '',
        }));
      const precios: PrecioProductoCatalogo[] = datos.precios
        .filter(fila => fila.id_producto === producto.id_producto)
        .map(fila => {
          const lista = listasPrecios.get(fila.id_lista_precio);
          const costo = Number(fila.precio_costo) || 0;
          const venta = Number(fila.precio_venta) || 0;
          const precio: PrecioProductoCatalogo = {
            id: Number(fila.id_precio),
            idLista: Number(fila.id_lista_precio),
            idEmpresa: Number(lista?.id_empresa) || Number(producto.id_empresa),
            lista: lista?.nombre || `Lista ${fila.id_lista_precio}`,
            listaPredeterminada: lista?.es_predeterminado === '1',
            listaActiva: lista?.activo !== '0',
            costo,
            precio: venta,
            margen: calcularMargenPrecio(costo, venta),
            fechaInicio: fila.fecha_inicio || '',
            fechaFin: fila.fecha_fin || '',
            vigente: false,
          };
          return { ...precio, vigente: precioEstaVigente(precio, fechaActual) };
        })
        .sort((a, b) => a.lista.localeCompare(b.lista, 'es') || b.fechaInicio.localeCompare(a.fechaInicio));
      const imagenes = datos.imagenes
        .filter(fila => fila.id_producto === producto.id_producto)
        .sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || Number(a.orden) - Number(b.orden))
        .map(fila => fila.url_imagen)
        .filter(Boolean);
      const movimiento = datos.kardex
        .filter(fila => fila.id_producto === producto.id_producto)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const suma = (campo: keyof Pick<InventarioProductoCatalogo, 'stock' | 'stockReorden' | 'stockCritico' | 'stockMaximo'>) =>
        inventarios.reduce((total, fila) => total + fila[campo], 0);
      const estatus = producto.estatus || 'Sin estatus';

      return this.actualizarResumenPrecio({
        id: Number(producto.id_producto),
        idEmpresa: Number(producto.id_empresa),
        empresa: empresas.get(producto.id_empresa) || `Empresa ${producto.id_empresa}`,
        sku: producto.sku,
        codigo: producto.codigo_barras || '',
        producto: producto.nombre_producto,
        descripcion: producto.descripcion || '',
        tipo: producto.tipo || 'Sin tipo',
        idMarca: Number(producto.id_marca),
        marca: marcas.get(producto.id_marca) || `Marca ${producto.id_marca}`,
        idCategoria: Number(producto.id_categoria),
        categoria: categorias.get(producto.id_categoria) || `Categoría ${producto.id_categoria}`,
        idUnidad: Number(producto.id_unidad),
        medida: unidades.get(producto.id_unidad) || `Unidad ${producto.id_unidad}`,
        estatus,
        precio: 0,
        costo: 0,
        margen: 0,
        listaPrecio: 'Sin precio vigente',
        precios,
        pos: producto.en_punto_venta === '1',
        linea: producto.en_catalogo_linea === '1',
        estado: estatus.toLocaleLowerCase() === 'vigente',
        requiereReceta: producto.requiere_receta === '1',
        usarExistencias: producto.usar_existencias === '1',
        almacen: inventarios.length === 1 ? inventarios[0].almacen : inventarios.length ? `${inventarios.length} almacenes` : 'Sin inventario',
        anaquel: inventarios.length === 1 ? inventarios[0].anaquel : '—',
        inventarios,
        stock: suma('stock'),
        stockReorden: suma('stockReorden'),
        stockCritico: suma('stockCritico'),
        stockMaximo: suma('stockMaximo'),
        ubicacionDefault: producto.ubicacion_default || '—',
        claveSat: producto.clave_sat || '—',
        imagen: imagenes[0] || '',
        imagenes,
        ultimoMovimiento: movimiento ? `${movimiento.fecha} · ${movimiento.referencia || 'Sin referencia'} · ${movimiento.cantidad}` : 'Sin movimientos',
        fechaActualizacion: producto.fecha_actualizacion || '',
        fechaCreacion: producto.fecha_creacion || '',
      }, fechaActual);
    });
  }

  private normalizarProducto(producto: ProductoCatalogo): ProductoCatalogo {
    return this.actualizarResumenPrecio({
      ...producto,
      precios: Array.isArray(producto.precios) ? producto.precios : [],
      inventarios: Array.isArray(producto.inventarios) ? producto.inventarios : [],
      imagenes: Array.isArray(producto.imagenes)
        ? producto.imagenes
        : producto.imagen ? [producto.imagen] : [],
    });
  }

  private seleccionarPrecioPrincipal(precios: PrecioProductoCatalogo[]): PrecioProductoCatalogo | undefined {
    const ordenar = (a: PrecioProductoCatalogo, b: PrecioProductoCatalogo) =>
      Number(b.listaPredeterminada) - Number(a.listaPredeterminada)
      || b.fechaInicio.localeCompare(a.fechaInicio)
      || b.id - a.id;
    return [...precios].filter(precio => precio.vigente).sort(ordenar)[0];
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private leer<T>(archivo: string, requerido = false): Observable<T[]> {
    return this.db.leer<T>(archivo, requerido);
  }

  private combinarCatalogoLocal<T extends { id: string }>(clave: string, fuente: T[]): T[] {
    const estado = this.persistencia.leer<EstadoCatalogoLocal<T>>(
      clave,
      { registros: [], eliminados: [] },
    );
    const eliminados = new Set(estado.eliminados || []);
    const locales = new Map((estado.registros || []).map(registro => [registro.id, registro]));
    const idsFuente = new Set(fuente.map(registro => registro.id));
    return [
      ...fuente
        .filter(registro => !eliminados.has(registro.id))
        .map(registro => locales.get(registro.id) || registro),
      ...(estado.registros || []).filter(
        registro => !idsFuente.has(registro.id) && !eliminados.has(registro.id),
      ),
    ];
  }

  private idOpcionCatalogo(id: string): number {
    const numerico = Number(id);
    if (Number.isSafeInteger(numerico) && numerico > 0) return numerico;
    return 0;
  }
}

export function calcularMargenPrecio(costo: number, precio: number): number {
  const costoNumerico = Number(costo) || 0;
  const precioNumerico = Number(precio) || 0;
  return costoNumerico > 0
    ? Math.round(((precioNumerico - costoNumerico) / costoNumerico) * 10000) / 100
    : 0;
}

export function precioEstaVigente(
  precio: Pick<PrecioProductoCatalogo, 'listaActiva' | 'fechaInicio' | 'fechaFin'>,
  fecha = new Date().toISOString().slice(0, 10),
): boolean {
  return precio.listaActiva
    && (!precio.fechaInicio || precio.fechaInicio <= fecha)
    && (!precio.fechaFin || precio.fechaFin >= fecha);
}
