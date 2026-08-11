import { AfterViewInit, Directive, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appResponsiveTables]',
})
export class ResponsiveTablesDirective implements AfterViewInit, OnDestroy {
  private observer?: MutationObserver;

  ngAfterViewInit(): void {
    this.actualizarTablas();
    this.observer = new MutationObserver(() => this.actualizarTablas());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private actualizarTablas(): void {
    document.querySelectorAll<HTMLTableElement>('table:not(.no-responsive-cards)').forEach(tabla => {
      const encabezados = Array.from(tabla.querySelectorAll<HTMLElement>('thead th, tr[mat-header-row] th'))
        .map(encabezado => encabezado.textContent?.trim() || '');
      if (!encabezados.length) return;

      tabla.classList.add('responsive-card-table');
      tabla.querySelectorAll<HTMLTableRowElement>('tbody tr, tr[mat-row]').forEach(fila => {
        Array.from(fila.querySelectorAll<HTMLElement>('td')).forEach((celda, indice) => {
          celda.dataset['label'] = encabezados[indice] || `Campo ${indice + 1}`;
        });
      });
    });
  }
}
