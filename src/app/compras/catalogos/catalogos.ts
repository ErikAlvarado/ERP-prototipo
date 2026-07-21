import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IMPORTACIONES_MATERIAL_CATALOGO } from '../../shared/material/importaciones-material';

type Categoria = 'Todos' | 'Tecnología' | 'Papelería' | 'Industrial' | 'Mobiliario' | 'Consumibles';

interface Producto {
  id: number;
  categoria: Exclude<Categoria, 'Todos'>;
  nombre: string;
  proveedor: string;
  precio: number;
  unidad: string;
  stock: number;
  favorito?: boolean;
}

@Component({
  selector: 'app-catalogos',
  imports: [
    FormsModule,
    CurrencyPipe,
    IMPORTACIONES_MATERIAL_CATALOGO,
  ],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogos {
  readonly categorias: Categoria[] = [
    'Todos',
    'Tecnología',
    'Papelería',
    'Industrial',
    'Mobiliario',
    'Consumibles',
  ];

  readonly busqueda = signal('');
  readonly categoriaActiva = signal<Categoria>('Todos');
  readonly productos = signal<Producto[]>([
    { id: 1, categoria: 'Tecnología', nombre: 'Laptop Dell Latitude 5540', proveedor: 'TechnoInsumos SA de CV', precio: 18500, unidad: 'pieza', stock: 15, favorito: true },
    { id: 2, categoria: 'Tecnología', nombre: 'Monitor LG UltraWide 27\"', proveedor: 'Electrónica Empresarial MX', precio: 6800, unidad: 'pieza', stock: 8 },
    { id: 3, categoria: 'Mobiliario', nombre: 'Silla Ergonómica Pro Mesh', proveedor: 'Muebles Corporativos SA', precio: 4200, unidad: 'pieza', stock: 22, favorito: true },
    { id: 4, categoria: 'Papelería', nombre: 'Resma Papel Bond A4 500h', proveedor: 'Grupo Distribuidora Nacional', precio: 85, unidad: 'resma', stock: 450 },
    { id: 5, categoria: 'Consumibles', nombre: 'Tóner HP LaserJet M404dn', proveedor: 'Grupo Distribuidora Nacional', precio: 890, unidad: 'pieza', stock: 34 },
    { id: 6, categoria: 'Industrial', nombre: 'Casco de Seguridad Industrial', proveedor: 'Materiales del Norte SA', precio: 320, unidad: 'pieza', stock: 80 },
    { id: 7, categoria: 'Tecnología', nombre: 'Teclado Mecánico Keychron K2', proveedor: 'TechnoInsumos SA de CV', precio: 1850, unidad: 'pieza', stock: 12, favorito: true },
    { id: 8, categoria: 'Mobiliario', nombre: 'Escritorio Standing Dual Motor', proveedor: 'Muebles Corporativos SA', precio: 7800, unidad: 'pieza', stock: 5 },
    { id: 9, categoria: 'Papelería', nombre: 'Cuaderno Profesional 100 hojas', proveedor: 'Papelería del Centro', precio: 72, unidad: 'pieza', stock: 210 },
    { id: 10, categoria: 'Industrial', nombre: 'Guantes de Protección Nitrilo', proveedor: 'Materiales del Norte SA', precio: 145, unidad: 'par', stock: 95 },
    { id: 11, categoria: 'Tecnología', nombre: 'Mouse Inalámbrico Logitech MX', proveedor: 'Electrónica Empresarial MX', precio: 1490, unidad: 'pieza', stock: 18 },
    { id: 12, categoria: 'Consumibles', nombre: 'Cinta Adhesiva Transparente', proveedor: 'Grupo Distribuidora Nacional', precio: 48, unidad: 'pieza', stock: 160 },
  ]);

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
    this.productos.update((productos) =>
      productos.map((producto) =>
        producto.id === id ? { ...producto, favorito: !producto.favorito } : producto,
      ),
    );
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
