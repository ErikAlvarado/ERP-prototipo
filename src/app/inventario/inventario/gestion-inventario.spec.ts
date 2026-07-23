import { firstValueFrom, of } from 'rxjs';
import { ProductoCatalogo } from '../../shared/services/catalogo-productos';
import {
  comprometeStockTransferencia,
  GestionInventario,
} from './gestion-inventario';

describe('GestionInventario', () => {
  it('incorpora el inventario inicial de un producto creado localmente', async () => {
    const producto = {
      id: 74,
      idEmpresa: 1,
      sku: 'LOCAL-74',
      producto: 'Producto local',
      idUnidad: 1,
      medida: 'Pieza',
      estado: true,
      usarExistencias: true,
      inventarios: [{
        id: 78,
        idAlmacen: 1,
        almacen: 'Nombre anterior',
        stock: 12,
        stockReorden: 5,
        stockCritico: 2,
        stockMaximo: 20,
        anaquel: 'A-1',
        fechaActualizacion: '2026-07-23',
      }],
    } as ProductoCatalogo;
    const archivos: Record<string, unknown[]> = {
      'unidades.txt': [{
        id_unidad: '1',
        nombre: 'Pieza',
        abreviatura: 'pza',
        permitir_decimales: '0',
      }],
      'inventario.txt': [],
      'kardex_inventario.txt': [],
      'tipos_movimiento.txt': [],
      'estados_transferencia.txt': [],
      'transferencias.txt': [],
      'detalle_transferencia.txt': [],
    };
    const db = { leer: (archivo: string) => of(archivos[archivo] || []) };
    const persistencia = {
      leer: <T>(_clave: string, valor: T): T => valor,
      guardar: () => undefined,
    };
    const catalogo = {
      cargar: () => of([producto]),
      cargarOpciones: () => of({
        empresas: [{ id: 1, nombre: 'Empresa', idEmpresa: 1 }],
        categorias: [],
        marcas: [],
        unidades: [{
          id: 1,
          nombre: 'Pieza',
          idEmpresa: 1,
          permiteDecimales: false,
        }],
        listasPrecios: [],
      }),
    };
    const administracion = {
      cargar: () => of({
        empresas: [{ id: '1', nombre: 'Empresa', estado: true }],
        almacenes: [{
          id: '1',
          empresaId: '1',
          nombre: 'Almacén actualizado',
          estado: true,
        }],
        usuarios: [{
          id: '1',
          empresaId: '1',
          nombres: 'Ana',
          apellidoPaterno: 'Pérez',
          apellidoMaterno: '',
          email: 'ana@example.test',
          estado: true,
        }],
        roles: [],
        permisos: [],
        usuarioRoles: [],
        rolesPermisos: [],
      }),
    };
    const servicio = new GestionInventario(
      db as never,
      persistencia as never,
      catalogo as never,
      administracion as never,
    );

    const contexto = await firstValueFrom(servicio.cargar());

    expect(contexto.productos.map(item => item.id)).toEqual([74]);
    expect(contexto.existencias[0]).toEqual(expect.objectContaining({
      productoId: 74,
      almacen: 'Almacén actualizado',
      stock: 12,
      inicializada: true,
    }));
    expect(contexto.movimientos[0]).toEqual(expect.objectContaining({
      tipo: 'Inventario inicial',
      cantidad: 12,
      existencia: 12,
    }));
  });
});

describe('compromiso de stock de transferencias', () => {
  it('no reserva borradores ni estados finales', () => {
    expect(comprometeStockTransferencia('Borrador')).toBe(false);
    expect(comprometeStockTransferencia('Recibida')).toBe(false);
    expect(comprometeStockTransferencia('Cancelada')).toBe(false);
  });

  it('reserva transferencias pendientes o autorizadas', () => {
    expect(comprometeStockTransferencia('Pendiente')).toBe(true);
    expect(comprometeStockTransferencia('Autorizada')).toBe(true);
  });
});
