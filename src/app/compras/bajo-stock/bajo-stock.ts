import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
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
  readonly nivel = signal<string>('Todos');
  readonly proveedor = signal<string>('Todos');
  readonly orden = signal('Más recientes');
  readonly pagina = signal(0);
  readonly tamanoPagina = signal(10);
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

  readonly existenciasFiltradas = computed(() => {
    const termino = normalizar(this.busqueda());
    const filtradas = this.inventario
      .bajoStock()
      .filter(
        (item) =>
          (this.nivel() === 'Todos' || item.nivel === this.nivel()) &&
          (this.proveedor() === 'Todos' ||
            (this.proveedor() === 'Con proveedor'
              ? item.proveedores.length > 0
              : !item.proveedores.length)) &&
          (!termino ||
            normalizar(
              `${item.sku} ${item.producto} ${item.categoria} ${item.almacen} ` +
                `${item.anaquel} ${item.proveedores.map((proveedor) => proveedor.proveedor).join(' ')}`,
            ).includes(termino)),
      );
    return [...filtradas].sort((a, b) => {
      if (this.orden() === 'Más antiguos') {
        return a.fechaActualizacion.localeCompare(b.fechaActualizacion);
      }
      if (this.orden() === 'Mayor faltante') return b.faltante - a.faltante;
      if (this.orden() === 'Nombre A - Z') {
        return a.producto.localeCompare(b.producto, 'es-MX');
      }
      return b.fechaActualizacion.localeCompare(a.fechaActualizacion);
    });
  });
  readonly existenciasPaginadas = computed(() => {
    const inicio = this.pagina() * this.tamanoPagina();
    return this.existenciasFiltradas().slice(inicio, inicio + this.tamanoPagina());
  });
  readonly filtrosActivos = computed(() =>
    Number(this.nivel() !== 'Todos') + Number(this.proveedor() !== 'Todos'),
  );
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

  buscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }

  seleccionarNivel(valor: string): void {
    this.nivel.set(valor);
    this.pagina.set(0);
  }

  seleccionarProveedor(valor: string): void {
    this.proveedor.set(valor);
    this.pagina.set(0);
  }

  seleccionarOrden(valor: string): void {
    this.orden.set(valor);
    this.pagina.set(0);
  }

  limpiarFiltros(): void {
    this.nivel.set('Todos');
    this.proveedor.set('Todos');
    this.pagina.set(0);
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamanoPagina.set(evento.pageSize);
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
