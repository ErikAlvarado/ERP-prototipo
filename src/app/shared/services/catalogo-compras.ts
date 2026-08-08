import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
  calcularMargenPrecio,
  CatalogoProductos,
  InventarioProductoCatalogo,
  PrecioProductoCatalogo,
  ProductoCatalogo,
} from './catalogo-productos';
import { PersistenciaLocal } from './persistencia-local';
import { PersistenciaComprasTxt } from './persistencia-compras-txt';

export type CategoriaProducto = string;

export interface ExistenciaProductoCompra {
  almacenId: number;
  almacen: string;
  stock: number;
  stockReorden: number;
  stockCritico: number;
  stockMaximo: number;
  actualizadaEn: string;
}

export interface RelacionProductoProveedorCompra {
  proveedorId: number;
  proveedor: string;
  skuProveedor: string;
  precioReferencia: number;
  diasEntrega: number;
  cantidadMinima: number;
}

export interface ProductoCompra {
  id: number;
  sku: string;
  codigo: string;
  categoria: CategoriaProducto;
  nombre: string;
  proveedorId: number | null;
  proveedor: string;
  skuProveedor: string;
  precio: number;
  unidad: string;
  stock: number;
  stockReorden: number;
  existencias: ExistenciaProductoCompra[];
  relaciones: RelacionProductoProveedorCompra[];
  cantidadMinima: number;
  diasEntrega: number;
  favorito: boolean;
}

export interface AlmacenCompra {
  id: number;
  nombre: string;
}

export interface EntradaInventarioCompra {
  almacenId: number;
  almacen: string;
  partidas: Array<{
    productoId: number;
    cantidad: number;
  }>;
}

export interface ProveedorCompra {
  id: number;
  inicial: string;
  nombre: string;
  razonSocial: string;
  rfc: string;
  direccionFiscal: string;
  categoria: string;
  contacto: string;
  correo: string;
  telefono: string;
  activo: boolean;
  estado: 'Activo' | 'Inactivo';
  ultimaCompra: string;
  totalCompra: string;
  tiempoSurtido: string;
  unidadCompra: string;
  productosVinculados: number;
  origen: 'base' | 'local';
}

export interface NuevoProveedorCompra {
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  direccionFiscal: string;
  contacto: string;
  correo: string;
  telefono: string;
}

export interface InventarioNuevoProductoProveedorCompra {
  idAlmacen: number;
  idAnaquel: number;
  stock: number;
  stockReorden: number;
  stockCritico: number;
  stockMaximo: number;
  anaquel: string;
}

export interface NuevoProductoProveedorCompra {
  idEmpresa: number;
  sku: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  idMarca: number;
  idCategoria: number;
  idUnidad: number;
  estatus: string;
  pos: boolean;
  linea: boolean;
  requiereReceta: boolean;
  usarExistencias: boolean;
  costo: number;
  precio: number;
  inventarios: InventarioNuevoProductoProveedorCompra[];
  skuProveedor: string;
  precioReferencia: number;
  diasEntrega: number;
  cantidadMinima: number;
}

interface ProveedorDb {
  id_proveedor: string;
  razon_social: string;
  nombre_comercial: string;
  rfc: string;
  correo: string;
  telefono: string;
  direccion_fiscal: string;
  activo: string;
}

interface ContactoProveedorDb {
  id_proveedor: string;
  nombre: string;
  es_principal: string;
  activo: string;
}

interface RelacionProveedorProductoDb {
  id_proveedor: string;
  id_producto: string;
  sku_proveedor: string;
  precio_referencia: string;
  dias_entrega: string;
  cantidad_minima: string;
  activo: string;
}

interface OrdenCompraDb {
  id_orden_compra: string;
  id_proveedor: string;
  fecha_orden: string;
}

interface DetalleOrdenCompraDb {
  id_orden_compra: string;
  cantidad_ordenada: string;
  precio_unitario: string;
  descuento_porcentaje: string;
  tasa_impuesto: string;
}

