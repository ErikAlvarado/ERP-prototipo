import { firstValueFrom, of, take } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DatosDb } from '../../shared/services/datos-db';
import { PersistenciaInventarioTxt } from '../../shared/services/persistencia-inventario-txt';
import { PersistenciaLocal } from '../../shared/services/persistencia-local';
import { AdministracionDatos } from './administracion-datos';

describe('AdministracionDatos', () => {
  it('persiste almacenes y usuarios relacionados en los TXT', async () => {
    const tablas: Record<string, Record<string, string>[]> = {
      'empresas.txt': [{
        id_empresa: '1', nombre_empresa: 'Empresa uno', razon_social: 'Empresa Uno SA de CV',
        rfc: 'EUN010101AA1', direccion: 'Centro', telefono: '5550000000', email: 'uno@example.com',
        activo: '1', fecha_creacion: '2024-01-01', fecha_actualizacion: '2024-01-01',
        creado_por_usuario: '1', actualizado_por_usuario: '1',
      }],
      'almacenes.txt': [{
        id_almacen: '1', id_empresa: '1', nombre_almacen: 'Central', direccion: 'Bodega 1',
        es_principal: '1', activo: '1', fecha_creacion: '2024-01-01', fecha_actualizacion: '2024-01-01',
        creado_por_usuario: '1', actualizado_por_usuario: '1',
      }],
      'usuarios.txt': [{
        id_usuario: '1', id_empresa: '1', nombres: 'Ana', apellido_paterno: 'Pérez',
        apellido_materno: '', fecha_nacimiento: '1990-01-01', email: 'ana@example.com',
        telefono: '5551111111', password_hash: 'hash', activo: '1', ultimo_acceso: '',
        intentos_fallidos: '0', fecha_bloqueo: '', id_almacen_defecto: '1',
        fecha_creacion: '2024-01-01', fecha_actualizacion: '2024-01-01',
        creado_por_usuario: '1', actualizado_por_usuario: '1',
      }],
      'roles.txt': [],
      'usuario_roles.txt': [],
      'roles_permisos.txt': [],
      'permisos.txt': [],
    };
    const db = {
      leer: vi.fn((archivo: string) => of(tablas[archivo] ?? [])),
    } as unknown as DatosDb;
    const persistencia = {
      leer: vi.fn((_clave: string, valorInicial: unknown) => valorInicial),
      guardar: vi.fn(),
    } as unknown as PersistenciaLocal;
    const reemplazarVarias = vi.fn().mockResolvedValue(undefined);
    const persistenciaTxt = { reemplazarVarias } as unknown as PersistenciaInventarioTxt;
    const servicio = new AdministracionDatos(db, persistencia, persistenciaTxt);
    const estado = await firstValueFrom(servicio.cargar().pipe(take(1)));

    await servicio.guardarAlmacenes(estado.almacenes.map(almacen => ({
      ...almacen,
      estado: false,
    })));

    expect(reemplazarVarias).toHaveBeenCalledTimes(1);
    const payload = reemplazarVarias.mock.calls[0][0];
    expect(payload.almacenes).toEqual([{
      id_almacen: '1',
      id_empresa: '1',
      nombre_almacen: 'Central',
      direccion: 'Bodega 1',
      es_principal: '0',
      activo: '0',
      fecha_creacion: '2024-01-01',
      fecha_actualizacion: expect.any(String),
      creado_por_usuario: '1',
      actualizado_por_usuario: '1',
    }]);
    expect(payload.usuarios[0]).toMatchObject({
      id_usuario: '1',
      id_empresa: '1',
      id_almacen_defecto: '',
    });
  });
});
