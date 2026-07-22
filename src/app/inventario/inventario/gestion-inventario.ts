import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { DatosDb } from '../../shared/services/datos-db';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';

export interface ProductoInventarioRef {
  id: number;
  sku: string;
  nombre: string;
  unidad: string;
}

export interface AlmacenInventarioRef {
  id: number;
  nombre: string;
}

export interface UsuarioInventarioRef {
  id: number;
  nombre: string;
}

export interface ExistenciaInventario {
  id: string;
  productoId: number;
  almacenId: number;
  sku: string;
  producto: string;
  unidad: string;
  almacen: string;
  lote: string;
  caducidad: string;
  stock: number;
  reorden: number;
  critico: number;
  maximo: number;
  anaquel: string;
  actualizacion: string;
}

export interface MovimientoInventario {
  id: string;
  fecha: string;
  productoId: number;
  almacenId: number;
  sku: string;
  producto: string;
  almacen: string;
  tipo: string;
  cantidad: number;
  existencia: number;
  costoUnitario: number;
  lote: string;
  caducidad: string;
  referencia: string;
  observaciones: string;
  usuarioId: number | null;
  usuario: string;
}

export interface AjusteInventario {
  id: string;
  fecha: string;
  productoId: number;
  almacenId: number;
  sku: string;
  producto: string;
  almacen: string;
  ajuste: number;
  existencia: number;
  motivo: string;
  usuarioId: number | null;
  usuario: string;
}

export interface AjusteFormulario {
  fecha: string;
  productoId: number;
  almacenId: number;
  ajuste: number;
  motivo: string;
  usuarioId: number | null;
}

export interface TransferenciaInventario {
  id: number;
  folio: string;
  fecha: string;
  productoId: number;
  sku: string;
  producto: string;
  origenId: number;
  origen: string;
  destinoId: number;
  destino: string;
  cantidad: number;
  usuarioId: number | null;
  usuario: string;
  estado: string;
  observaciones: string;
  stockOrigenAnterior?: number;
  stockDestinoAnterior?: number;
}

export interface TransferenciaFormulario {
  fecha: string;
  productoId: number;
  origenId: number;
  destinoId: number;
  cantidad: number;
  usuarioId: number | null;
  estado: string;
  observaciones: string;
}

export interface ContextoInventario {
  productos: ProductoInventarioRef[];
  almacenes: AlmacenInventarioRef[];
  usuarios: UsuarioInventarioRef[];
  estadosTransferencia: string[];
  existencias: ExistenciaInventario[];
  movimientos: MovimientoInventario[];
  ajustes: AjusteInventario[];
  transferencias: TransferenciaInventario[];
}

interface ProductoDb {
  id_producto: string;
  sku: string;
  nombre_producto: string;
  id_unidad: string;
}

interface UnidadDb {
  id_unidad: string;
  nombre: string;
  abreviatura: string;
}

interface AlmacenDb {
  id_almacen: string;
  nombre_almacen: string;
  activo: string;
}

interface UsuarioDb {
  id_usuario: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre?: string;
  usuario?: string;
  email?: string;
  activo: string;
}

interface InventarioDb {
  id_inventario: string;
  id_producto: string;
  id_almacen: string;
  lote: string;
  fecha_caducidad: string;
  stock: string;
  stock_reorden: string;
  stock_critico: string;
  stock_maximo: string;
  anaquel: string;
  fecha_actualizacion: string;
}

interface KardexDb {
  id_movimiento: string;
  id_producto: string;
  id_almacen: string;
  id_tipo_movimiento: string;
  lote: string;
  fecha_caducidad: string;
  existencia: string;
  cantidad: string;
  costo_unitario: string;
  observaciones: string;
  referencia: string;
  fecha: string;
  id_usuario: string;
}

interface EstadoTransferenciaDb {
  id_estado_transferencia: string;
  nombre: string;
}

interface TransferenciaDb {
  id_transferencia: string;
  folio: string;
  id_almacen_origen: string;
  id_almacen_destino: string;
  fecha_solicitud: string;
  fecha_autorizacion: string;
  fecha_recepcion: string;
  id_estado_transferencia: string;
  observaciones: string;
  id_usuario_solicita: string;
}

