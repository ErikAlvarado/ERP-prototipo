import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IMPORTACIONES_MATERIAL_PREFERENCIAS } from '../../shared/material/importaciones-material';
import { CatalogoCompras } from '../../shared/services/catalogo-compras';

@Component({
  selector: 'app-preferencias',
  imports: [CurrencyPipe, IMPORTACIONES_MATERIAL_PREFERENCIAS],
  templateUrl: './preferencias.html',
  styleUrl: './preferencias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preferencias {
  private readonly catalogo = inject(CatalogoCompras);
  readonly favoritos = this.catalogo.favoritos;

  eliminar(id: number): void {
    this.catalogo.quitarFavorito(id);
  }
}
