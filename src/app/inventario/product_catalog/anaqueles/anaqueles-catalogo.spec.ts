import { firstValueFrom, of } from 'rxjs';
import { CatalogosPersistencia } from '../catalogos-persistencia';
import { AnaquelesCatalogo } from './anaqueles-catalogo';

describe('AnaquelesCatalogo', () => {
  it('mapea la tabla relacional y deriva la empresa desde el almacén', async () => {
    const memoria = new Map<string, unknown>();
    memoria.set('catalogo-anaqueles-v2', {
      registros: [{
        id: '1', idEmpresa: 7, idAlmacen: 2, nombre: 'A-01 renombrado', estado: true,
      }],
      eliminados: [],
    });
    const persistenciaLocal = {
      leer: <T>(clave: string, inicial: T): T => (memoria.get(clave) as T) ?? inicial,
      guardar: <T>(clave: string, valor: T): void => { memoria.set(clave, valor); },
    };
    const db = {
      leer: (archivo: string) => of(archivo === 'anaqueles.txt'
        ? [{
            id_anaquel: '1', id_almacen: '2', nombre_anaquel: 'A-01', activo: '1',
            fecha_creacion: '2026-08-01', fecha_actualizacion: '2026-08-01',
          }]
        : [{ id_almacen: '2', id_empresa: '7' }]),
    };
    const catalogos = new CatalogosPersistencia(persistenciaLocal as never);
    const servicio = new AnaquelesCatalogo(db as never, catalogos);

    const anaqueles = await firstValueFrom(servicio.cargar());

    expect(anaqueles).toEqual([expect.objectContaining({
      id: '1', idEmpresa: 7, idAlmacen: 2, nombre: 'A-01 renombrado', estado: true,
    })]);
  });

  it('conserva el tombstone de un borrado físico local', async () => {
    const memoria = new Map<string, unknown>();
    const persistenciaLocal = {
      leer: <T>(clave: string, inicial: T): T => (memoria.get(clave) as T) ?? inicial,
      guardar: <T>(clave: string, valor: T): void => { memoria.set(clave, valor); },
    };
    const db = {
      leer: (archivo: string) => of(archivo === 'anaqueles.txt'
        ? [{
            id_anaquel: '1', id_almacen: '2', nombre_anaquel: 'A-01', activo: '1',
            fecha_creacion: '', fecha_actualizacion: '',
          }]
        : [{ id_almacen: '2', id_empresa: '7' }]),
    };
    const servicio = new AnaquelesCatalogo(
      db as never,
      new CatalogosPersistencia(persistenciaLocal as never),
    );
    await firstValueFrom(servicio.cargar());

    servicio.eliminar('1', []);

    expect(await firstValueFrom(servicio.cargar())).toEqual([]);
  });
});
