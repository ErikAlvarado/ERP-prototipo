import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  InventarioProductoCatalogo,
  OpcionProducto,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../../../../shared/services/catalogo-productos';

export interface OpcionAlmacenProducto {
  id: number;
  idEmpresa: number;
  nombre: string;
}

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: ProductoCatalogo;
  opciones: OpcionesProducto;
  almacenes: OpcionAlmacenProducto[];
  productos: ProductoCatalogo[];
}

@Component({
  selector: 'app-product-d',
  imports: [SHARED_IMPORTS],
  templateUrl: './product-d.html',
  styleUrl: './product-d.css',
})
export class ProductD {
  producto: ProductoCatalogo;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<ProductD>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData,
  ) {
    this.producto = { ...this.crearProductoVacio(data.opciones), ...(data.product || {}) };
    this.producto.inventarios = (data.product?.inventarios || []).map(inventario => ({ ...inventario }));
    if (data.mode === 'add') this.prepararInventarioInicial();
  }

  get tiposDisponibles(): string[] {
    return [...new Set([this.producto.tipo, 'Físico', 'Servicio', 'Digital'].filter(Boolean))];
  }

  get estatusDisponibles(): string[] {
    return ['Vigente', 'Descontinuado', 'Eliminado'];
  }

  get marcasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.marcas);
  }

  get categoriasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.categorias);
  }

  get unidadesDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.data.opciones.unidades);
  }

  get almacenesDisponibles(): OpcionAlmacenProducto[] {
    return this.data.almacenes.filter(
      almacen => almacen.idEmpresa === Number(this.producto.idEmpresa),
    );
  }

  get debeCapturarInventarioInicial(): boolean {
    return this.producto.usarExistencias
      && (this.data.mode === 'add'
        || !this.data.product?.usarExistencias
        || !this.data.product?.inventarios?.length);
  }

  get inventarioInicial(): InventarioProductoCatalogo | undefined {
    return this.producto.inventarios[0];
  }

  cambiarEmpresa(id: number): void {
    this.producto.empresa = this.nombreOpcion(this.data.opciones.empresas, id, this.producto.empresa);
    this.producto.idEmpresa = Number(id);
    this.producto.precios = this.producto.precios.filter(precio => precio.idEmpresa === this.producto.idEmpresa);
    const principal = this.producto.precios.find(precio => precio.vigente && precio.listaPredeterminada)
      || this.producto.precios.find(precio => precio.vigente);
    this.producto.precio = principal?.precio || 0;
    this.producto.costo = principal?.costo || 0;
    this.producto.margen = principal?.margen || 0;
    this.producto.listaPrecio = principal?.lista || 'Sin precio vigente';
    this.asignarPrimeraOpcion('marca', this.marcasDisponibles);
    this.asignarPrimeraOpcion('categoria', this.categoriasDisponibles);
    this.asignarPrimeraOpcion('unidad', this.unidadesDisponibles);
    if (this.debeCapturarInventarioInicial) this.prepararInventarioInicial(true);
  }

  cambiarMarca(id: number): void {
    this.producto.marca = this.nombreOpcion(this.data.opciones.marcas, id, this.producto.marca);
  }

  cambiarCategoria(id: number): void {
    this.producto.categoria = this.nombreOpcion(this.data.opciones.categorias, id, this.producto.categoria);
  }

  cambiarUnidad(id: number): void {
    this.producto.medida = this.nombreOpcion(this.data.opciones.unidades, id, this.producto.medida);
  }

  cambiarControlExistencias(controlar: boolean): void {
    this.producto.usarExistencias = controlar;
    if (controlar && !this.producto.inventarios.length) {
      this.prepararInventarioInicial();
    } else if (!controlar && this.data.mode === 'add') {
      this.producto.inventarios = [];
      this.actualizarResumenInventario();
    }
  }

  cambiarAlmacenInicial(id: number): void {
    const inventario = this.inventarioInicial;
    const almacen = this.almacenesDisponibles.find(opcion => opcion.id === Number(id));
    if (!inventario || !almacen) return;
    inventario.idAlmacen = almacen.id;
    inventario.almacen = almacen.nombre;
  }

  cambiarEstatus(estatus: string): void {
    this.producto.estatus = estatus;
    this.producto.estado = estatus.toLocaleLowerCase() === 'vigente';
  }

  guardar(): void {
    this.error = '';
    const nombre = this.producto.producto.trim();
    const sku = this.producto.sku.trim();
    const codigo = String(this.producto.codigo || '').trim();

    if (!nombre) {
      this.error = 'El nombre del producto es obligatorio.';
      return;
    }
    if (!sku) {
      this.error = 'El SKU es obligatorio.';
      return;
    }
    if (!this.producto.idEmpresa || !this.producto.idMarca || !this.producto.idCategoria || !this.producto.idUnidad) {
      this.error = 'Selecciona empresa, marca, categoría y unidad.';
      return;
    }
    if (!this.marcasDisponibles.some(opcion => opcion.id === Number(this.producto.idMarca))
      || !this.categoriasDisponibles.some(opcion => opcion.id === Number(this.producto.idCategoria))
      || !this.unidadesDisponibles.some(opcion => opcion.id === Number(this.producto.idUnidad))) {
      this.error = 'La marca, categoría y unidad deben pertenecer a la empresa seleccionada.';
      return;
    }
    if (this.data.productos.some(producto => producto.id !== this.producto.id && producto.sku.trim().toLocaleLowerCase() === sku.toLocaleLowerCase())) {
      this.error = 'Ya existe otro producto con ese SKU.';
      return;
    }
    if (codigo && this.data.productos.some(producto => producto.id !== this.producto.id && producto.codigo === codigo)) {
      this.error = 'Ya existe otro producto con ese código de barras.';
      return;
    }
    if (this.debeCapturarInventarioInicial && !this.validarInventarioInicial()) return;
    const hoy = new Date().toISOString().slice(0, 10);
    if (this.debeCapturarInventarioInicial && this.inventarioInicial) {
      this.inventarioInicial.fechaActualizacion = hoy;
      this.actualizarResumenInventario();
    }

    this.dialogRef.close({
      ...this.producto,
      producto: nombre,
      sku,
      codigo,
      descripcion: this.producto.descripcion.trim(),
      tipo: this.producto.tipo.trim(),
      estatus: this.producto.estatus.trim(),
      estado: this.producto.estatus.trim().toLocaleLowerCase() === 'vigente',
      ubicacionDefault: this.producto.ubicacionDefault.trim(),
      claveSat: this.producto.claveSat.trim(),
      fechaCreacion: this.producto.fechaCreacion || hoy,
      fechaActualizacion: hoy,
    } satisfies ProductoCatalogo);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private crearProductoVacio(opciones: OpcionesProducto): ProductoCatalogo {
    const empresa = opciones.empresas[0];
    const marca = opciones.marcas.find(opcion => opcion.idEmpresa === empresa?.id);
    const categoria = opciones.categorias.find(opcion => opcion.idEmpresa === empresa?.id);
    const unidad = opciones.unidades.find(opcion => opcion.idEmpresa === empresa?.id);
    const hoy = new Date().toISOString().slice(0, 10);

    return {
      id: 0,
      idEmpresa: empresa?.id || 0,
      empresa: empresa?.nombre || '',
      sku: '',
      codigo: '',
      producto: '',
      descripcion: '',
      tipo: 'Físico',
      idMarca: marca?.id || 0,
      marca: marca?.nombre || '',
      idCategoria: categoria?.id || 0,
      categoria: categoria?.nombre || '',
      idUnidad: unidad?.id || 0,
      medida: unidad?.nombre || '',
      estatus: 'Vigente',
      precio: 0,
      costo: 0,
      margen: 0,
      listaPrecio: 'Sin precio vigente',
      precios: [],
      pos: true,
      linea: false,
      estado: true,
      requiereReceta: false,
      usarExistencias: true,
      almacen: 'Sin inventario',
      anaquel: '—',
      inventarios: [],
      stock: 0,
      stockReorden: 0,
      stockCritico: 0,
      stockMaximo: 0,
      ubicacionDefault: '',
      claveSat: '',
      imagen: '',
      imagenes: [],
      ultimoMovimiento: 'Sin movimientos',
      fechaActualizacion: hoy,
      fechaCreacion: hoy,
    };
  }

  private nombreOpcion(opciones: OpcionProducto[], id: number, respaldo: string): string {
    return opciones.find(opcion => opcion.id === Number(id))?.nombre || respaldo;
  }

  private opcionesEmpresa(opciones: OpcionProducto[]): OpcionProducto[] {
    return opciones.filter(opcion => opcion.idEmpresa === Number(this.producto.idEmpresa));
  }

  private asignarPrimeraOpcion(tipo: 'marca' | 'categoria' | 'unidad', opciones: OpcionProducto[]): void {
    const actual = tipo === 'marca'
      ? this.producto.idMarca
      : tipo === 'categoria' ? this.producto.idCategoria : this.producto.idUnidad;
    const opcion = opciones.find(item => item.id === Number(actual)) || opciones[0];
    if (tipo === 'marca') {
      this.producto.idMarca = opcion?.id || 0;
      this.producto.marca = opcion?.nombre || '';
    } else if (tipo === 'categoria') {
      this.producto.idCategoria = opcion?.id || 0;
      this.producto.categoria = opcion?.nombre || '';
    } else {
      this.producto.idUnidad = opcion?.id || 0;
      this.producto.medida = opcion?.nombre || '';
    }
  }

  private prepararInventarioInicial(reemplazar = false): void {
    if (this.producto.inventarios.length && !reemplazar) return;
    const almacen = this.almacenesDisponibles[0];
    const hoy = new Date().toISOString().slice(0, 10);
    this.producto.inventarios = almacen ? [{
      id: 0,
      idAlmacen: almacen.id,
      almacen: almacen.nombre,
      stock: 10,
      stockReorden: 5,
      stockCritico: 2,
      stockMaximo: 50,
      anaquel: '',
      fechaActualizacion: hoy,
    }] : [];
    this.actualizarResumenInventario();
  }

  private validarInventarioInicial(): boolean {
    const inventario = this.inventarioInicial;
    const almacen = inventario && this.almacenesDisponibles.find(
      opcion => opcion.id === Number(inventario.idAlmacen),
    );
    if (!inventario || !almacen) {
      this.error = 'Selecciona un almacén activo de la empresa para el inventario inicial.';
      return false;
    }
    const stock = Number(inventario.stock);
    const critico = Number(inventario.stockCritico);
    const reorden = Number(inventario.stockReorden);
    const maximo = Number(inventario.stockMaximo);
    if (![stock, critico, reorden, maximo].every(Number.isFinite)) {
      this.error = 'El stock y sus umbrales deben ser números válidos.';
      return false;
    }
    if (stock <= 0) {
      this.error = 'El inventario inicial debe ser mayor que cero.';
      return false;
    }
    if (critico < 0 || reorden < critico || maximo < reorden || stock > maximo) {
      this.error = 'Usa umbrales válidos: crítico ≥ 0, reorden ≥ crítico y máximo ≥ reorden y stock.';
      return false;
    }
    const unidad = this.unidadesDisponibles.find(
      opcion => opcion.id === Number(this.producto.idUnidad),
    );
    if (unidad?.permiteDecimales === false
      && [stock, critico, reorden, maximo].some(valor => !Number.isInteger(valor))) {
      this.error = `La unidad ${unidad.nombre} sólo acepta cantidades enteras.`;
      return false;
    }
    Object.assign(inventario, {
      idAlmacen: almacen.id,
      almacen: almacen.nombre,
      stock,
      stockCritico: critico,
      stockReorden: reorden,
      stockMaximo: maximo,
      anaquel: String(inventario.anaquel || '').trim(),
    });
    return true;
  }

  private actualizarResumenInventario(): void {
    const inventarios = this.producto.inventarios;
    const suma = (
      campo: keyof Pick<InventarioProductoCatalogo, 'stock' | 'stockReorden' | 'stockCritico' | 'stockMaximo'>,
    ) => inventarios.reduce((total, inventario) => total + (Number(inventario[campo]) || 0), 0);
    this.producto.stock = suma('stock');
    this.producto.stockReorden = suma('stockReorden');
    this.producto.stockCritico = suma('stockCritico');
    this.producto.stockMaximo = suma('stockMaximo');
    this.producto.almacen = inventarios.length === 1
      ? inventarios[0].almacen
      : inventarios.length ? `${inventarios.length} almacenes` : 'Sin inventario';
    this.producto.anaquel = inventarios.length === 1
      ? inventarios[0].anaquel || '—'
      : '—';
  }
}
