import { describe, expect, it, vi } from 'vitest';
import { PrecioDialog, PrecioDialogData } from './precio-dialog';

function crearDialogo() {
  const referencia = { close: vi.fn() };
  const data: PrecioDialogData = {
    mode: 'add',
    productos: [
      { id: 1, idEmpresa: 1, empresa: 'Zyro', sku: 'LAP-01', nombre: 'Laptop Pro' },
      { id: 2, idEmpresa: 2, empresa: 'Café Norte', sku: 'CAF-02', nombre: 'Café molido' },
    ],
    listas: [
      { id: 10, idEmpresa: 1, nombre: 'General', predeterminada: true, activa: true },
      { id: 20, idEmpresa: 2, nombre: 'Mostrador', predeterminada: true, activa: true },
    ],
    existentes: [],
  };
  return {
    dialogo: new PrecioDialog(referencia as never, data),
    referencia,
  };
}

describe('PrecioDialog', () => {
  it('busca productos por texto normalizado sin cargar un select completo', () => {
    const { dialogo } = crearDialogo();

    dialogo.productoControl.setValue('cafe');

    expect(dialogo.productosFiltrados.map(producto => producto.id)).toEqual([2]);
  });

  it('asigna la lista de la empresa cuando se selecciona una coincidencia', () => {
    const { dialogo } = crearDialogo();

    dialogo.productoControl.setValue(2);

    expect(dialogo.precio.idProducto).toBe(2);
    expect(dialogo.precio.idLista).toBe(20);
    expect(dialogo.mostrarProducto(2)).toContain('CAF-02');
  });

  it('no permite guardar texto que no fue seleccionado como producto', () => {
    const { dialogo, referencia } = crearDialogo();
    dialogo.productoControl.setValue('producto inexistente');

    dialogo.guardar();

    expect(dialogo.error).toBe('Selecciona un producto.');
    expect(referencia.close).not.toHaveBeenCalled();
  });
});
