import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Archivos {
  descargarTexto(nombre: string, contenido: string, tipo = 'text/plain;charset=utf-8'): void {
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  descargarCsv(nombre: string, encabezados: string[], filas: Array<Array<string | number>>): void {
    const escapar = (valor: string | number) => `"${String(valor).replaceAll('"', '""')}"`;
    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map(escapar).join(','))
      .join('\r\n');
    this.descargarTexto(nombre, `\uFEFF${contenido}`, 'text/csv;charset=utf-8');
  }
}
