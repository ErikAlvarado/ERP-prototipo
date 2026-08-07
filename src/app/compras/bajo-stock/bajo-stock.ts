import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { IMPORTACIONES_MATERIAL_COMPRAS } from '../../shared/material/importaciones-material';
import {
  InventarioComprasService,
  StockAlmacenCompra,
} from '../services/inventario-compras.service';

@Component({
  selector: 'app-bajo-stock',
  imports: [DatePipe, DecimalPipe, RouterLink, EncabezadoPagina, IMPORTACIONES_MATERIAL_COMPRAS],
  templateUrl: './bajo-stock.html',
  styleUrl: './bajo-stock.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BajoStock {
  readonly inventario = inject(InventarioComprasService);
  readonly busqueda = signal('');
  readonly almacenId = signal<number | null>(null);
  readonly columnas = [
    'producto',
    'proveedor',
    'almacen',
    'stock',
    'minimo',
    'faltante',
    'actualizacion',
    'acciones',
  ] as const;

  readonly almacenes = computed(() =>
    [
      ...new Map(
        this.inventario
          .bajoStock()
          .map((item) => [item.almacenId, { id: item.almacenId, nombre: item.almacen }]),
      ).values(),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX')),
  );

  readonly existenciasFiltradas = computed(() => {
    const termino = normalizar(this.busqueda());
    return this.inventario
      .bajoStock()
      .filter(
        (item) =>
          (this.almacenId() === null || item.almacenId === this.almacenId()) &&
          (!termino ||
            normalizar(
              `${item.sku} ${item.producto} ${item.categoria} ${item.almacen} ` +
                `${item.anaquel} ${item.proveedores.map((proveedor) => proveedor.proveedor).join(' ')}`,
            ).includes(termino)),
      );
  });
  readonly agotados = computed(
    () => this.inventario.bajoStock().filter((item) => item.nivel === 'Agotado').length,
  );
  readonly criticos = computed(
    () => this.inventario.bajoStock().filter((item) => item.nivel === 'Crítico').length,
  );
  readonly almacenesAfectados = computed(
    () => new Set(this.inventario.bajoStock().map((item) => item.almacenId)).size,
  );
  readonly productosSinProveedor = computed(
    () =>
      new Set(
        this.inventario
          .bajoStock()
          .filter((item) => !item.proveedores.length)
          .map((item) => item.productoId),
      ).size,
  );

  seleccionarAlmacen(valor: number | null): void {
    this.almacenId.set(valor);
  }

  claseNivel(item: StockAlmacenCompra): string {
    return normalizar(item.nivel).replaceAll(' ', '-');
  }
}

function normalizar(valor: string): string {
  return valor
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
