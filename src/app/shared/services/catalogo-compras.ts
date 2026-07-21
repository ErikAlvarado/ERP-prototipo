import { computed, inject, Injectable, signal } from '@angular/core';
import { PersistenciaLocal } from './persistencia-local';

export type CategoriaProducto =
  | 'Tecnologia'
  | 'Papeleria'
  | 'Industrial'
  | 'Mobiliario'
  | 'Consumibles';

export interface ProductoCompra {
  id: number;
  categoria: CategoriaProducto;
  nombre: string;
  proveedor: string;
  precio: number;
  unidad: string;
  stock: number;
  favorito: boolean;
}

const PRODUCTOS_INICIALES: ProductoCompra[] = [
  { id: 1, categoria: 'Tecnologia', nombre: 'Laptop Dell Latitude 5540', proveedor: 'TechnoInsumos SA de CV', precio: 18500, unidad: 'pieza', stock: 15, favorito: true },
  { id: 2, categoria: 'Tecnologia', nombre: 'Monitor LG UltraWide 27"', proveedor: 'Electronica Empresarial MX', precio: 6800, unidad: 'pieza', stock: 8, favorito: false },
  { id: 3, categoria: 'Mobiliario', nombre: 'Silla Ergonomica Pro Mesh', proveedor: 'Muebles Corporativos SA', precio: 4200, unidad: 'pieza', stock: 22, favorito: true },
  { id: 4, categoria: 'Papeleria', nombre: 'Resma Papel Bond A4 500h', proveedor: 'Grupo Distribuidora Nacional', precio: 85, unidad: 'resma', stock: 450, favorito: false },
  { id: 5, categoria: 'Consumibles', nombre: 'Toner HP LaserJet M404dn', proveedor: 'Grupo Distribuidora Nacional', precio: 890, unidad: 'pieza', stock: 34, favorito: false },
  { id: 6, categoria: 'Industrial', nombre: 'Casco de Seguridad Industrial', proveedor: 'Materiales del Norte SA', precio: 320, unidad: 'pieza', stock: 80, favorito: false },
  { id: 7, categoria: 'Tecnologia', nombre: 'Teclado Mecanico Keychron K2', proveedor: 'TechnoInsumos SA de CV', precio: 1850, unidad: 'pieza', stock: 12, favorito: true },
  { id: 8, categoria: 'Mobiliario', nombre: 'Escritorio Standing Dual Motor', proveedor: 'Muebles Corporativos SA', precio: 7800, unidad: 'pieza', stock: 5, favorito: false },
  { id: 9, categoria: 'Papeleria', nombre: 'Cuaderno Profesional 100 hojas', proveedor: 'Papeleria del Centro', precio: 72, unidad: 'pieza', stock: 210, favorito: false },
  { id: 10, categoria: 'Industrial', nombre: 'Guantes de Proteccion Nitrilo', proveedor: 'Materiales del Norte SA', precio: 145, unidad: 'par', stock: 95, favorito: false },
  { id: 11, categoria: 'Tecnologia', nombre: 'Mouse Inalambrico Logitech MX', proveedor: 'Electronica Empresarial MX', precio: 1490, unidad: 'pieza', stock: 18, favorito: false },
  { id: 12, categoria: 'Consumibles', nombre: 'Cinta Adhesiva Transparente', proveedor: 'Grupo Distribuidora Nacional', precio: 48, unidad: 'pieza', stock: 160, favorito: false },
];

@Injectable({ providedIn: 'root' })
export class CatalogoCompras {
  private readonly persistencia = inject(PersistenciaLocal);
  private readonly clave = 'erp.catalogo-compras';
  readonly productos = signal(
    this.persistencia.leer<ProductoCompra[]>(this.clave, PRODUCTOS_INICIALES),
  );
  readonly favoritos = computed(() => this.productos().filter((producto) => producto.favorito));

  alternarFavorito(id: number): void {
    this.productos.update((productos) =>
      productos.map((producto) =>
        producto.id === id ? { ...producto, favorito: !producto.favorito } : producto,
      ),
    );
    this.persistencia.guardar(this.clave, this.productos());
  }

  quitarFavorito(id: number): void {
    this.productos.update((productos) =>
      productos.map((producto) =>
        producto.id === id ? { ...producto, favorito: false } : producto,
      ),
    );
    this.persistencia.guardar(this.clave, this.productos());
  }
}
