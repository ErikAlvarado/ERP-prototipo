import { vi } from 'vitest';
import { Anaqueles } from './anaqueles';

describe('Anaqueles', () => {
  it('restringe el borrado cuando el anaquel tiene productos asignados', () => {
    const dialog = { open: vi.fn() };
    const catalogoAnaqueles = { eliminar: vi.fn() };
    const componente = new Anaqueles(
      dialog as never,
      catalogoAnaqueles as never,
      {} as never,
      {} as never,
    );

    componente.eliminar({
      id: '9', idEmpresa: 1, idAlmacen: 2, nombre: 'A-01', estado: true,
      empresa: 'Empresa', almacen: 'Central', productos: 3,
    } as never);

    expect(dialog.open).toHaveBeenCalledOnce();
    expect(dialog.open.mock.calls[0][1]).toEqual(expect.objectContaining({
      data: expect.objectContaining({ title: 'Anaquel en uso' }),
    }));
    expect(catalogoAnaqueles.eliminar).not.toHaveBeenCalled();
  });
});
