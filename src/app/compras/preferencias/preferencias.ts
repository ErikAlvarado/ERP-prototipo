import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IMPORTACIONES_MATERIAL_PREFERENCIAS } from '../../shared/material/importaciones-material';

interface ProductoFavorito {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
}

@Component({
  selector: 'app-preferencias',
  imports: [CurrencyPipe, IMPORTACIONES_MATERIAL_PREFERENCIAS],
  templateUrl: './preferencias.html',
  styleUrl: './preferencias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preferencias {
  readonly favoritos = signal<ProductoFavorito[]>([
    { id: 1, nombre: 'Laptop Dell Latitude 5540', categoria: 'Tecnología', precio: 18500 },
    { id: 2, nombre: 'Silla Ergonómica Pro Mesh', categoria: 'Mobiliario', precio: 4200 },
    { id: 3, nombre: 'Teclado Mecánico Keychron K2', categoria: 'Tecnología', precio: 1850 },
    { id: 4, nombre: 'Webcam Logitech C920 HD Pro', categoria: 'Tecnología', precio: 1450 },
  ]);

  eliminar(id: number): void {
    this.favoritos.update((productos) => productos.filter((producto) => producto.id !== id));
  }
}