interface RelacionProveedorProductoLocal {
  proveedorId: number;
  productoId: number;
  skuProveedor: string;
  precioReferencia: number;
  diasEntrega: number;
  cantidadMinima: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogoCompras {
  private readonly http = inject(HttpClient);
  private readonly catalogoProductos = inject(CatalogoProductos);
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly persistenciaTxt = inject(PersistenciaComprasTxt);
  private readonly rutaCompras = '/assets/db/compras_bd';
  private readonly claveFavoritos = 'erp.catalogo-compras-favoritos-v2';
  private readonly claveCatalogoAnterior = 'erp.catalogo-compras';
  private readonly claveProveedoresLocales = 'erp.proveedores-locales-v2';
  private readonly claveEstatusProveedores = 'erp.proveedores-estatus-v1';
  private readonly claveRelacionesLocales = 'erp.proveedores-productos-v1';

  private productosFuente: ProductoCatalogo[] = [];
  private proveedoresFuente: ProveedorDb[] = [];
  private contactosFuente: ContactoProveedorDb[] = [];
  private relacionesFuente: RelacionProveedorProductoLocal[] = [];
  private ordenesFuente: OrdenCompraDb[] = [];
  private detallesOrdenFuente: DetalleOrdenCompraDb[] = [];
  private readonly favoritosIds = signal<number[]>(this.cargarFavoritos());

  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly guardandoTxt = this.persistenciaTxt.guardando;
  readonly errorPersistenciaTxt = this.persistenciaTxt.ultimoError;
  readonly productos = signal<ProductoCompra[]>([]);
  readonly proveedores = signal<ProveedorCompra[]>([]);
  readonly almacenes = signal<AlmacenCompra[]>([]);
  readonly favoritos = computed(() =>
    this.productos().filter(producto => producto.favorito),
  );
  readonly categorias = computed(() =>
    [...new Set(this.productos().map(producto => producto.categoria))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es')),
  );

  constructor() {
    this.catalogoProductos.cambios$?.subscribe(() => this.recargar());
    this.cargar();
  }

  recargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorCarga.set('');
    this.cargar();
  }

  proveedorPorId(id: number): ProveedorCompra | undefined {
    return this.proveedores().find(proveedor => proveedor.id === id);
  }

  productosDeProveedor(idProveedor: number): ProductoCompra[] {
    const proveedor = this.proveedorPorId(idProveedor);
    if (!proveedor?.activo) return [];
    return this.productos()
      .filter(producto =>
        producto.relaciones.some(relacion => relacion.proveedorId === idProveedor))
      .map(producto => {
        const relacion = producto.relaciones.find(
          item => item.proveedorId === idProveedor,
        )!;
        return {
          ...producto,
          proveedorId: relacion.proveedorId,
          proveedor: relacion.proveedor,
          skuProveedor: relacion.skuProveedor,
          precio: relacion.precioReferencia,
          cantidadMinima: relacion.cantidadMinima,
          diasEntrega: relacion.diasEntrega,
        };
      });
  }

  idsProductosDeProveedor(idProveedor: number): number[] {
    return this.productosDeProveedor(idProveedor).map(producto => producto.id);
  }

  registrarEntradaInventario(destinos: readonly EntradaInventarioCompra[]): void {
    const cantidades = new Map<string, number>();
    for (const destino of destinos) {
      for (const partida of destino.partidas) {
        const producto = this.productosFuente.find(item => item.id === Number(partida.productoId));
        const inventario = producto?.inventarios.find(
          item => item.idAlmacen === Number(destino.almacenId),
        );
        const cantidad = Number(partida.cantidad);
        if (!producto) throw new Error(`El producto #${partida.productoId} ya no existe.`);
        if (!inventario) {
          throw new Error(
            `Configura un inventario y anaquel para "${producto.producto}" en ${destino.almacen} antes de comprar.`,
          );
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error(`La cantidad de "${producto.producto}" debe ser mayor que cero.`);
        }
        const clave = `${producto.id}:${inventario.idAlmacen}`;
        cantidades.set(clave, (cantidades.get(clave) || 0) + cantidad);
      }
    }

    const fecha = new Date().toISOString().slice(0, 10);
    this.productosFuente = this.productosFuente.map(producto => {
      const inventarios = producto.inventarios.map(inventario => {
        const cantidad = cantidades.get(`${producto.id}:${inventario.idAlmacen}`) || 0;
        return cantidad
          ? {
              ...inventario,
              stock: inventario.stock + cantidad,
              fechaActualizacion: fecha,
            }
          : inventario;
      });
      if (inventarios === producto.inventarios || !inventarios.some(
        (inventario, indice) => inventario !== producto.inventarios[indice],
      )) return producto;
      const sumar = (campo: 'stock' | 'stockReorden' | 'stockCritico' | 'stockMaximo') =>
        inventarios.reduce((total, inventario) => total + inventario[campo], 0);
      return {
        ...producto,
        inventarios,
        stock: sumar('stock'),
        stockReorden: sumar('stockReorden'),
        stockCritico: sumar('stockCritico'),
        stockMaximo: sumar('stockMaximo'),
        almacen: inventarios.length === 1
          ? inventarios[0].almacen
          : inventarios.length ? `${inventarios.length} almacenes` : 'Sin inventario',
        anaquel: inventarios.length === 1 ? inventarios[0].anaquel : '—',
        ultimoMovimiento: `${fecha} · Entrada por compra`,
        fechaActualizacion: fecha,
      };
    });
    this.catalogoProductos.guardar(this.productosFuente);
    this.reconstruir();
  }

  async actualizarProductosProveedor(
    idProveedor: number,
    idsProductos: readonly number[],
  ): Promise<void> {
    const proveedor = this.proveedorPorId(idProveedor);
    if (!proveedor) throw new Error('El proveedor seleccionado no existe.');
    if (!proveedor.activo) {
      throw new Error('Reactiva el proveedor antes de modificar sus productos.');
    }
    const seleccionados = new Set(idsProductos.map(Number));
    const idsValidos = new Set(this.productosFuente.map(producto => producto.id));
    if ([...seleccionados].some(id => !idsValidos.has(id))) {
      throw new Error('La selección contiene productos que ya no existen.');
    }

    const combinadas = this.relacionesCombinadas(true);
    const anteriores = this.relacionesLocales();
    const locales = anteriores.filter(
      relacion => relacion.proveedorId !== idProveedor,
    );
    for (const producto of this.productosFuente) {
      const existente = combinadas.find(
        relacion =>
          relacion.proveedorId === idProveedor
          && relacion.productoId === producto.id,
      );
      if (!existente && !seleccionados.has(producto.id)) continue;
      locales.push({
        proveedorId: idProveedor,
        productoId: producto.id,
        skuProveedor: existente?.skuProveedor || producto.sku,
        precioReferencia:
          existente?.precioReferencia || producto.costo || producto.precio || 0,
        diasEntrega: existente?.diasEntrega || 1,
        cantidadMinima: existente?.cantidadMinima || 1,
        activo: seleccionados.has(producto.id),
      });
    }
    this.persistencia.guardar(this.claveRelacionesLocales, locales);
    this.reconstruir();
    try {
      await this.persistenciaTxt.reemplazarRelaciones(
        idProveedor,
        locales
          .filter(relacion => relacion.proveedorId === idProveedor)
          .map(relacion => ({
            productoId: relacion.productoId,
            skuProveedor: relacion.skuProveedor,
            precioReferencia: relacion.precioReferencia,
            diasEntrega: relacion.diasEntrega,
            cantidadMinima: relacion.cantidadMinima,
            activo: relacion.activo,
          })),
      );
    } catch {
      this.persistencia.guardar(this.claveRelacionesLocales, anteriores);
      this.reconstruir();
      throw new Error(
        this.errorPersistenciaTxt()
        || 'No fue posible guardar los productos del proveedor en los TXT.',
      );
    }
  }

  async cambiarEstadoProveedor(
    idProveedor: number,
    activo: boolean,
  ): Promise<ProveedorCompra> {
    const proveedor = this.proveedorPorId(idProveedor);
    if (!proveedor) throw new Error('El proveedor seleccionado no existe.');
    const estados = this.estatusLocales();
    this.persistencia.guardar(this.claveEstatusProveedores, {
      ...estados,
      [String(idProveedor)]: activo,
    });
    this.reconstruir();
    try {
      await this.persistenciaTxt.cambiarEstadoProveedor(idProveedor, activo);
      return this.proveedorPorId(idProveedor)!;
    } catch {
      this.persistencia.guardar(this.claveEstatusProveedores, estados);
      this.reconstruir();
      throw new Error(
        this.errorPersistenciaTxt()
        || 'No fue posible guardar el estado del proveedor en los TXT.',
      );
    }
  }

  async registrarProveedor(
    nuevo: NuevoProveedorCompra,
  ): Promise<ProveedorCompra> {
    const nombre = nuevo.nombreComercial.trim();
    const correo = nuevo.correo.trim().toLocaleLowerCase('es-MX');
    const rfc = nuevo.rfc.trim().toLocaleUpperCase('es-MX');
    if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
      throw new Error('El RFC debe tener 12 o 13 caracteres y un formato válido.');
    }
    const duplicado = this.proveedores().find(proveedor =>
      this.normalizar(proveedor.nombre) === this.normalizar(nombre)
      || proveedor.correo.trim().toLocaleLowerCase('es-MX') === correo
      || proveedor.rfc.trim().toLocaleUpperCase('es-MX') === rfc,
    );
    if (duplicado) {
      throw new Error(`El proveedor ya está registrado como ${duplicado.nombre}.`);
    }
    const proveedor: ProveedorCompra = {
      id: Math.max(0, ...this.proveedores().map(item => item.id)) + 1,
      inicial: nombre.charAt(0).toLocaleUpperCase('es-MX') || 'P',
      nombre,
      razonSocial: nuevo.razonSocial.trim(),
      rfc,
      direccionFiscal: nuevo.direccionFiscal.trim(),
      categoria: 'Sin productos vinculados',
      contacto: nuevo.contacto.trim() || 'Sin contacto asignado',
      correo,
      telefono: nuevo.telefono.trim() || 'Sin teléfono',
      activo: true,
      estado: 'Activo',
      ultimaCompra: 'Sin compras',
      totalCompra: '$0',
      tiempoSurtido: 'Por definir',
      unidadCompra: 'Por definir',
      productosVinculados: 0,
      origen: 'local',
    };
    this.persistencia.guardar(this.claveProveedoresLocales, [
      proveedor,
      ...this.proveedoresLocales(),
    ]);
    this.reconstruir();
    try {
      await this.persistenciaTxt.registrarProveedor({
        id: proveedor.id,
        razonSocial: proveedor.razonSocial,
        nombreComercial: proveedor.nombre,
        rfc: proveedor.rfc,
        correo: proveedor.correo,
        telefono: nuevo.telefono.trim(),
        direccionFiscal: proveedor.direccionFiscal,
        contacto: nuevo.contacto.trim(),
      });
      return proveedor;
    } catch {
      this.persistencia.guardar(
        this.claveProveedoresLocales,
        this.proveedoresLocales().filter(item => item.id !== proveedor.id),
      );
      this.reconstruir();
      throw new Error(
        this.errorPersistenciaTxt()
        || 'No fue posible guardar el proveedor en los TXT.',
      );
    }
  }

