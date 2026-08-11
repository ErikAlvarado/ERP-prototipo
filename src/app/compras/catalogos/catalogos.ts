import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { IMPORTACIONES_MATERIAL_CATALOGO } from '../../shared/material/importaciones-material';
import {
  CatalogoCompras,
  CategoriaProducto,
} from '../../shared/services/catalogo-compras';

type Categoria = 'Todos' | CategoriaProducto;
type OrdenCatalogo = 'Nombre A - Z' | 'Nombre Z - A' | 'Menor precio' | 'Mayor precio';

@Component({
  selector: 'app-catalogos',
  imports: [CurrencyPipe, IMPORTACIONES_MATERIAL_CATALOGO],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogos {
  private readonly catalogo = inject(CatalogoCompras);
  private readonly router = inject(Router);
  readonly categorias = computed<Array<{ valor: Categoria; etiqueta: string }>>(
    () => [
      { valor: 'Todos', etiqueta: 'Todos' },
      ...this.catalogo.categorias().map(categoria => ({
        valor: categoria,
        etiqueta: categoria,
      })),
    ],
  );
  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly tamanoPagina = signal(10);
  readonly categoriaActiva = signal<Categoria>('Todos');
  readonly ordenCatalogo = signal<OrdenCatalogo>('Nombre A - Z');
  readonly opcionesOrden: ReadonlyArray<OrdenCatalogo> = [
    'Nombre A - Z',
    'Nombre Z - A',
    'Menor precio',
    'Mayor precio',
  ];
  readonly etiquetaCategoriaActiva = computed(
    () => this.categorias().find(
      categoria => categoria.valor === this.categoriaActiva(),
    )?.etiqueta ?? 'Todas',
  );
  readonly productos = this.catalogo.productos;

  readonly productosFiltrados = computed(() => {
    const termino = this.normalizar(this.busqueda());
    const categoria = this.categoriaActiva();
    const productos = this.productos().filter((producto) => {
      const coincideCategoria = categoria === 'Todos' || producto.categoria === categoria;
      const texto = this.normalizar(
        `${producto.nombre} ${producto.sku} ${producto.codigo} ${producto.proveedor}`,
      );
      return coincideCategoria && (!termino || texto.includes(termino));
    });
    return [...productos].sort((a, b) => {
      switch (this.ordenCatalogo()) {
        case 'Nombre Z - A':
          return b.nombre.localeCompare(a.nombre, 'es');
        case 'Menor precio':
          return a.precio - b.precio;
        case 'Mayor precio':
          return b.precio - a.precio;
        default:
          return a.nombre.localeCompare(b.nombre, 'es');
      }
    });
  });
  readonly productosPaginados = computed(() => {
    const inicio = this.pagina() * this.tamanoPagina();
    return this.productosFiltrados().slice(inicio, inicio + this.tamanoPagina());
  });

  buscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaActiva.set(categoria);
    this.pagina.set(0);
  }

  seleccionarOrden(orden: OrdenCatalogo): void {
    this.ordenCatalogo.set(orden);
    this.pagina.set(0);
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamanoPagina.set(evento.pageSize);
  }

  alternarFavorito(id: number): void {
    this.catalogo.alternarFavorito(id);
  }

  comprar(proveedor: string): void {
    void this.router.navigate(['/compras/proveedores'], { queryParams: { buscar: proveedor } });
  }

  stockClase(stock: number): string {
    if (stock <= 10) return 'stock-bajo';
    if (stock <= 20) return 'stock-medio';
    return 'stock-alto';
  }

  private normalizar(valor: string): string {
    return valor
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
