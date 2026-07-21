import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-encabezado-pagina',
  templateUrl: './encabezado-pagina.html',
  styleUrl: './encabezado-pagina.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncabezadoPagina {
  readonly titulo = input.required<string>();
  readonly subtitulo = input.required<string>();
}
