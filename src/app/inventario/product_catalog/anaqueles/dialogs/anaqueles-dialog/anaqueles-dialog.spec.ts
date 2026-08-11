import { vi } from 'vitest';
import {
  AlmacenAdministracion,
  EmpresaAdministracion,
} from '../../../../administracion/administracion-datos';
import { AnaquelesDialog, AnaquelesDialogData } from './anaqueles-dialog';

describe('AnaquelesDialog', () => {
  it('rechaza nombres equivalentes con o sin diacríticos en el mismo almacén', () => {
    const referencia = { close: vi.fn() };
    const data: AnaquelesDialogData = {
      mode: 'add',
      empresas: [{ id: '1', nombre: 'Empresa', estado: true } as EmpresaAdministracion],
      almacenes: [{ id: '1', empresaId: '1', nombre: 'Central', estado: true } as AlmacenAdministracion],
      existentes: [{ id: '1', idEmpresa: 1, idAlmacen: 1, nombre: 'Año', estado: true }],
    };
    const dialogo = new AnaquelesDialog(referencia as never, data);
    dialogo.anaquel.nombre = 'Ano';

    dialogo.guardar();

    expect(dialogo.error).toBe('Ya existe un anaquel con ese nombre en el almacén seleccionado.');
    expect(referencia.close).not.toHaveBeenCalled();
  });
});