interface DetalleTransferenciaDb {
  id_transferencia: string;
  id_producto: string;
  cantidad_solicitada: string;
  cantidad_enviada: string;
  cantidad_recibida: string;
}

@Injectable({ providedIn: 'root' })
export class GestionInventario {
  private readonly claveAjustes = 'inventario-ajustes-v1';
  private readonly claveTransferencias = 'inventario-transferencias-v1';
  private readonly claveTransferenciasEliminadas = 'inventario-transferencias-eliminadas-v1';

  constructor(
    private db: DatosDb,
    private persistencia: PersistenciaLocal,
  ) {}

  cargar(): Observable<ContextoInventario> {
    return forkJoin({
      productos: this.db.leer<ProductoDb>('productos.txt'),
      unidades: this.db.leer<UnidadDb>('unidades.txt'),
      almacenes: this.db.leer<AlmacenDb>('almacenes.txt'),
      usuarios: this.db.leer<UsuarioDb>('usuarios.txt'),
      inventario: this.db.leer<InventarioDb>('inventario.txt'),
      kardex: this.db.leer<KardexDb>('kardex_inventario.txt'),
      estados: this.db.leer<EstadoTransferenciaDb>('estados_transferencia.txt'),
      transferencias: this.db.leer<TransferenciaDb>('transferencias.txt'),
      detallesTransferencia: this.db.leer<DetalleTransferenciaDb>('detalle_transferencia.txt'),
    }).pipe(map((datos) => this.relacionar(datos)));
  }

  crearAjuste(formulario: AjusteFormulario, contexto: ContextoInventario): AjusteInventario {
    const producto = contexto.productos.find((item) => item.id === Number(formulario.productoId));
    const almacen = contexto.almacenes.find((item) => item.id === Number(formulario.almacenId));
    const usuario = contexto.usuarios.find((item) => item.id === Number(formulario.usuarioId));
    const existencia = contexto.existencias.find(
      (item) => item.productoId === Number(formulario.productoId) && item.almacenId === Number(formulario.almacenId),
    );
    const anterior = existencia?.stock ?? 0;
    const cantidad = Number(formulario.ajuste) || 0;
    if (!producto || !almacen) throw new Error('El producto o el almacén seleccionado no existe.');
    if (!cantidad) throw new Error('La cantidad del ajuste debe ser diferente de cero.');
    if (anterior + cantidad < 0) {
      throw new Error(`El ajuste dejaría una existencia negativa. Stock actual: ${anterior}.`);
    }
    const ajuste: AjusteInventario = {
      id: `AJ-${Date.now()}`,
      fecha: formulario.fecha,
      productoId: Number(formulario.productoId),
      almacenId: Number(formulario.almacenId),
      sku: producto?.sku || '—',
      producto: producto?.nombre || `Producto #${formulario.productoId}`,
      almacen: almacen?.nombre || `Almacén #${formulario.almacenId}`,
      ajuste: cantidad,
      existencia: anterior + cantidad,
      motivo: formulario.motivo.trim(),
      usuarioId: formulario.usuarioId == null ? null : Number(formulario.usuarioId),
      usuario: usuario?.nombre || 'Sin usuario',
    };
    const actuales = this.persistencia.leer<AjusteInventario[]>(this.claveAjustes, []);
    this.persistencia.guardar(this.claveAjustes, [ajuste, ...actuales]);
    return ajuste;
  }

