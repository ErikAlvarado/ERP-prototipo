import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-estado',
  templateUrl: './estado.html',
  styleUrl: './estado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Estado {
  readonly texto = input.required<string>();
  readonly variante = input<string>();

  readonly clase = computed(() =>
    (this.variante() ?? this.texto())
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, ''),
  );
}
