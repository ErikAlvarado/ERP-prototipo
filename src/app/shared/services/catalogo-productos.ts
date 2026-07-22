import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { PersistenciaLocal } from './persistencia-local';

export interface OpcionProducto {
  id: number;
  nombre: string;
}

export interface OpcionesProducto {
  empresas: OpcionProducto[];
  categorias: OpcionProducto[];
  marcas: OpcionProducto[];
  unidades: OpcionProducto[];
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
  pos: boolean;
  linea: boolean;
  estado: boolean;
  requiereReceta: boolean;
  usarExistencias: boolean;
  usarLotes: boolean;
  almacen: string;
  anaquel: string;
  lote: string;
  caducidad: string;
  stock: number;
  stockReorden: number;
  stockCritico: number;
  stockMaximo: number;
  ubicacionDefault: string;
  claveSat: string;
  imagen: string;
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
  usar_lotes_caducidades: string;
  clave_sat: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface EmpresaDb { id_empresa: string; nombre_empresa: string; }
interface CategoriaDb { id_categoria: string; nombre_categoria: string; }
interface UnidadDb { id_unidad: string; nombre: string; }
interface MarcaDb { id_marca: string; nombre: string; }
interface AlmacenDb { id_almacen: string; nombre_almacen: string; }
interface ImagenDb { id_producto: string; url_imagen: string; es_principal: string; orden: string; }
interface InventarioDb { id_producto: string; id_almacen: string; lote: string; fecha_caducidad: string; stock: string; stock_reorden: string; stock_critico: string; stock_maximo: string; anaquel: string; fecha_actualizacion: string; }
interface PrecioDb { id_producto: string; precio_costo: string; precio_venta: string; margen_ganancia: string; fecha_inicio: string; fecha_fin: string; }
interface MovimientoDb { id_producto: string; cantidad: string; referencia: string; fecha: string; }

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

  constructor(private http: HttpClient, private persistencia: PersistenciaLocal) {}

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
    }).pipe(map(datos => ({
      empresas: datos.empresas.map(fila => ({ id: Number(fila.id_empresa), nombre: fila.nombre_empresa })),
      categorias: datos.categorias.map(fila => ({ id: Number(fila.id_categoria), nombre: fila.nombre_categoria })),
      marcas: datos.marcas.map(fila => ({ id: Number(fila.id_marca), nombre: fila.nombre })),
      unidades: datos.unidades.map(fila => ({ id: Number(fila.id_unidad), nombre: fila.nombre })),
    })));
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

  private cargarArchivos(): Observable<DatosRelacionados> {
    return forkJoin({
      productos: this.leer<ProductoDb>('productos.txt', true),
      empresas: this.leer<EmpresaDb>('empresas.txt'),
      categorias: this.leer<CategoriaDb>('categorias.txt'),
      unidades: this.leer<UnidadDb>('unidades.txt'),
      marcas: this.leer<MarcaDb>('marcas.txt'),
      precios: this.leer<PrecioDb>('productos_precios.txt'),
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
      .map(producto => ({ ...producto, ...(actualizaciones.get(producto.id) || {}) }));
    const idsOrigen = new Set(productosOrigen.map(producto => producto.id));
    const agregados = cambios.agregados.filter(producto => !idsOrigen.has(producto.id));
    return [...relacionados, ...agregados];
  }

  private relacionar(datos: DatosRelacionados): ProductoCatalogo[] {
    const empresas = new Map(datos.empresas.map(fila => [fila.id_empresa, fila.nombre_empresa]));
    const categorias = new Map(datos.categorias.map(fila => [fila.id_categoria, fila.nombre_categoria]));
    const unidades = new Map(datos.unidades.map(fila => [fila.id_unidad, fila.nombre]));
    const marcas = new Map(datos.marcas.map(fila => [fila.id_marca, fila.nombre]));
    const almacenes = new Map(datos.almacenes.map(fila => [fila.id_almacen, fila.nombre_almacen]));

    return datos.productos.map(producto => {
      const existencias = datos.inventario.filter(fila => fila.id_producto === producto.id_producto);
      const precio = datos.precios
        .filter(fila => fila.id_producto === producto.id_producto)
        .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
      const imagen = datos.imagenes
        .filter(fila => fila.id_producto === producto.id_producto)
        .sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || Number(a.orden) - Number(b.orden))[0];
      const movimiento = datos.kardex
        .filter(fila => fila.id_producto === producto.id_producto)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const suma = (campo: keyof InventarioDb) => existencias.reduce((total, fila) => total + (Number(fila[campo]) || 0), 0);
      const estatus = producto.estatus || 'Sin estatus';

      return {
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
        precio: Number(precio?.precio_venta) || 0,
        costo: Number(precio?.precio_costo) || 0,
        margen: Number(precio?.margen_ganancia) || 0,
        pos: producto.en_punto_venta === '1',
        linea: producto.en_catalogo_linea === '1',
        estado: estatus.toLocaleLowerCase() === 'vigente',
        requiereReceta: producto.requiere_receta === '1',
        usarExistencias: producto.usar_existencias === '1',
        usarLotes: producto.usar_lotes_caducidades === '1',
        almacen: existencias.map(fila => almacenes.get(fila.id_almacen) || `Almacén ${fila.id_almacen}`).join(', ') || 'Sin inventario',
        anaquel: existencias.map(fila => fila.anaquel).filter(Boolean).join(', ') || '—',
        lote: existencias.map(fila => fila.lote).filter(Boolean).join(', ') || '—',
        caducidad: existencias.map(fila => fila.fecha_caducidad).filter(Boolean).join(', ') || '—',
        stock: suma('stock'),
        stockReorden: suma('stock_reorden'),
        stockCritico: suma('stock_critico'),
        stockMaximo: suma('stock_maximo'),
        ubicacionDefault: producto.ubicacion_default || '—',
        claveSat: producto.clave_sat || '—',
        imagen: imagen?.url_imagen || '',
        ultimoMovimiento: movimiento ? `${movimiento.fecha} · ${movimiento.referencia || 'Sin referencia'} · ${movimiento.cantidad}` : 'Sin movimientos',
        fechaActualizacion: producto.fecha_actualizacion || '',
        fechaCreacion: producto.fecha_creacion || '',
      };
    });
  }

  private leer<T>(archivo: string, requerido = false): Observable<T[]> {
    return this.http.get(`assets/db/${archivo}?v=${Date.now()}`, { responseType: 'text' }).pipe(
      map(texto => this.parsear<T>(texto)),
      catchError(error => requerido
        ? throwError(() => new Error(`No se pudo cargar ${archivo}.`, { cause: error }))
        : of([] as T[])),
    );
  }

  private parsear<T>(texto: string): T[] {
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const encabezado = lineas.shift();
    if (!encabezado) return [];
    const columnas = encabezado.split('|').map(columna => columna.trim());
    return lineas
      .filter(fila => fila.trim().length > 0)
      .map(fila => {
        const valores = fila.split('|');
        return Object.fromEntries(columnas.map((columna, indice) => [columna, valores[indice] ?? ''])) as T;
      });
  }
}
