import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatSnackBar,
} from '../../../../shared/material/importaciones-material';
import {
  CatalogoCompras,
  ProductoCompra,
  ProveedorCompra,
} from '../../../../shared/services/catalogo-compras';

export interface DatosGestionarProductosDialog {
  proveedor: ProveedorCompra;
}

@Component({
  selector: 'app-gestionar-productos-dialog',
  imports: [IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR],
  templateUrl: './gestionar-productos-dialog.html',
  styleUrl: './gestionar-productos-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionarProductosDialog {
  private readonly catalogo = inject(CatalogoCompras);
  private readonly referencia = inject(
    MatDialogRef<GestionarProductosDialog, boolean>,
  );
  private readonly avisos = inject(MatSnackBar);
  readonly datos = inject<DatosGestionarProductosDialog>(MAT_DIALOG_DATA);
  readonly proveedor = this.datos.proveedor;
  readonly busqueda = signal('');
  readonly seleccionados = signal<Set<number>>(
    new Set(this.catalogo.idsProductosDeProveedor(this.proveedor.id)),
  );

  readonly productos = computed(() => {
    const termino = this.normalizar(this.busqueda());
    return [...this.catalogo.productos()]
      .filter(producto =>
        !termino
        || this.normalizar(
          `${producto.nombre} ${producto.sku} ${producto.codigo} ${producto.categoria}`,
        ).includes(termino))
      .sort((a, b) =>
        Number(this.estaSeleccionado(b.id)) - Number(this.estaSeleccionado(a.id))
        || a.nombre.localeCompare(b.nombre, 'es'));
  });

  estaSeleccionado(idProducto: number): boolean {
    return this.seleccionados().has(idProducto);
  }

  alternar(producto: ProductoCompra): void {
    if (!this.proveedor.activo) return;
    const seleccionados = new Set(this.seleccionados());
    seleccionados.has(producto.id)
      ? seleccionados.delete(producto.id)
      : seleccionados.add(producto.id);
    this.seleccionados.set(seleccionados);
  }

  existencias(producto: ProductoCompra): string {
    if (!producto.existencias.length) return 'Sin existencias registradas';
    return producto.existencias
      .map(existencia => `${existencia.almacen}: ${existencia.stock}`)
      .join(' · ');
  }

  cancelar(): void {
    this.referencia.close(false);
  }

  async guardar(): Promise<void> {
    try {
      await this.catalogo.actualizarProductosProveedor(
        this.proveedor.id,
        [...this.seleccionados()],
      );
      this.avisos.open('Productos del proveedor actualizados.', 'Cerrar', {
        duration: 3000,
      });
      this.referencia.close(true);
    } catch (error) {
      this.avisos.open(
        error instanceof Error ? error.message : 'No fue posible guardar los productos.',
        'Cerrar',
        { duration: 4500 },
      );
    }
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim();
  }
}