  async registrarProductoProveedor(
    idProveedor: number,
    nuevo: NuevoProductoProveedorCompra,
  ): Promise<ProductoCompra> {
    const proveedor = this.proveedorPorId(idProveedor);
    if (!proveedor) throw new Error('El proveedor seleccionado no existe.');
    if (!proveedor.activo) {
      throw new Error('Reactiva el proveedor antes de registrar productos.');
    }
    const sku = nuevo.sku.trim().toLocaleUpperCase('es-MX');
    const codigo = nuevo.codigo.trim();
    const nombre = nuevo.nombre.trim();
    if (!sku || !nombre) {
      throw new Error('El SKU y el nombre del producto son obligatorios.');
    }
    if (this.normalizar(nuevo.tipo) !== 'fisico' || !nuevo.usarExistencias) {
      throw new Error('Compras solo puede registrar productos físicos con existencias.');
    }
    const duplicado = this.productosFuente.find(producto =>
      this.normalizar(producto.sku) === this.normalizar(sku)
      || (codigo && this.normalizar(producto.codigo) === this.normalizar(codigo))
      || this.normalizar(producto.producto) === this.normalizar(nombre),
    );
    if (duplicado) {
      throw new Error(`El producto ya está registrado como ${duplicado.producto}.`);
    }
    const inventariosEntrada = Array.isArray(nuevo.inventarios)
      ? nuevo.inventarios
      : [];
    if (!inventariosEntrada.length) {
      throw new Error('Agrega el inventario inicial de al menos un almacén.');
    }
    const almacenesRepetidos = new Set<number>();
    for (const inventario of inventariosEntrada) {
      if (almacenesRepetidos.has(inventario.idAlmacen)) {
        throw new Error('No puedes registrar dos existencias para el mismo almacén.');
      }
      almacenesRepetidos.add(inventario.idAlmacen);
      if (
        inventario.stockCritico > inventario.stockReorden
        || inventario.stockReorden > inventario.stockMaximo
      ) {
        throw new Error('El stock debe cumplir: crítico ≤ reorden ≤ máximo.');
      }
      if (inventario.stock <= 0 || inventario.stock > inventario.stockMaximo) {
        throw new Error(
          'El stock inicial debe ser mayor a cero y no exceder el máximo.',
        );
      }
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const id = Math.max(0, ...this.productosFuente.map(producto => producto.id)) + 1;
    const idPrecio =
      Math.max(
        0,
        ...this.productosFuente.flatMap(producto =>
          (producto.precios || []).map(precio => precio.id)),
      ) + 1;
    const primerIdInventario =
      Math.max(
        0,
        ...this.productosFuente.flatMap(producto =>
          (producto.inventarios || []).map(inventario => inventario.id)),
      ) + 1;
    const precioReferencia = this.productosFuente
      .filter(producto => producto.idEmpresa === nuevo.idEmpresa)
      .flatMap(producto => producto.precios || [])
      .sort((a, b) =>
        Number(b.listaPredeterminada) - Number(a.listaPredeterminada))[0];
    const idLista = precioReferencia?.idLista || 1;
    const lista = precioReferencia?.lista || 'Público General';
    const costo = this.numero(nuevo.costo);
    const precioVenta = this.numero(nuevo.precio);
    const precio: PrecioProductoCatalogo = {
      id: idPrecio,
      idLista,
      idEmpresa: nuevo.idEmpresa,
      lista,
      listaPredeterminada: precioReferencia?.listaPredeterminada ?? true,
      listaActiva: precioReferencia?.listaActiva ?? true,
      costo,
      precio: precioVenta,
      margen: calcularMargenPrecio(costo, precioVenta),
      fechaInicio: fecha,
      fechaFin: '',
      vigente: true,
    };
    const inventarios: InventarioProductoCatalogo[] = inventariosEntrada.map(
      (inventario, indice) => ({
        id: primerIdInventario + indice,
        idAlmacen: inventario.idAlmacen,
        idAnaquel: inventario.idAnaquel,
        almacen:
          this.almacenes().find(item => item.id === inventario.idAlmacen)?.nombre
          || `Almacén ${inventario.idAlmacen}`,
        stock: this.numero(inventario.stock),
        stockReorden: this.numero(inventario.stockReorden),
        stockCritico: this.numero(inventario.stockCritico),
        stockMaximo: this.numero(inventario.stockMaximo),
        anaquel: inventario.anaquel.trim() || '—',
        fechaActualizacion: fecha,
      }),
    );
    const sumar = (
      campo: keyof Pick<
        InventarioProductoCatalogo,
        'stock' | 'stockReorden' | 'stockCritico' | 'stockMaximo'
      >,
    ) => inventarios.reduce((total, inventario) => total + inventario[campo], 0);
    const muestra = (campo: 'idEmpresa' | 'idMarca' | 'idCategoria' | 'idUnidad') =>
      this.productosFuente.find(producto => producto[campo] === nuevo[campo]);
    const producto: ProductoCatalogo = {
      id,
      idEmpresa: nuevo.idEmpresa,
      empresa: muestra('idEmpresa')?.empresa || `Empresa ${nuevo.idEmpresa}`,
      sku,
      codigo,
      producto: nombre,
      descripcion: nuevo.descripcion.trim(),
      tipo: nuevo.tipo.trim() || 'Producto',
      idMarca: nuevo.idMarca,
      marca: muestra('idMarca')?.marca || `Marca ${nuevo.idMarca}`,
      idCategoria: nuevo.idCategoria,
      categoria: muestra('idCategoria')?.categoria || `Categoría ${nuevo.idCategoria}`,
      idUnidad: nuevo.idUnidad,
      medida: muestra('idUnidad')?.medida || `Unidad ${nuevo.idUnidad}`,
      estatus: nuevo.estatus.trim() || 'Vigente',
      precio: precioVenta,
      costo,
      margen: precio.margen,
      listaPrecio: lista,
      precios: [precio],
      pos: nuevo.pos,
      linea: nuevo.linea,
      estado: (nuevo.estatus || 'Vigente').toLocaleLowerCase('es-MX') === 'vigente',
      requiereReceta: nuevo.requiereReceta,
      usarExistencias: nuevo.usarExistencias,
      almacen:
        inventarios.length === 1
          ? inventarios[0].almacen
          : inventarios.length
            ? `${inventarios.length} almacenes`
            : 'Sin inventario',
      anaquel: inventarios.length === 1 ? inventarios[0].anaquel : '—',
      inventarios,
      stock: sumar('stock'),
      stockReorden: sumar('stockReorden'),
      stockCritico: sumar('stockCritico'),
      stockMaximo: sumar('stockMaximo'),
      ubicacionDefault: '—',
      claveSat: '—',
      imagen: '',
      imagenes: [],
      ultimoMovimiento: inventarios.length
        ? `${fecha} · Inventario inicial · ${sumar('stock')}`
        : 'Sin movimientos',
      fechaActualizacion: fecha,
      fechaCreacion: fecha,
    };
    const relacion: RelacionProveedorProductoLocal = {
      proveedorId: idProveedor,
      productoId: id,
      skuProveedor: nuevo.skuProveedor.trim() || sku,
      precioReferencia: this.numero(nuevo.precioReferencia) || costo,
      diasEntrega: Math.max(0, Math.trunc(this.numero(nuevo.diasEntrega))),
      cantidadMinima: Math.max(1, Math.trunc(this.numero(nuevo.cantidadMinima))),
      activo: true,
    };

    const productosAnteriores = this.productosFuente;
    const relacionesAnteriores = this.relacionesLocales();
    this.productosFuente = [...productosAnteriores, producto];
    this.persistencia.guardar(this.claveRelacionesLocales, [
      ...relacionesAnteriores,
      relacion,
    ]);
    this.reconstruir();
    const productoCreado = this.productos().find(item => item.id === id)!;
    this.catalogoProductos.guardar(this.productosFuente);
    try {
      await this.persistenciaTxt.registrarProductoProveedor(idProveedor, {
        producto,
        relacion: {
          skuProveedor: relacion.skuProveedor,
          precioReferencia: relacion.precioReferencia,
          diasEntrega: relacion.diasEntrega,
          cantidadMinima: relacion.cantidadMinima,
        },
      });
      return productoCreado;
    } catch {
      this.productosFuente = productosAnteriores;
      this.persistencia.guardar(
        this.claveRelacionesLocales,
        relacionesAnteriores,
      );
      this.catalogoProductos.guardar(productosAnteriores);
      this.reconstruir();
      throw new Error(
        this.errorPersistenciaTxt()
        || 'No fue posible guardar el producto y su proveedor en los TXT.',
      );
    }
  }

  alternarFavorito(id: number): void {
    const ids = new Set(this.favoritosIds());
    ids.has(id) ? ids.delete(id) : ids.add(id);
    this.guardarFavoritos([...ids]);
  }

  quitarFavorito(id: number): void {
    this.guardarFavoritos(this.favoritosIds().filter(actual => actual !== id));
  }

  private cargar(): void {
    forkJoin({
      productos: this.catalogoProductos.cargar(),
      proveedores: this.leerCompras<ProveedorDb>('proveedores.txt'),
      contactos: this.leerCompras<ContactoProveedorDb>('proveedores_contactos.txt'),
      relaciones:
        this.leerCompras<RelacionProveedorProductoDb>('proveedores_productos.txt'),
      ordenes: this.leerCompras<OrdenCompraDb>('ordenes_compra.txt'),
      detalles: this.leerCompras<DetalleOrdenCompraDb>('ordenes_compra_detalle.txt'),
    }).subscribe({
      next: datos => {
        this.productosFuente = datos.productos;
        this.proveedoresFuente = datos.proveedores;
        this.contactosFuente = datos.contactos;
        this.relacionesFuente = datos.relaciones.map(relacion => ({
          proveedorId: Number(relacion.id_proveedor),
          productoId: Number(relacion.id_producto),
          skuProveedor: relacion.sku_proveedor,
          precioReferencia: this.numero(relacion.precio_referencia),
          diasEntrega: Math.max(0, this.numero(relacion.dias_entrega)),
          cantidadMinima: Math.max(1, this.numero(relacion.cantidad_minima)),
          activo: relacion.activo !== '0',
        }));
        this.ordenesFuente = datos.ordenes;
        this.detallesOrdenFuente = datos.detalles;
        this.reconstruir();
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(
          'No fue posible cargar los productos e inventarios para Compras.',
        );
        this.cargando.set(false);
      },
    });
  }

  private reconstruir(): void {
    const proveedores = this.construirProveedores();
    const proveedoresPorId = new Map(
      proveedores.map(proveedor => [proveedor.id, proveedor]),
    );
    const relaciones = this.relacionesCombinadas().filter(
      relacion => proveedoresPorId.get(relacion.proveedorId)?.activo,
    );
    const favoritos = new Set(this.favoritosIds());
    const productos = this.productosFuente
      .filter(producto => producto.estado)
      .map(producto => {
        const relacionesProducto: RelacionProductoProveedorCompra[] = relaciones
          .filter(relacion => relacion.productoId === producto.id)
          .map(relacion => ({
            proveedorId: relacion.proveedorId,
            proveedor:
              proveedoresPorId.get(relacion.proveedorId)?.nombre
              || `Proveedor ${relacion.proveedorId}`,
            skuProveedor: relacion.skuProveedor,
            precioReferencia: relacion.precioReferencia,
            diasEntrega: relacion.diasEntrega,
            cantidadMinima: relacion.cantidadMinima,
          }));
        const principal = relacionesProducto[0];
        return {
          id: producto.id,
          sku: producto.sku,
          codigo: producto.codigo,
          categoria: producto.categoria || 'Sin categoría',
          nombre: producto.producto,
          proveedorId: principal?.proveedorId ?? null,
          proveedor: principal?.proveedor || 'Sin proveedor asignado',
          skuProveedor: principal?.skuProveedor || producto.sku,
          precio:
            principal?.precioReferencia || producto.costo || producto.precio || 0,
          unidad: producto.medida,
          stock: producto.stock,
          stockReorden: producto.stockReorden,
          existencias: (producto.inventarios || []).map(inventario => ({
            almacenId: inventario.idAlmacen,
            almacen: inventario.almacen,
            stock: inventario.stock,
            stockReorden: inventario.stockReorden,
            stockCritico: inventario.stockCritico,
            stockMaximo: inventario.stockMaximo,
            actualizadaEn: inventario.fechaActualizacion,
          })),
          relaciones: relacionesProducto,
          cantidadMinima: principal?.cantidadMinima || 1,
          diasEntrega: principal?.diasEntrega || 0,
          favorito: favoritos.has(producto.id),
        } satisfies ProductoCompra;
      });

    const almacenes = new Map<number, string>();
    for (const producto of productos) {
      for (const existencia of producto.existencias) {
        almacenes.set(existencia.almacenId, existencia.almacen);
      }
    }
    this.productos.set(productos);
    this.proveedores.set(
      proveedores.map(proveedor => {
        const vinculados = productos.filter(producto =>
          producto.relaciones.some(
            relacion => relacion.proveedorId === proveedor.id,
          ));
        const categorias = [...new Set(vinculados.map(item => item.categoria))];
        const unidades = [...new Set(vinculados.map(item => item.unidad))];
        const entregas = vinculados
          .map(item =>
            item.relaciones.find(relacion => relacion.proveedorId === proveedor.id)
              ?.diasEntrega || 0)
          .filter(Boolean);
        return {
          ...proveedor,
          categoria: categorias.join(', ') || proveedor.categoria,
          productosVinculados: vinculados.length,
          tiempoSurtido: this.formatearEntrega(entregas),
          unidadCompra:
            unidades.length === 1
              ? unidades[0]
              : unidades.length > 1
                ? 'Varias unidades'
                : proveedor.unidadCompra,
        };
      }),
    );
    this.almacenes.set(
      [...almacenes].map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    );
  }

  private construirProveedores(): ProveedorCompra[] {
    const estados = this.estatusLocales();
    const productosPorId = new Map(
      this.productosFuente.map(producto => [producto.id, producto]),
    );
    const detallesPorOrden = new Map<string, DetalleOrdenCompraDb[]>();
    for (const detalle of this.detallesOrdenFuente) {
      detallesPorOrden.set(detalle.id_orden_compra, [
        ...(detallesPorOrden.get(detalle.id_orden_compra) || []),
        detalle,
      ]);
    }
    const base = this.proveedoresFuente.map(fila => {
      const id = Number(fila.id_proveedor);
      const relaciones = this.relacionesCombinadas().filter(
        relacion => relacion.proveedorId === id,
      );
      const productos = relaciones
        .map(relacion => productosPorId.get(relacion.productoId))
        .filter((producto): producto is ProductoCatalogo => Boolean(producto));
      const ordenes = this.ordenesFuente
        .filter(orden => Number(orden.id_proveedor) === id)
        .sort((a, b) => b.fecha_orden.localeCompare(a.fecha_orden));
      const ultimaOrden = ordenes[0];
      const total = ultimaOrden
        ? (detallesPorOrden.get(ultimaOrden.id_orden_compra) || [])
          .reduce((suma, detalle) => {
            const bruto =
              this.numero(detalle.cantidad_ordenada)
              * this.numero(detalle.precio_unitario);
            const descuento =
              bruto * (this.numero(detalle.descuento_porcentaje) / 100);
            const baseImpuesto = bruto - descuento;
            return suma + baseImpuesto
              + baseImpuesto * (this.numero(detalle.tasa_impuesto) / 100);
          }, 0)
        : 0;
      const contacto = this.contactosFuente.find(item =>
        Number(item.id_proveedor) === id
        && item.activo !== '0'
        && item.es_principal === '1');
      const activoBase = fila.activo !== '0';
      const activo = estados[String(id)] ?? activoBase;
      const nombre = fila.nombre_comercial || fila.razon_social;
      return {
        id,
        inicial: nombre.charAt(0).toLocaleUpperCase('es-MX') || 'P',
        nombre,
        razonSocial: fila.razon_social,
        rfc: fila.rfc,
        direccionFiscal: fila.direccion_fiscal,
        categoria:
          [...new Set(productos.map(producto => producto.categoria))]
            .join(', ') || 'Sin productos vinculados',
        contacto: contacto?.nombre || 'Sin contacto asignado',
        correo: fila.correo,
        telefono: fila.telefono,
        activo,
        estado: activo ? 'Activo' : 'Inactivo',
        ultimaCompra: ultimaOrden?.fecha_orden || 'Sin compras',
        totalCompra: this.formatearMoneda(total),
        tiempoSurtido: 'Por definir',
        unidadCompra: 'Por definir',
        productosVinculados: relaciones.length,
        origen: 'base',
      } satisfies ProveedorCompra;
    });
    const idsBase = new Set(base.map(proveedor => proveedor.id));
    const locales = this.proveedoresLocales()
      .filter(proveedor => !idsBase.has(proveedor.id))
      .map(proveedor => {
        const activo = estados[String(proveedor.id)] ?? proveedor.activo;
        return {
          ...proveedor,
          activo,
          estado: activo ? 'Activo' as const : 'Inactivo' as const,
        };
      });
    return [...locales, ...base];
  }

  private relacionesCombinadas(
    incluirInactivas = false,
  ): RelacionProveedorProductoLocal[] {
    const mapa = new Map<string, RelacionProveedorProductoLocal>();
    for (const relacion of this.relacionesFuente) {
      mapa.set(this.claveRelacion(relacion), relacion);
    }
    for (const relacion of this.relacionesLocales()) {
      mapa.set(this.claveRelacion(relacion), relacion);
    }
    return [...mapa.values()].filter(
      relacion => incluirInactivas || relacion.activo,
    );
  }

  private claveRelacion(
    relacion: Pick<RelacionProveedorProductoLocal, 'proveedorId' | 'productoId'>,
  ): string {
    return `${relacion.proveedorId}:${relacion.productoId}`;
  }

  private relacionesLocales(): RelacionProveedorProductoLocal[] {
    return this.persistencia.leer<RelacionProveedorProductoLocal[]>(
      this.claveRelacionesLocales,
      [],
    );
  }

  private proveedoresLocales(): ProveedorCompra[] {
    return this.persistencia.leer<ProveedorCompra[]>(
      this.claveProveedoresLocales,
      [],
    );
  }

  private estatusLocales(): Record<string, boolean> {
    return this.persistencia.leer<Record<string, boolean>>(
      this.claveEstatusProveedores,
      {},
    );
  }

  private cargarFavoritos(): number[] {
    const guardados = this.persistencia.leer<number[]>(
      this.claveFavoritos,
      [],
    );
    if (guardados.length) return guardados;
    return this.persistencia
      .leer<Array<{ id?: number; favorito?: boolean }>>(
        this.claveCatalogoAnterior,
        [],
      )
      .filter(producto => producto.favorito && Number.isFinite(Number(producto.id)))
      .map(producto => Number(producto.id));
  }

  private guardarFavoritos(ids: number[]): void {
    this.favoritosIds.set(ids);
    this.persistencia.guardar(this.claveFavoritos, ids);
    this.productos.update(productos =>
      productos.map(producto => ({
        ...producto,
        favorito: ids.includes(producto.id),
      })),
    );
  }

  private leerCompras<T>(archivo: string) {
    return this.http
      .get(`${this.rutaCompras}/${encodeURIComponent(archivo)}?v=${Date.now()}`, {
        responseType: 'text',
      })
      .pipe(
        map(texto => this.parsear<T>(texto)),
        catchError(() => of([] as T[])),
      );
  }

  private parsear<T>(texto: string): T[] {
    const lineas = texto.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const encabezado = lineas.shift();
    if (!encabezado?.includes('|') || /^\s*<!doctype|^\s*<html/i.test(encabezado)) {
      return [];
    }
    const columnas = encabezado.split('|').map(columna => columna.trim());
    return lineas
      .filter(fila => fila.trim())
      .map(fila => {
        const valores = fila.split('|');
        return Object.fromEntries(
          columnas.map((columna, indice) => [columna, valores[indice] ?? '']),
        ) as T;
      });
  }

  private formatearEntrega(dias: number[]): string {
    if (!dias.length) return 'Por definir';
    const menor = Math.min(...dias);
    const mayor = Math.max(...dias);
    return menor === mayor
      ? `${menor} días hábiles`
      : `${menor} a ${mayor} días hábiles`;
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  private numero(valor: string | number): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
