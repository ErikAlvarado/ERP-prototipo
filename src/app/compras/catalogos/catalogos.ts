import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IMPORTACIONES_MATERIAL_CATALOGO } from '../../shared/material/importaciones-material';
import {
  CatalogoCompras,
  CategoriaProducto,
} from '../../shared/services/catalogo-compras';

type Categoria = 'Todos' | CategoriaProducto;

@Component({
  selector: 'app-catalogos',
  imports: [FormsModule, CurrencyPipe, IMPORTACIONES_MATERIAL_CATALOGO],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogos {
  private readonly catalogo = inject(CatalogoCompras);
  private readonly router = inject(Router);
  readonly categorias: Array<{ valor: Categoria; etiqueta: string }> = [
    { valor: 'Todos', etiqueta: 'Todos' },
    { valor: 'Tecnologia', etiqueta: 'Tecnologia' },
    { valor: 'Papeleria', etiqueta: 'Papeleria' },
    { valor: 'Industrial', etiqueta: 'Industrial' },
    { valor: 'Mobiliario', etiqueta: 'Mobiliario' },
    { valor: 'Consumibles', etiqueta: 'Consumibles' },
  ];
  readonly busqueda = signal('');
  readonly categoriaActiva = signal<Categoria>('Todos');
  readonly productos = this.catalogo.productos;

  readonly productosFiltrados = computed(() => {
    const termino = this.normalizar(this.busqueda());
    const categoria = this.categoriaActiva();
    return this.productos().filter((producto) => {
      const coincideCategoria = categoria === 'Todos' || producto.categoria === categoria;
      const texto = this.normalizar(`${producto.nombre} ${producto.proveedor}`);
      return coincideCategoria && (!termino || texto.includes(termino));
    });
  });

  seleccionarCategoria(categoria: Categoria): void {
    this.categoriaActiva.set(categoria);
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