  guardarTransferencia(
    formulario: TransferenciaFormulario,
    contexto: ContextoInventario,
    transferencia?: TransferenciaInventario,
  ): TransferenciaInventario {
    const producto = contexto.productos.find((item) => item.id === Number(formulario.productoId));
    const origen = contexto.almacenes.find((item) => item.id === Number(formulario.origenId));
    const destino = contexto.almacenes.find((item) => item.id === Number(formulario.destinoId));
    const usuario = contexto.usuarios.find((item) => item.id === Number(formulario.usuarioId));
    const cantidad = Number(formulario.cantidad) || 0;
    if (!producto || !origen || !destino) throw new Error('El producto o alguno de los almacenes no existe.');
    if (origen.id === destino.id) throw new Error('El almacén de origen y destino deben ser diferentes.');
    if (cantidad <= 0) throw new Error('La cantidad a transferir debe ser mayor que cero.');
    const disponible = this.stockDisponible(
      contexto,
      Number(formulario.productoId),
      Number(formulario.origenId),
      transferencia?.id,
    );
    if (cantidad > disponible) {
      throw new Error(`Stock insuficiente en ${origen.nombre}. Disponible: ${disponible} ${producto.unidad}.`);
    }
    const actuales = this.persistencia.leer<TransferenciaInventario[]>(this.claveTransferencias, []);
    const id = transferencia?.id ?? Math.max(0, ...contexto.transferencias.map((item) => Number(item.id) || 0)) + 1;
    const resultado: TransferenciaInventario = {
      id,
      folio: transferencia?.folio || this.siguienteFolio(contexto.transferencias),
      fecha: formulario.fecha,
      productoId: Number(formulario.productoId),
      sku: producto?.sku || '—',
      producto: producto?.nombre || `Producto #${formulario.productoId}`,
      origenId: Number(formulario.origenId),
      origen: origen?.nombre || `Almacén #${formulario.origenId}`,
      destinoId: Number(formulario.destinoId),
      destino: destino?.nombre || `Almacén #${formulario.destinoId}`,
      cantidad,
      usuarioId: formulario.usuarioId == null ? null : Number(formulario.usuarioId),
      usuario: usuario?.nombre || 'Sin usuario',
      estado: transferencia?.estado || formulario.estado || 'Pendiente',
      observaciones: formulario.observaciones.trim(),
      stockOrigenAnterior: transferencia?.stockOrigenAnterior,
      stockDestinoAnterior: transferencia?.stockDestinoAnterior,
    };
    const existeLocal = transferencia && actuales.some((item) => item.id === transferencia.id);
    const lista = transferencia && existeLocal
      ? actuales.map((item) => item.id === transferencia.id ? resultado : item)
      : [resultado, ...actuales];
    this.persistencia.guardar(this.claveTransferencias, lista);
    return resultado;
  }

  cambiarEstadoTransferencia(
    transferencia: TransferenciaInventario,
    estado: string,
    contexto: ContextoInventario,
  ): void {
    const actuales = this.persistencia.leer<TransferenciaInventario[]>(this.claveTransferencias, []);
    const origen = contexto.existencias.find(
      (item) => item.productoId === transferencia.productoId && item.almacenId === transferencia.origenId,
    );
    const destino = contexto.existencias.find(
      (item) => item.productoId === transferencia.productoId && item.almacenId === transferencia.destinoId,
    );
    if (estado === 'Recibida') {
      if (!origen || origen.stock < transferencia.cantidad) {
        throw new Error(`Stock insuficiente en ${transferencia.origen}. Disponible: ${origen?.stock ?? 0}.`);
      }
      if (transferencia.origenId === transferencia.destinoId) {
        throw new Error('El almacén de origen y destino deben ser diferentes.');
      }
    }
    const actualizada: TransferenciaInventario = {
      ...transferencia,
      estado,
      stockOrigenAnterior: estado === 'Recibida' ? (origen?.stock ?? 0) : transferencia.stockOrigenAnterior,
      stockDestinoAnterior: estado === 'Recibida' ? (destino?.stock ?? 0) : transferencia.stockDestinoAnterior,
    };
    const existeLocal = actuales.some((item) => item.id === transferencia.id);
    this.persistencia.guardar(this.claveTransferencias, existeLocal
      ? actuales.map((item) => item.id === transferencia.id ? actualizada : item)
      : [actualizada, ...actuales]);
  }

  eliminarTransferencia(id: number): void {
    const actuales = this.persistencia.leer<TransferenciaInventario[]>(this.claveTransferencias, []);
    this.persistencia.guardar(this.claveTransferencias, actuales.filter((item) => item.id !== id));
    const eliminadas = this.persistencia.leer<number[]>(this.claveTransferenciasEliminadas, []);
    this.persistencia.guardar(this.claveTransferenciasEliminadas, [...new Set([...eliminadas, id])]);
  }

