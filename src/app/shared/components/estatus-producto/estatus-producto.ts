import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EstatusProductoValor = 'Vigente' | 'Eliminado' | 'Descontinuado';

@Component({
  selector: 'app-estatus-producto',
  templateUrl: './estatus-producto.html',
  styleUrl: './estatus-producto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstatusProducto {
  readonly estatus = input.required<string>();

  readonly valor = computed<EstatusProductoValor>(() => {
    const estatus = this.estatus().trim().toLocaleLowerCase();
    if (estatus === 'eliminado') return 'Eliminado';
    if (estatus === 'descontinuado') return 'Descontinuado';
    return 'Vigente';
  });
}
