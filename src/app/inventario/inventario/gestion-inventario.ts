import { Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { DatosDb } from '../../shared/services/datos-db';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';
import {
  CatalogoProductos,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../shared/services/catalogo-productos';
import {
  AdministracionDatos,
  EstadoAdministracion,
  UsuarioAdministracion,
} from '../administracion/administracion-datos';

export interface ProductoInventarioRef {
  id: number;
  idEmpresa: number;
  sku: string;
  nombre: string;
  unidad: string;
  permiteDecimales: boolean;
}

export interface AlmacenInventarioRef {
  id: number;
  idEmpresa: number;
  nombre: string;
}

export interface UsuarioInventarioRef {
  id: number;
  idEmpresa: number;
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
  stock: number;
  reorden: number;
  critico: number;
  maximo: number;
  anaquel: string;
  actualizacion: string;
  inicializada: boolean;
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
  costoUnitario: number | null;
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
  usuarioNombre?: string;
}

export interface PartidaTransferenciaInventario {
  productoId: number;
  sku: string;
  producto: string;
  unidad: string;
  permiteDecimales: boolean;
  cantidadSolicitada: number;
  cantidadEnviada: number;
  cantidadRecibida: number;
  stockOrigenAnterior?: number;
  stockDestinoAnterior?: number;
}

export interface PartidaTransferenciaFormulario {
  productoId: number;
  cantidadSolicitada: number;
  cantidadEnviada: number;
  cantidadRecibida: number;
}

export interface TransferenciaInventario {
  id: number;
  folio: string;
  origenId: number;
  origen: string;
  destinoId: number;
  destino: string;
  fechaSolicitud: string;
  fechaAutorizacion: string;
  fechaRecepcion: string;
  solicitanteId: number | null;
  solicitante: string;
  autorizadorId: number | null;
  autorizador: string;
  estado: string;
  observaciones: string;
  partidas: PartidaTransferenciaInventario[];
}

export interface TransferenciaFormulario {
  origenId: number;
  destinoId: number;
  fechaSolicitud: string;
  fechaAutorizacion: string;
  fechaRecepcion: string;
  solicitanteId: number | null;
  autorizadorId: number | null;
  estado: string;
  observaciones: string;
  partidas: PartidaTransferenciaFormulario[];
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

interface UnidadDb {
  id_unidad: string;
  nombre: string;
  abreviatura: string;
  permitir_decimales: string;
}

interface InventarioDb {
  id_inventario: string;
  id_producto: string;
  id_almacen: string;
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
  existencia: string;
  cantidad: string;
  costo_unitario: string;
  observaciones: string;
  referencia: string;
  fecha: string;
  id_usuario: string;
}

interface TipoMovimientoDb {
  id_tipo_movimiento: string;
  nombre: string;
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
  id_usuario_autoriza: string;
}

interface DetalleTransferenciaDb {
  id_transferencia: string;
  id_producto: string;
  cantidad_solicitada: string;
  cantidad_enviada: string;
  cantidad_recibida: string;
}

interface TransferenciaLegada {
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

@Injectable({ providedIn: 'root' })
export class GestionInventario {
  private readonly claveAjustes = 'inventario-ajustes-v1';
  private readonly claveTransferencias = 'inventario-transferencias-v2';
  private readonly claveTransferenciasLegadas = 'inventario-transferencias-v1';
  private readonly claveMigracionTransferencias = 'inventario-transferencias-migradas-v2';
  private readonly claveTransferenciasEliminadas = 'inventario-transferencias-eliminadas-v1';

  constructor(
    private db: DatosDb,
    private persistencia: PersistenciaLocal,
    private catalogo: CatalogoProductos,
    private administracion: AdministracionDatos,
  ) {}

  cargar(): Observable<ContextoInventario> {
    return combineLatest({
      productosCatalogo: this.catalogo.cargar(),
      opcionesCatalogo: this.catalogo.cargarOpciones(),
      administracion: this.administracion.cargar(),
      unidades: this.db.leer<UnidadDb>('unidades.txt'),
      inventario: this.db.leer<InventarioDb>('inventario.txt'),
      kardex: this.db.leer<KardexDb>('kardex_inventario.txt'),
      tiposMovimiento: this.db.leer<TipoMovimientoDb>('tipos_movimiento.txt'),
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
      (item) => item.productoId === Number(formulario.productoId)
        && item.almacenId === Number(formulario.almacenId),
    );
    const anterior = existencia?.stock ?? 0;
    const cantidadCapturada = Number(formulario.ajuste);
    const nombreResponsable = usuario?.nombre || formulario.usuarioNombre?.trim() || '';
    if (!producto || !almacen) throw new Error('El producto o el almacén seleccionado no existe.');
    if (producto.idEmpresa !== almacen.idEmpresa) {
      throw new Error('El producto y el almacén deben pertenecer a la misma empresa.');
    }
    if (usuario && usuario.idEmpresa !== producto.idEmpresa) {
      throw new Error('El responsable debe pertenecer a la misma empresa del ajuste.');
    }
    if (!nombreResponsable) {
      throw new Error('No fue posible identificar al usuario responsable del ajuste.');
    }
    if (!producto.permiteDecimales && !Number.isInteger(cantidadCapturada)) {
      throw new Error(`La unidad ${producto.unidad} de "${producto.nombre}" sólo acepta cantidades enteras.`);
    }
    const cantidad = this.ajustarCantidad(cantidadCapturada, producto.permiteDecimales);
    if (!cantidad) throw new Error('La cantidad del ajuste debe ser diferente de cero.');
    if (anterior + cantidad < 0) {
      throw new Error(`El ajuste dejaría una existencia negativa. Stock actual: ${anterior}.`);
    }
    const ajuste: AjusteInventario = {
      id: `AJ-${Date.now()}`,
      fecha: this.soloFecha(formulario.fecha),
      productoId: producto.id,
      almacenId: almacen.id,
      sku: producto.sku || '—',
      producto: producto.nombre,
      almacen: almacen.nombre,
      ajuste: cantidad,
      existencia: anterior + cantidad,
      motivo: formulario.motivo.trim(),
      usuarioId: formulario.usuarioId == null ? null : Number(formulario.usuarioId),
      usuario: nombreResponsable,
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
    const origen = contexto.almacenes.find((item) => item.id === Number(formulario.origenId));
    const destino = contexto.almacenes.find((item) => item.id === Number(formulario.destinoId));
    const solicitante = contexto.usuarios.find((item) => item.id === Number(formulario.solicitanteId));
    const autorizador = contexto.usuarios.find((item) => item.id === Number(formulario.autorizadorId));
    if (!origen || !destino) throw new Error('Alguno de los almacenes seleccionados no existe.');
    if (origen.id === destino.id) throw new Error('El almacén de origen y destino deben ser diferentes.');
    if (origen.idEmpresa !== destino.idEmpresa) {
      throw new Error('Los almacenes de una transferencia deben pertenecer a la misma empresa.');
    }
    if (formulario.solicitanteId == null || !solicitante) {
      throw new Error('Selecciona un solicitante válido.');
    }
    if (solicitante.idEmpresa !== origen.idEmpresa) {
      throw new Error('El solicitante debe pertenecer a la empresa de los almacenes.');
    }
    if (!formulario.partidas.length) throw new Error('Agrega al menos un producto a la transferencia.');
    const fechaSolicitud = this.soloFecha(formulario.fechaSolicitud);
    const fechaAutorizacion = this.soloFecha(formulario.fechaAutorizacion);
    const fechaRecepcion = this.soloFecha(formulario.fechaRecepcion);
    if (!fechaSolicitud) throw new Error('La fecha de solicitud es obligatoria.');
    if ((fechaAutorizacion && formulario.autorizadorId == null)
      || (!fechaAutorizacion && formulario.autorizadorId != null)) {
      throw new Error('La fecha y el autorizador deben capturarse juntos.');
    }
    if (formulario.autorizadorId != null && !autorizador) {
      throw new Error('Selecciona un autorizador válido.');
    }
    if (autorizador && autorizador.idEmpresa !== origen.idEmpresa) {
      throw new Error('El autorizador debe pertenecer a la empresa de los almacenes.');
    }
    if (fechaAutorizacion && fechaAutorizacion < fechaSolicitud) {
      throw new Error('La autorización no puede ser anterior a la solicitud.');
    }
    if (fechaRecepcion && fechaRecepcion < (fechaAutorizacion || fechaSolicitud)) {
      throw new Error('La recepción no puede ser anterior a la solicitud o autorización.');
    }

    const idsProductos = new Set<number>();
    const partidas = formulario.partidas.map((partida): PartidaTransferenciaInventario => {
      const producto = contexto.productos.find((item) => item.id === Number(partida.productoId));
      if (!producto) throw new Error(`El producto #${partida.productoId} no existe.`);
      if (producto.idEmpresa !== origen.idEmpresa) {
        throw new Error(`El producto "${producto.nombre}" no pertenece a la empresa de los almacenes.`);
      }
      if (idsProductos.has(producto.id)) throw new Error(`El producto "${producto.nombre}" está repetido.`);
      idsProductos.add(producto.id);

      const cantidadesCapturadas = [
        Number(partida.cantidadSolicitada),
        Number(partida.cantidadEnviada),
        Number(partida.cantidadRecibida),
      ];
      if (!producto.permiteDecimales && cantidadesCapturadas.some((cantidad) => !Number.isInteger(cantidad))) {
        throw new Error(`La unidad ${producto.unidad} de "${producto.nombre}" sólo acepta cantidades enteras.`);
      }
      const solicitada = this.ajustarCantidad(partida.cantidadSolicitada, producto.permiteDecimales);
      const enviada = this.ajustarCantidad(partida.cantidadEnviada, producto.permiteDecimales);
      const recibida = this.ajustarCantidad(partida.cantidadRecibida, producto.permiteDecimales);
      if (solicitada <= 0) throw new Error(`La cantidad solicitada de "${producto.nombre}" debe ser mayor que cero.`);
      if (enviada < 0 || enviada > solicitada) {
        throw new Error(`La cantidad enviada de "${producto.nombre}" debe estar entre 0 y ${solicitada}.`);
      }
      if (recibida < 0 || recibida > enviada) {
        throw new Error(`La cantidad recibida de "${producto.nombre}" no puede superar la enviada.`);
      }

      const disponible = this.stockDisponible(contexto, producto.id, origen.id, transferencia?.id);
      const comprometida = enviada > 0 ? enviada : solicitada;
      if (comprometida > disponible) {
        throw new Error(`Stock insuficiente de "${producto.nombre}" en ${origen.nombre}. Disponible: ${disponible} ${producto.unidad}.`);
      }
      const anterior = transferencia?.partidas.find((item) => item.productoId === producto.id);
      return {
        productoId: producto.id,
        sku: producto.sku || '—',
        producto: producto.nombre,
        unidad: producto.unidad,
        permiteDecimales: producto.permiteDecimales,
        cantidadSolicitada: solicitada,
        cantidadEnviada: enviada,
        cantidadRecibida: recibida,
        stockOrigenAnterior: anterior?.stockOrigenAnterior,
        stockDestinoAnterior: anterior?.stockDestinoAnterior,
      };
    });

    const actuales = this.leerTransferenciasLocales();
    const id = transferencia?.id ?? this.siguienteId(contexto.transferencias, actuales);
    const resultado: TransferenciaInventario = {
      id,
      folio: transferencia?.folio || this.siguienteFolio([...contexto.transferencias, ...actuales]),
      origenId: origen.id,
      origen: origen.nombre,
      destinoId: destino.id,
      destino: destino.nombre,
      fechaSolicitud,
      fechaAutorizacion,
      fechaRecepcion,
      solicitanteId: formulario.solicitanteId == null ? null : Number(formulario.solicitanteId),
      solicitante: solicitante?.nombre || 'Sin usuario',
      autorizadorId: formulario.autorizadorId == null ? null : Number(formulario.autorizadorId),
      autorizador: autorizador?.nombre || 'Sin autorizar',
      estado: transferencia?.estado || formulario.estado || 'Pendiente',
      observaciones: formulario.observaciones.trim(),
      partidas,
    };
    const existeLocal = actuales.some((item) => item.id === resultado.id);
    this.guardarTransferenciasLocales(
      existeLocal
        ? actuales.map((item) => item.id === resultado.id ? resultado : item)
        : [resultado, ...actuales],
    );
    return resultado;
  }

  cambiarEstadoTransferencia(
    transferencia: TransferenciaInventario,
    estado: string,
    contexto: ContextoInventario,
  ): void {
    const normalizado = this.normalizar(estado);
    let partidas = transferencia.partidas.map((item) => ({ ...item }));
    let fechaAutorizacion = transferencia.fechaAutorizacion;
    let fechaRecepcion = transferencia.fechaRecepcion;
    let autorizadorId = transferencia.autorizadorId;
    let autorizador = transferencia.autorizador;

    if (normalizado === 'recibida') {
      if (transferencia.origenId === transferencia.destinoId) {
        throw new Error('El almacén de origen y destino deben ser diferentes.');
      }
      partidas = partidas.map((partida) => {
        const cantidad = partida.cantidadEnviada > 0 ? partida.cantidadEnviada : partida.cantidadSolicitada;
        const origen = contexto.existencias.find(
          (item) => item.productoId === partida.productoId && item.almacenId === transferencia.origenId,
        );
        const destino = contexto.existencias.find(
          (item) => item.productoId === partida.productoId && item.almacenId === transferencia.destinoId,
        );
        if ((origen?.stock ?? 0) < cantidad) {
          throw new Error(`Stock insuficiente de "${partida.producto}" en ${transferencia.origen}. Disponible: ${origen?.stock ?? 0} ${partida.unidad}.`);
        }
        return {
          ...partida,
          cantidadEnviada: cantidad,
          cantidadRecibida: cantidad,
          stockOrigenAnterior: origen?.stock ?? 0,
          stockDestinoAnterior: destino?.stock ?? 0,
        };
      });
      const hoy = this.fechaLocal();
      if (transferencia.fechaSolicitud > hoy) {
        throw new Error('No se puede recibir una transferencia antes de su fecha de solicitud.');
      }
      fechaAutorizacion = fechaAutorizacion || hoy;
      fechaRecepcion = hoy;
      autorizadorId ??= transferencia.solicitanteId;
      autorizador = autorizadorId == null
        ? 'Sin autorizar'
        : contexto.usuarios.find((item) => item.id === autorizadorId)?.nombre || transferencia.solicitante;
    }

    const actualizada: TransferenciaInventario = {
      ...transferencia,
      estado,
      fechaAutorizacion,
      fechaRecepcion,
      autorizadorId,
      autorizador,
      partidas,
    };
    const actuales = this.leerTransferenciasLocales();
    const existeLocal = actuales.some((item) => item.id === transferencia.id);
    this.guardarTransferenciasLocales(
      existeLocal
        ? actuales.map((item) => item.id === transferencia.id ? actualizada : item)
        : [actualizada, ...actuales],
    );
  }

  eliminarTransferencia(id: number): void {
    const actuales = this.leerTransferenciasLocales();
    this.guardarTransferenciasLocales(actuales.filter((item) => item.id !== id));
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
        && item.origenId === almacenId
        && this.comprometeStockTransferencia(item.estado))
      .flatMap((item) => item.partidas)
      .filter((item) => item.productoId === productoId)
      .reduce((total, item) => total + this.cantidadComprometida(item), 0);
    return Math.max(0, stock - reservado);
  }

  cantidadComprometida(partida: PartidaTransferenciaInventario): number {
    const comprometida = partida.cantidadEnviada > 0
      ? partida.cantidadEnviada
      : partida.cantidadSolicitada;
    return Math.max(0, comprometida - partida.cantidadRecibida);
  }

  esEstadoFinalTransferencia(estado: string): boolean {
    return ['recibida', 'cancelada', 'cerrada', 'devuelta'].includes(this.normalizar(estado));
  }

  comprometeStockTransferencia(estado: string): boolean {
    return comprometeStockTransferencia(estado);
  }

  private relacionar(datos: {
    productosCatalogo: ProductoCatalogo[];
    opcionesCatalogo: OpcionesProducto;
    administracion: EstadoAdministracion;
    unidades: UnidadDb[];
    inventario: InventarioDb[];
    kardex: KardexDb[];
    tiposMovimiento: TipoMovimientoDb[];
    estados: EstadoTransferenciaDb[];
    transferencias: TransferenciaDb[];
    detallesTransferencia: DetalleTransferenciaDb[];
  }): ContextoInventario {
    const unidadesDb = new Map(datos.unidades.map((item) => [Number(item.id_unidad), item]));
    const unidadesCatalogo = new Map(
      datos.opcionesCatalogo.unidades.map(unidad => [unidad.id, unidad]),
    );
    const empresasActivas = new Set(
      datos.administracion.empresas
        .filter(empresa => empresa.estado)
        .map(empresa => Number(empresa.id)),
    );
    const productosTodos: ProductoInventarioRef[] = datos.productosCatalogo.map((item) => {
      const unidadDb = unidadesDb.get(Number(item.idUnidad));
      const unidadCatalogo = unidadesCatalogo.get(Number(item.idUnidad));
      return {
        id: Number(item.id),
        idEmpresa: Number(item.idEmpresa),
        sku: item.sku || '—',
        nombre: item.producto || `Producto #${item.id}`,
        unidad: unidadDb?.abreviatura || unidadCatalogo?.nombre || item.medida || 'unidad',
        permiteDecimales: unidadCatalogo?.permiteDecimales
          ?? (unidadDb?.permitir_decimales === '1'),
      };
    });
    const productosActivos = new Set(
      datos.productosCatalogo
        .filter(item =>
          item.estado && item.usarExistencias && empresasActivas.has(Number(item.idEmpresa)))
        .map(item => Number(item.id)),
    );
    const productos = productosTodos.filter(producto => productosActivos.has(producto.id));
    const almacenesTodos: AlmacenInventarioRef[] = datos.administracion.almacenes.map(almacen => ({
      id: Number(almacen.id),
      idEmpresa: Number(almacen.empresaId),
      nombre: almacen.nombre || `Almacén #${almacen.id}`,
    }));
    const almacenes: AlmacenInventarioRef[] = datos.administracion.almacenes
      .filter(almacen =>
        almacen.estado && empresasActivas.has(Number(almacen.empresaId)))
      .map(almacen => ({
        id: Number(almacen.id),
        idEmpresa: Number(almacen.empresaId),
        nombre: almacen.nombre || `Almacén #${almacen.id}`,
      }));
    const usuariosTodos: UsuarioInventarioRef[] = datos.administracion.usuarios.map(usuario => ({
      id: Number(usuario.id),
      idEmpresa: Number(usuario.empresaId),
      nombre: this.nombreUsuario(usuario),
    }));
    const usuarios: UsuarioInventarioRef[] = datos.administracion.usuarios
      .filter(usuario =>
        usuario.estado && empresasActivas.has(Number(usuario.empresaId)))
      .map(usuario => ({
        id: Number(usuario.id),
        idEmpresa: Number(usuario.empresaId),
        nombre: this.nombreUsuario(usuario),
      }));
    const porProducto = new Map(productos.map((item) => [item.id, item]));
    const porAlmacen = new Map(almacenes.map((item) => [item.id, item]));
    const porProductoTodos = new Map(productosTodos.map((item) => [item.id, item]));
    const porAlmacenTodos = new Map(almacenesTodos.map((item) => [item.id, item]));
    const porUsuarioTodos = new Map(usuariosTodos.map((item) => [item.id, item]));
    const tiposMovimiento = new Map(
      datos.tiposMovimiento.map((item) => [item.id_tipo_movimiento, item.nombre]),
    );

    const ajustesLocales = this.persistencia.leer<AjusteInventario[]>(this.claveAjustes, [])
      .map((item) => this.actualizarRelacionAjuste(
        item,
        porProductoTodos,
        porAlmacenTodos,
        porUsuarioTodos,
      ));
    const transferenciasLocales = this.leerTransferenciasLocales()
      .map((item) => this.actualizarRelacionTransferencia(
        item,
        porProductoTodos,
        porAlmacenTodos,
        porUsuarioTodos,
      ));
    const transferenciasEliminadas = new Set(this.persistencia.leer<number[]>(this.claveTransferenciasEliminadas, []));
    const estadosPorId = new Map(datos.estados.map((item) => [item.id_estado_transferencia, item.nombre]));
    const transferenciasBase = this.mapearTransferenciasDb(
      datos.transferencias,
      datos.detallesTransferencia,
      porProductoTodos,
      porAlmacenTodos,
      porUsuarioTodos,
      estadosPorId,
    );
    const localesPorId = new Map(transferenciasLocales.map((item) => [item.id, item]));
    const transferencias = [
      ...transferenciasLocales,
      ...transferenciasBase.filter((item) => !localesPorId.has(item.id) && !transferenciasEliminadas.has(item.id)),
    ];

    const inventarioCatalogo = this.inventarioDesdeCatalogo(datos.productosCatalogo);
    const existencias = this.construirExistencias(
      inventarioCatalogo,
      ajustesLocales,
      transferenciasLocales,
      porProducto,
      porAlmacen,
    );
    const movimientosBase = datos.kardex.map((item) =>
      this.mapearMovimiento(
        item,
        porProductoTodos,
        porAlmacenTodos,
        porUsuarioTodos,
        tiposMovimiento,
      ));
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
      ...this.movimientosInventarioInicialLocal(
        inventarioCatalogo,
        datos.inventario,
        porProducto,
        porAlmacen,
      ),
      ...ajustesLocales.map((item) => this.movimientoDesdeAjuste(item)),
      ...transferenciasLocales
        .filter((item) => this.normalizar(item.estado) === 'recibida')
        .flatMap((item) => this.movimientosDesdeTransferencia(item)),
    ];

    return {
      productos,
      almacenes,
      usuarios,
      estadosTransferencia: datos.estados.map((item) => item.nombre).filter(Boolean),
      existencias: existencias.sort((a, b) =>
        a.producto.localeCompare(b.producto) || a.almacen.localeCompare(b.almacen)),
      movimientos: [...movimientosLocales, ...movimientosBase].sort((a, b) =>
        this.fechaMs(a.fecha) - this.fechaMs(b.fecha) || this.numeroId(a.id) - this.numeroId(b.id)),
      ajustes: [...ajustesLocales, ...ajustesBase].sort((a, b) =>
        this.fechaMs(a.fecha) - this.fechaMs(b.fecha) || this.numeroId(a.id) - this.numeroId(b.id)),
      transferencias: transferencias.sort((a, b) =>
        this.fechaMs(a.fechaSolicitud) - this.fechaMs(b.fechaSolicitud) || a.id - b.id),
    };
  }

  private inventarioDesdeCatalogo(productos: ProductoCatalogo[]): InventarioDb[] {
    return productos.flatMap(producto => producto.inventarios.map(inventario => ({
      id_inventario: String(inventario.id),
      id_producto: String(producto.id),
      id_almacen: String(inventario.idAlmacen),
      stock: String(inventario.stock),
      stock_reorden: String(inventario.stockReorden),
      stock_critico: String(inventario.stockCritico),
      stock_maximo: String(inventario.stockMaximo),
      anaquel: inventario.anaquel,
      fecha_actualizacion: inventario.fechaActualizacion,
    })));
  }

  private movimientosInventarioInicialLocal(
    inventarioCatalogo: InventarioDb[],
    inventarioBase: InventarioDb[],
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
  ): MovimientoInventario[] {
    const clavesBase = new Set(inventarioBase.map(item =>
      this.claveExistencia(Number(item.id_producto), Number(item.id_almacen))));
    return inventarioCatalogo
      .filter(item =>
        !clavesBase.has(this.claveExistencia(
          Number(item.id_producto),
          Number(item.id_almacen),
        )))
      .flatMap((item): MovimientoInventario[] => {
        const productoId = Number(item.id_producto);
        const almacenId = Number(item.id_almacen);
        const producto = productos.get(productoId);
        const almacen = almacenes.get(almacenId);
        const stock = this.numero(item.stock);
        if (!producto || !almacen || stock <= 0) return [];
        return [{
          id: `INI-LOCAL-${productoId}-${almacenId}`,
          fecha: this.soloFecha(item.fecha_actualizacion) || this.fechaLocal(),
          productoId,
          almacenId,
          sku: producto.sku,
          producto: producto.nombre,
          almacen: almacen.nombre,
          tipo: 'Inventario inicial',
          cantidad: stock,
          existencia: stock,
          costoUnitario: null,
          referencia: `ALTA-${producto.sku}`,
          observaciones: 'Inventario inicial capturado al crear el producto',
          usuarioId: null,
          usuario: '—',
        }];
      });
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
      const almacen = almacenes.get(almacenId);
      if (!producto || !almacen || producto.idEmpresa !== almacen.idEmpresa) continue;
      const clave = this.claveExistencia(productoId, almacenId);
      const existente = registros.get(clave);
      if (existente) {
        existente.stock += this.numero(item.stock);
        existente.reorden = Math.max(existente.reorden, this.numero(item.stock_reorden));
        existente.critico = Math.max(existente.critico, this.numero(item.stock_critico));
        existente.maximo = Math.max(existente.maximo, this.numero(item.stock_maximo));
        existente.anaquel = this.combinarTexto(existente.anaquel, item.anaquel);
        existente.actualizacion = this.fechaMasReciente(existente.actualizacion, item.fecha_actualizacion);
        continue;
      }
      registros.set(clave, {
        id: item.id_inventario || clave,
        productoId,
        almacenId,
        sku: producto?.sku || '—',
        producto: producto.nombre,
        unidad: producto.unidad,
        almacen: almacen.nombre,
        stock: this.numero(item.stock),
        reorden: this.numero(item.stock_reorden),
        critico: this.numero(item.stock_critico),
        maximo: this.numero(item.stock_maximo),
        anaquel: item.anaquel || '—',
        actualizacion: this.soloFecha(item.fecha_actualizacion) || '—',
        inicializada: true,
      });
    }

    const almacenPredeterminado = [...almacenes.values()][0];
    if (almacenPredeterminado) {
      for (const producto of productos.values()) {
        const tieneExistencia = [...registros.values()].some((item) => item.productoId === producto.id);
        if (!tieneExistencia) {
          const clave = this.claveExistencia(producto.id, almacenPredeterminado.id);
          registros.set(clave, this.nuevaExistencia(producto.id, almacenPredeterminado.id, productos, almacenes, false));
        }
      }
    }

    const obtener = (
      productoId: number,
      almacenId: number,
    ): ExistenciaInventario | undefined => {
      const producto = productos.get(productoId);
      const almacen = almacenes.get(almacenId);
      if (!producto || !almacen || producto.idEmpresa !== almacen.idEmpresa) return undefined;
      const clave = this.claveExistencia(productoId, almacenId);
      const actual = registros.get(clave);
      if (actual) return actual;
      const nuevo = this.nuevaExistencia(productoId, almacenId, productos, almacenes, false);
      registros.set(clave, nuevo);
      return nuevo;
    };

    for (const ajuste of ajustes) {
      const registro = obtener(ajuste.productoId, ajuste.almacenId);
      if (!registro) continue;
      registro.stock += ajuste.ajuste;
      registro.actualizacion = this.fechaMasReciente(registro.actualizacion, ajuste.fecha);
      registro.inicializada = true;
    }
    for (const transferencia of transferencias.filter((item) => this.normalizar(item.estado) === 'recibida')) {
      for (const partida of transferencia.partidas) {
        const cantidad = partida.cantidadRecibida;
        if (cantidad <= 0) continue;
        const origen = obtener(partida.productoId, transferencia.origenId);
        const destino = obtener(partida.productoId, transferencia.destinoId);
        if (origen) {
          origen.stock -= cantidad;
          origen.actualizacion = this.fechaMasReciente(
            origen.actualizacion,
            transferencia.fechaRecepcion,
          );
        }
        if (destino) {
          destino.stock += cantidad;
          destino.actualizacion = this.fechaMasReciente(
            destino.actualizacion,
            transferencia.fechaRecepcion,
          );
          destino.inicializada = true;
        }
      }
    }
    return [...registros.values()];
  }

  private nuevaExistencia(
    productoId: number,
    almacenId: number,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    inicializada: boolean,
  ): ExistenciaInventario {
    const producto = productos.get(productoId);
    return {
      id: `AUTO-${productoId}-${almacenId}`,
      productoId,
      almacenId,
      sku: producto?.sku || '—',
      producto: producto?.nombre || `Producto #${productoId} (no registrado)`,
      unidad: producto?.unidad || 'unidad',
      almacen: almacenes.get(almacenId)?.nombre || `Almacén #${almacenId} (no registrado)`,
      stock: 0,
      reorden: 0,
      critico: 0,
      maximo: 0,
      anaquel: '—',
      actualizacion: '—',
      inicializada,
    };
  }

  private mapearMovimiento(
    item: KardexDb,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
    tipos: Map<string, string>,
  ): MovimientoInventario {
    const productoId = Number(item.id_producto);
    const almacenId = Number(item.id_almacen);
    const usuarioId = item.id_usuario ? Number(item.id_usuario) : null;
    const producto = productos.get(productoId);
    const cantidad = this.numero(item.cantidad);
    return {
      id: item.id_movimiento,
      fecha: this.soloFecha(item.fecha) || '—',
      productoId,
      almacenId,
      sku: producto?.sku || '—',
      producto: producto?.nombre || `Producto #${productoId} (no registrado)`,
      almacen: almacenes.get(almacenId)?.nombre || `Almacén #${almacenId} (no registrado)`,
      tipo: tipos.get(item.id_tipo_movimiento) || (cantidad < 0 ? 'Salida' : 'Entrada'),
      cantidad,
      existencia: this.numero(item.existencia),
      costoUnitario: this.numeroOpcional(item.costo_unitario),
      referencia: item.referencia || '—',
      observaciones: item.observaciones || '—',
      usuarioId,
      usuario: usuarioId ? usuarios.get(usuarioId)?.nombre || `Usuario #${usuarioId}` : '—',
    };
  }

  private movimientoDesdeAjuste(item: AjusteInventario): MovimientoInventario {
    return {
      id: item.id,
      fecha: this.soloFecha(item.fecha),
      productoId: item.productoId,
      almacenId: item.almacenId,
      sku: item.sku,
      producto: item.producto,
      almacen: item.almacen,
      tipo: 'Ajuste',
      cantidad: item.ajuste,
      existencia: item.existencia,
      costoUnitario: null,
      referencia: item.id,
      observaciones: item.motivo,
      usuarioId: item.usuarioId,
      usuario: item.usuario,
    };
  }

  private movimientosDesdeTransferencia(item: TransferenciaInventario): MovimientoInventario[] {
    return item.partidas.flatMap((partida, indice) => {
      const cantidad = partida.cantidadRecibida;
      if (cantidad <= 0) return [];
      const anteriorOrigen = partida.stockOrigenAnterior ?? 0;
      const anteriorDestino = partida.stockDestinoAnterior ?? 0;
      const comun = {
        fecha: this.soloFecha(item.fechaRecepcion || item.fechaSolicitud),
        productoId: partida.productoId,
        sku: partida.sku,
        producto: partida.producto,
        tipo: 'Transferencia',
        costoUnitario: null,
        referencia: item.folio,
        observaciones: item.observaciones || 'Transferencia entre almacenes',
        usuarioId: item.solicitanteId,
        usuario: item.solicitante,
      };
      return [
        {
          ...comun,
          id: `${item.folio}-P${indice + 1}-S`,
          almacenId: item.origenId,
          almacen: item.origen,
          cantidad: -cantidad,
          existencia: anteriorOrigen - cantidad,
        },
        {
          ...comun,
          id: `${item.folio}-P${indice + 1}-E`,
          almacenId: item.destinoId,
          almacen: item.destino,
          cantidad,
          existencia: anteriorDestino + cantidad,
        },
      ];
    });
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
      fecha: this.soloFecha(item.fecha),
      productoId: Number(item.productoId),
      almacenId: Number(item.almacenId),
      usuarioId: item.usuarioId == null ? null : Number(item.usuarioId),
      existencia: this.numero(item.existencia ?? legado.nueva),
      sku: productos.get(Number(item.productoId))?.sku || item.sku || '—',
      producto: productos.get(Number(item.productoId))?.nombre || item.producto || `Producto #${item.productoId}`,
      almacen: almacenes.get(Number(item.almacenId))?.nombre || item.almacen || `Almacén #${item.almacenId}`,
      usuario: item.usuarioId == null
        ? item.usuario?.trim() || 'Sin usuario'
        : usuarios.get(Number(item.usuarioId))?.nombre || item.usuario || `Usuario #${item.usuarioId}`,
    };
  }

  private actualizarRelacionTransferencia(
    item: TransferenciaInventario,
    productos: Map<number, ProductoInventarioRef>,
    almacenes: Map<number, AlmacenInventarioRef>,
    usuarios: Map<number, UsuarioInventarioRef>,
  ): TransferenciaInventario {
    const solicitanteId = item.solicitanteId == null ? null : Number(item.solicitanteId);
    const autorizadorId = item.autorizadorId == null ? null : Number(item.autorizadorId);
    return {
      ...item,
      id: Number(item.id),
      origenId: Number(item.origenId),
      destinoId: Number(item.destinoId),
      fechaSolicitud: this.soloFecha(item.fechaSolicitud),
      fechaAutorizacion: this.soloFecha(item.fechaAutorizacion),
      fechaRecepcion: this.soloFecha(item.fechaRecepcion),
      solicitanteId,
      autorizadorId,
      origen: almacenes.get(Number(item.origenId))?.nombre || item.origen || `Almacén #${item.origenId}`,
      destino: almacenes.get(Number(item.destinoId))?.nombre || item.destino || `Almacén #${item.destinoId}`,
      solicitante: solicitanteId == null
        ? 'Sin usuario'
        : usuarios.get(solicitanteId)?.nombre || item.solicitante || `Usuario #${solicitanteId}`,
      autorizador: autorizadorId == null
        ? 'Sin autorizar'
        : usuarios.get(autorizadorId)?.nombre || item.autorizador || `Usuario #${autorizadorId}`,
      partidas: item.partidas.map((partida) => {
        const producto = productos.get(Number(partida.productoId));
        return {
          ...partida,
          productoId: Number(partida.productoId),
          sku: producto?.sku || partida.sku || '—',
          producto: producto?.nombre || partida.producto || `Producto #${partida.productoId}`,
          unidad: producto?.unidad || partida.unidad || 'unidad',
          permiteDecimales: producto?.permiteDecimales ?? partida.permiteDecimales ?? true,
          cantidadSolicitada: this.numero(partida.cantidadSolicitada),
          cantidadEnviada: this.numero(partida.cantidadEnviada),
          cantidadRecibida: this.numero(partida.cantidadRecibida),
        };
      }),
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

    return transferencias.map((transferencia) => {
      const transferenciaId = Number(transferencia.id_transferencia);
      const origenId = Number(transferencia.id_almacen_origen);
      const destinoId = Number(transferencia.id_almacen_destino);
      const solicitanteId = transferencia.id_usuario_solicita ? Number(transferencia.id_usuario_solicita) : null;
      const autorizadorId = transferencia.id_usuario_autoriza ? Number(transferencia.id_usuario_autoriza) : null;
      const partidas = (detallesPorTransferencia.get(transferencia.id_transferencia) ?? []).map((detalle) => {
        const productoId = Number(detalle.id_producto);
        const producto = productos.get(productoId);
        return {
          productoId,
          sku: producto?.sku || '—',
          producto: producto?.nombre || `Producto #${productoId}`,
          unidad: producto?.unidad || 'unidad',
          permiteDecimales: producto?.permiteDecimales ?? true,
          cantidadSolicitada: this.numero(detalle.cantidad_solicitada),
          cantidadEnviada: this.numero(detalle.cantidad_enviada),
          cantidadRecibida: this.numero(detalle.cantidad_recibida),
        };
      });
      return {
        id: transferenciaId,
        folio: transferencia.folio || `TR-${String(transferenciaId).padStart(4, '0')}`,
        origenId,
        origen: almacenes.get(origenId)?.nombre || `Almacén #${origenId}`,
        destinoId,
        destino: almacenes.get(destinoId)?.nombre || `Almacén #${destinoId}`,
        fechaSolicitud: this.soloFecha(transferencia.fecha_solicitud),
        fechaAutorizacion: this.soloFecha(transferencia.fecha_autorizacion),
        fechaRecepcion: this.soloFecha(transferencia.fecha_recepcion),
        solicitanteId,
        solicitante: solicitanteId ? usuarios.get(solicitanteId)?.nombre || `Usuario #${solicitanteId}` : 'Sin usuario',
        autorizadorId,
        autorizador: autorizadorId ? usuarios.get(autorizadorId)?.nombre || `Usuario #${autorizadorId}` : 'Sin autorizar',
        estado: estados.get(transferencia.id_estado_transferencia) || 'Pendiente',
        observaciones: transferencia.observaciones || '—',
        partidas,
      };
    });
  }

  private leerTransferenciasLocales(): TransferenciaInventario[] {
    const actuales = this.persistencia.leer<TransferenciaInventario[]>(this.claveTransferencias, []);
    const migracionCompletada = this.persistencia.leer<boolean>(
      this.claveMigracionTransferencias,
      false,
    );
    if (actuales.length || migracionCompletada) return actuales;
    const legadas = this.persistencia.leer<TransferenciaLegada[]>(this.claveTransferenciasLegadas, []);
    return this.migrarTransferenciasLegadas(legadas);
  }

  private guardarTransferenciasLocales(transferencias: TransferenciaInventario[]): void {
    this.persistencia.guardar(this.claveTransferencias, transferencias);
    this.persistencia.guardar(this.claveMigracionTransferencias, true);
  }

  private migrarTransferenciasLegadas(legadas: TransferenciaLegada[]): TransferenciaInventario[] {
    const grupos = new Map<string, TransferenciaLegada[]>();
    for (const item of legadas) {
      const clave = item.folio || String(item.id);
      const grupo = grupos.get(clave) ?? [];
      grupo.push(item);
      grupos.set(clave, grupo);
    }
    return [...grupos.values()].map((grupo) => {
      const cabecera = grupo[0];
      const recibida = this.normalizar(cabecera.estado) === 'recibida';
      const partidasPorProducto = new Map<number, PartidaTransferenciaInventario>();
      for (const item of grupo) {
        const cantidad = this.numero(item.cantidad);
        partidasPorProducto.set(Number(item.productoId), {
          productoId: Number(item.productoId),
          sku: item.sku || '—',
          producto: item.producto || `Producto #${item.productoId}`,
          unidad: 'unidad',
          permiteDecimales: true,
          cantidadSolicitada: cantidad,
          cantidadEnviada: recibida ? cantidad : 0,
          cantidadRecibida: recibida ? cantidad : 0,
          stockOrigenAnterior: item.stockOrigenAnterior,
          stockDestinoAnterior: item.stockDestinoAnterior,
        });
      }
      const usuarioId = cabecera.usuarioId == null ? null : Number(cabecera.usuarioId);
      return {
        id: Number(cabecera.id),
        folio: cabecera.folio || `TR-${String(cabecera.id).padStart(4, '0')}`,
        origenId: Number(cabecera.origenId),
        origen: cabecera.origen,
        destinoId: Number(cabecera.destinoId),
        destino: cabecera.destino,
        fechaSolicitud: this.soloFecha(cabecera.fecha),
        fechaAutorizacion: recibida ? this.soloFecha(cabecera.fecha) : '',
        fechaRecepcion: recibida ? this.soloFecha(cabecera.fecha) : '',
        solicitanteId: usuarioId,
        solicitante: cabecera.usuario || 'Sin usuario',
        autorizadorId: recibida ? usuarioId : null,
        autorizador: recibida ? cabecera.usuario || 'Sin usuario' : 'Sin autorizar',
        estado: cabecera.estado || 'Pendiente',
        observaciones: cabecera.observaciones || '',
        partidas: [...partidasPorProducto.values()],
      };
    });
  }

  private nombreUsuario(item: UsuarioAdministracion): string {
    return [item.nombres, item.apellidoPaterno, item.apellidoMaterno]
      .filter(Boolean)
      .join(' ')
      .trim() || item.email || `Usuario #${item.id}`;
  }

  private siguienteId(contexto: TransferenciaInventario[], locales: TransferenciaInventario[]): number {
    return Math.max(0, ...contexto.map((item) => item.id), ...locales.map((item) => item.id)) + 1;
  }

  private siguienteFolio(actuales: TransferenciaInventario[]): string {
    const ultimo = Math.max(0, ...actuales.map((item) => Number(item.folio.match(/\d+/)?.[0]) || 0));
    return `TR-${String(ultimo + 1).padStart(4, '0')}`;
  }

  private claveExistencia(productoId: number, almacenId: number): string {
    return `${productoId}-${almacenId}`;
  }

  private ajustarCantidad(valor: number, permiteDecimales: boolean): number {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    return permiteDecimales ? Math.round(numero * 100) / 100 : Math.round(numero);
  }

  private numero(valor: string | number | undefined): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private numeroOpcional(valor: string | number | undefined): number | null {
    if (valor == null || String(valor).trim() === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private numeroId(valor: string | number): number {
    const directo = Number(valor);
    if (Number.isFinite(directo)) return directo;
    const numeros = String(valor).match(/\d+/g);
    return numeros?.length ? Number(numeros[numeros.length - 1]) : Number.MAX_SAFE_INTEGER;
  }

  private soloFecha(valor: string | undefined): string {
    if (!valor || valor === '—') return '';
    return valor.slice(0, 10);
  }

  private fechaLocal(): string {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha.toISOString().slice(0, 10);
  }

  private fechaMs(valor: string): number {
    if (!valor || valor === '—') return 0;
    const fecha = new Date(`${valor.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }

  private fechaMasReciente(actual: string, candidata: string): string {
    const normalizada = this.soloFecha(candidata);
    if (!normalizada) return actual || '—';
    return this.fechaMs(normalizada) >= this.fechaMs(actual) ? normalizada : actual;
  }

  private combinarTexto(actual: string, candidato: string): string {
    const valores = new Set(
      [actual, candidato]
        .flatMap((valor) => String(valor || '').split(','))
        .map((valor) => valor.trim())
        .filter((valor) => valor && valor !== '—'),
    );
    return [...valores].join(', ') || '—';
  }

  private normalizar(valor: string): string {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}

export function comprometeStockTransferencia(estado: string): boolean {
  const normalizado = String(estado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalizado !== 'borrador'
    && !['recibida', 'cancelada', 'cerrada', 'devuelta'].includes(normalizado);
}