  stockDisponible(
    contexto: ContextoInventario,
    productoId: number,
    almacenId: number,
    transferenciaExcluirId?: number,
  ): number {
    const stock = contexto.existencias.find(
      (item) => item.productoId === productoId && item.almacenId === almacenId,
    )?.stock ?? 0;
    const reservado = contexto.transferencias
      .filter((item) => item.id !== transferenciaExcluirId
        && item.productoId === productoId
        && item.origenId === almacenId
        && !this.esEstadoFinalTransferencia(item.estado))
      .reduce((total, item) => total + item.cantidad, 0);
    return Math.max(0, stock - reservado);
  }

  private relacionar(datos: {
    productos: ProductoDb[];
    unidades: UnidadDb[];
    almacenes: AlmacenDb[];
    usuarios: UsuarioDb[];
    inventario: InventarioDb[];
    kardex: KardexDb[];
    estados: EstadoTransferenciaDb[];
    transferencias: TransferenciaDb[];
    detallesTransferencia: DetalleTransferenciaDb[];
  }): ContextoInventario {
    const nombresUnidad = new Map(datos.unidades.map((item) => [item.id_unidad, item.abreviatura || item.nombre]));
    const productos: ProductoInventarioRef[] = datos.productos.map((item) => ({
      id: Number(item.id_producto),
      sku: item.sku || '—',
      nombre: item.nombre_producto || `Producto #${item.id_producto}`,
      unidad: nombresUnidad.get(item.id_unidad) || 'unidad',
    }));
    const almacenes: AlmacenInventarioRef[] = datos.almacenes
      .filter((item) => item.activo !== '0')
      .map((item) => ({ id: Number(item.id_almacen), nombre: item.nombre_almacen || `Almacén #${item.id_almacen}` }));
    const usuarios: UsuarioInventarioRef[] = datos.usuarios
      .filter((item) => item.activo !== '0')
      .map((item) => ({ id: Number(item.id_usuario), nombre: this.nombreUsuario(item) }));
    const porProducto = new Map(productos.map((item) => [item.id, item]));
    const porAlmacen = new Map(almacenes.map((item) => [item.id, item]));
    const porUsuario = new Map(usuarios.map((item) => [item.id, item]));

    const ajustesLocales = this.persistencia.leer<AjusteInventario[]>(this.claveAjustes, [])
      .map((item) => this.actualizarRelacionAjuste(item, porProducto, porAlmacen, porUsuario));
    const transferenciasLocales = this.persistencia.leer<TransferenciaInventario[]>(this.claveTransferencias, [])
      .map((item) => this.actualizarRelacionTransferencia(item, porProducto, porAlmacen, porUsuario));
    const transferenciasEliminadas = new Set(this.persistencia.leer<number[]>(this.claveTransferenciasEliminadas, []));
    const estadosPorId = new Map(datos.estados.map((item) => [item.id_estado_transferencia, item.nombre]));
    const transferenciasBase = this.mapearTransferenciasDb(
      datos.transferencias,
      datos.detallesTransferencia,
      porProducto,
      porAlmacen,
      porUsuario,
      estadosPorId,
    );
    const localesPorId = new Map(transferenciasLocales.map((item) => [item.id, item]));
    const transferencias = [
      ...transferenciasLocales,
      ...transferenciasBase.filter((item) => !localesPorId.has(item.id) && !transferenciasEliminadas.has(item.id)),
    ];

    const existencias = this.construirExistencias(datos.inventario, ajustesLocales, transferenciasLocales, porProducto, porAlmacen);
    const movimientosBase = datos.kardex.map((item) => this.mapearMovimiento(item, porProducto, porAlmacen, porUsuario));
    const ajustesBase = movimientosBase
      .filter((item) => item.tipo === 'Ajuste')
      .map((item): AjusteInventario => ({
        id: `AJ-MOV-${item.id}`,
        fecha: item.fecha,
        productoId: item.productoId,
        almacenId: item.almacenId,
        sku: item.sku,
        producto: item.producto,
        almacen: item.almacen,
        ajuste: item.cantidad,
        existencia: item.existencia,
        motivo: item.observaciones || item.referencia,
        usuarioId: item.usuarioId,
        usuario: item.usuario,
      }));
    const movimientosLocales = [
      ...ajustesLocales.map((item) => this.movimientoDesdeAjuste(item)),
      ...transferenciasLocales.filter((item) => item.estado === 'Recibida').flatMap((item) => this.movimientosDesdeTransferencia(item)),
    ];

    return {
      productos,
      almacenes,
      usuarios,
      estadosTransferencia: datos.estados.map((item) => item.nombre).filter(Boolean),
      existencias: existencias.sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id)),
      movimientos: [...movimientosLocales, ...movimientosBase].sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id)),
      ajustes: [...ajustesLocales, ...ajustesBase].sort((a, b) => this.numeroId(a.id) - this.numeroId(b.id)),
      transferencias: transferencias.sort((a, b) => a.id - b.id),
    };
  }

  private construirExistencias(
    inventario: InventarioDb[],
    ajustes: AjusteInventario[],
    transferencias: TransferenciaInventario[],
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
  ): ExistenciaInventario[] {
    const registros = new Map<string, ExistenciaInventario>();
    for (const item of inventario) {
      const productoId = Number(item.id_producto);
      const almacenId = Number(item.id_almacen);
      const producto = productos.get(productoId);
      registros.set(this.claveExistencia(productoId, almacenId), {
        id: item.id_inventario || `${productoId}-${almacenId}`,
        productoId,
        almacenId,
        sku: producto?.sku || '—',
        producto: producto?.nombre || `Producto #${productoId} (no registrado)`,
        unidad: producto?.unidad || 'unidad',
        almacen: almacenes.get(almacenId)?.nombre || `Almacén #${almacenId} (no registrado)`,
        lote: item.lote || '—',
        caducidad: item.fecha_caducidad || '—',
        stock: this.numero(item.stock),
        reorden: this.numero(item.stock_reorden),
        critico: this.numero(item.stock_critico),
        maximo: this.numero(item.stock_maximo),
        anaquel: item.anaquel || '—',
        actualizacion: item.fecha_actualizacion || '—',
      });
    }
    const obtener = (productoId: number, almacenId: number) => {
      const clave = this.claveExistencia(productoId, almacenId);
      let registro = registros.get(clave);
      if (!registro) {
        const producto = productos.get(productoId);
        registro = {
          id: clave,
          productoId,
          almacenId,
          sku: producto?.sku || '—',
          producto: producto?.nombre || `Producto #${productoId} (no registrado)`,
          unidad: producto?.unidad || 'unidad',
          almacen: almacenes.get(almacenId)?.nombre || `Almacén #${almacenId} (no registrado)`,
          lote: '—',
          caducidad: '—',
          stock: 0,
          reorden: 0,
          critico: 0,
          maximo: 0,
          anaquel: '—',
          actualizacion: '—',
        };
        registros.set(clave, registro);
      }
      return registro;
    };
    for (const ajuste of ajustes) {
      const registro = obtener(ajuste.productoId, ajuste.almacenId);
      registro.stock += ajuste.ajuste;
      registro.actualizacion = ajuste.fecha;
    }
    for (const transferencia of transferencias.filter((item) => item.estado === 'Recibida')) {
      const origen = obtener(transferencia.productoId, transferencia.origenId);
      const destino = obtener(transferencia.productoId, transferencia.destinoId);
      origen.stock -= transferencia.cantidad;
      destino.stock += transferencia.cantidad;
      origen.actualizacion = transferencia.fecha;
      destino.actualizacion = transferencia.fecha;
    }
    return [...registros.values()];
  }

  private mapearMovimiento(
    item: KardexDb,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
  ): MovimientoInventario {
    const productoId = Number(item.id_producto);
    const almacenId = Number(item.id_almacen);
    const usuarioId = item.id_usuario ? Number(item.id_usuario) : null;
    const producto = productos.get(productoId);
    const cantidad = this.numero(item.cantidad);
    return {
      id: item.id_movimiento,
      fecha: item.fecha || '—',
      productoId,
      almacenId,
      sku: producto?.sku || '—',
      producto: producto?.nombre || `Producto #${productoId} (no registrado)`,
      almacen: almacenes.get(almacenId)?.nombre || `Almacén #${almacenId} (no registrado)`,
      tipo: this.tipoMovimiento(item.id_tipo_movimiento, cantidad),
      cantidad,
      existencia: this.numero(item.existencia),
      costoUnitario: this.numero(item.costo_unitario),
      lote: item.lote || '—',
      caducidad: item.fecha_caducidad || '—',
      referencia: item.referencia || '—',
      observaciones: item.observaciones || '—',
      usuarioId,
      usuario: usuarioId ? usuarios.get(usuarioId)?.nombre || `Usuario #${usuarioId}` : '—',
    };
  }

  private movimientoDesdeAjuste(item: AjusteInventario): MovimientoInventario {
    return {
      id: item.id,
      fecha: item.fecha,
      productoId: item.productoId,
      almacenId: item.almacenId,
      sku: item.sku,
      producto: item.producto,
      almacen: item.almacen,
      tipo: 'Ajuste',
      cantidad: item.ajuste,
      existencia: item.existencia,
      costoUnitario: 0,
      lote: '—',
      caducidad: '—',
      referencia: item.id,
      observaciones: item.motivo,
      usuarioId: item.usuarioId,
      usuario: item.usuario,
    };
  }

  private movimientosDesdeTransferencia(item: TransferenciaInventario): MovimientoInventario[] {
    const anteriorOrigen = item.stockOrigenAnterior ?? 0;
    const anteriorDestino = item.stockDestinoAnterior ?? 0;
    const comun = {
      fecha: item.fecha,
      productoId: item.productoId,
      sku: item.sku,
      producto: item.producto,
      tipo: 'Transferencia',
      costoUnitario: 0,
      lote: '—',
      caducidad: '—',
      referencia: item.folio,
      observaciones: item.observaciones || 'Transferencia entre almacenes',
      usuarioId: item.usuarioId,
      usuario: item.usuario,
    };
    return [
      {
        ...comun,
        id: `${item.folio}-S`,
        almacenId: item.origenId,
        almacen: item.origen,
        cantidad: -item.cantidad,
        existencia: anteriorOrigen - item.cantidad,
      },
      {
        ...comun,
        id: `${item.folio}-E`,
        almacenId: item.destinoId,
        almacen: item.destino,
        cantidad: item.cantidad,
        existencia: anteriorDestino + item.cantidad,
      },
    ];
  }

  private actualizarRelacionAjuste(
    item: AjusteInventario,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
  ): AjusteInventario {
    const legado = item as AjusteInventario & { nueva?: number };
    return {
      ...item,
      productoId: Number(item.productoId),
      almacenId: Number(item.almacenId),
      usuarioId: item.usuarioId == null ? null : Number(item.usuarioId),
      existencia: this.numero(item.existencia ?? legado.nueva),
      sku: productos.get(Number(item.productoId))?.sku || item.sku || '—',
      producto: productos.get(Number(item.productoId))?.nombre || item.producto || `Producto #${item.productoId}`,
      almacen: almacenes.get(Number(item.almacenId))?.nombre || item.almacen || `Almacén #${item.almacenId}`,
      usuario: item.usuarioId == null ? 'Sin usuario' : usuarios.get(Number(item.usuarioId))?.nombre || item.usuario || `Usuario #${item.usuarioId}`,
    };
  }

  private actualizarRelacionTransferencia(
    item: TransferenciaInventario,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
  ): TransferenciaInventario {
    return {
      ...item,
      id: Number(item.id),
      productoId: Number(item.productoId),
      origenId: Number(item.origenId),
      destinoId: Number(item.destinoId),
      usuarioId: item.usuarioId == null ? null : Number(item.usuarioId),
      cantidad: this.numero(item.cantidad),
      sku: productos.get(Number(item.productoId))?.sku || item.sku || '—',
      producto: productos.get(Number(item.productoId))?.nombre || item.producto || `Producto #${item.productoId}`,
      origen: almacenes.get(Number(item.origenId))?.nombre || item.origen || `Almacén #${item.origenId}`,
      destino: almacenes.get(Number(item.destinoId))?.nombre || item.destino || `Almacén #${item.destinoId}`,
      usuario: item.usuarioId == null ? 'Sin usuario' : usuarios.get(Number(item.usuarioId))?.nombre || item.usuario || `Usuario #${item.usuarioId}`,
    };
  }

  private mapearTransferenciasDb(
    transferencias: TransferenciaDb[],
    detalles: DetalleTransferenciaDb[],
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
    estados: Map<string, string>,
  ): TransferenciaInventario[] {
    const detallesPorTransferencia = new Map<string, DetalleTransferenciaDb[]>();
    for (const detalle of detalles) {
      const lista = detallesPorTransferencia.get(detalle.id_transferencia) ?? [];
      lista.push(detalle);
      detallesPorTransferencia.set(detalle.id_transferencia, lista);
    }

    return transferencias.flatMap((transferencia) => {
      const filas = detallesPorTransferencia.get(transferencia.id_transferencia) ?? [];
      return filas.map((detalle, indice) => {
        const transferenciaId = Number(transferencia.id_transferencia);
        const productoId = Number(detalle.id_producto);
        const origenId = Number(transferencia.id_almacen_origen);
        const destinoId = Number(transferencia.id_almacen_destino);
        const usuarioId = transferencia.id_usuario_solicita ? Number(transferencia.id_usuario_solicita) : null;
        const producto = productos.get(productoId);
        const recibida = this.numero(detalle.cantidad_recibida);
        const enviada = this.numero(detalle.cantidad_enviada);
        const solicitada = this.numero(detalle.cantidad_solicitada);
        return {
          id: indice === 0 ? transferenciaId : transferenciaId * 1000 + indice,
          folio: transferencia.folio || `TR-${String(transferenciaId).padStart(4, '0')}`,
          fecha: transferencia.fecha_recepcion || transferencia.fecha_autorizacion || transferencia.fecha_solicitud || '—',
          productoId,
          sku: producto?.sku || '—',
          producto: producto?.nombre || `Producto #${productoId}`,
          origenId,
          origen: almacenes.get(origenId)?.nombre || `Almacén #${origenId}`,
          destinoId,
          destino: almacenes.get(destinoId)?.nombre || `Almacén #${destinoId}`,
          cantidad: recibida || enviada || solicitada,
          usuarioId,
          usuario: usuarioId ? usuarios.get(usuarioId)?.nombre || `Usuario #${usuarioId}` : 'Sin usuario',
          estado: estados.get(transferencia.id_estado_transferencia) || 'Pendiente',
          observaciones: transferencia.observaciones || '—',
        };
      });
    });
  }

  private tipoMovimiento(id: string, cantidad: number): string {
    const tipos: Record<string, string> = { '1': 'Entrada', '2': 'Salida', '3': 'Ajuste', '4': 'Transferencia' };
    return tipos[id] || (cantidad < 0 ? 'Salida' : 'Entrada');
  }

  private esEstadoFinalTransferencia(estado: string): boolean {
    const normalizado = estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ['recibida', 'cancelada', 'cerrada', 'devuelta'].includes(normalizado);
  }

  private nombreUsuario(item: UsuarioDb): string {
    return [item.nombres || item.nombre, item.apellido_paterno, item.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim() || item.usuario || item.email || `Usuario #${item.id_usuario}`;
  }

  private siguienteFolio(actuales: TransferenciaInventario[]): string {
    const ultimo = Math.max(0, ...actuales.map((item) => Number(item.folio.match(/\d+/)?.[0]) || 0));
    return `TR-${String(ultimo + 1).padStart(4, '0')}`;
  }

  private claveExistencia(productoId: number, almacenId: number): string {
    return `${productoId}-${almacenId}`;
  }

  private numero(valor: string | number | undefined): number {
    return Number(valor) || 0;
  }

  private numeroId(valor: string | number): number {
    const directo = Number(valor);
    if (Number.isFinite(directo)) return directo;
    const numeros = String(valor).match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : Number.MAX_SAFE_INTEGER;
  }
}
