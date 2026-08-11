import { Injectable } from '@angular/core';

export interface FilaReporteCompra {
  folio: string;
  proveedor: string;
  total: number;
  fecha: string;
  estado: string;
}

export interface DatosReporteCompra {
  periodo: string;
  descripcion: string;
  total: number;
  ordenes: readonly FilaReporteCompra[];
}

@Injectable({ providedIn: 'root' })
export class ReportePdf {
  async descargarCompras(datos: DatosReporteCompra): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const documento = new jsPDF({ unit: 'mm', format: 'a4' });
    const ancho = documento.internal.pageSize.getWidth();
    const margen = 16;
    let y = 0;

    documento.setFillColor(23, 36, 66);
    documento.rect(0, 0, ancho, 34, 'F');
    documento.setTextColor(255, 255, 255);
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(19);
    documento.text('Reporte de compras', margen, 16);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.text(datos.periodo, margen, 24);

    documento.setTextColor(23, 36, 66);
    documento.setFillColor(248, 250, 252);
    documento.roundedRect(margen, 42, 82, 25, 2, 2, 'F');
    documento.roundedRect(112, 42, 82, 25, 2, 2, 'F');
    documento.setFontSize(8);
    documento.setTextColor(100, 116, 139);
    documento.text('ORDENES', margen + 5, 50);
    documento.text('TOTAL', 117, 50);
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(15);
    documento.setTextColor(23, 36, 66);
    documento.text(String(datos.ordenes.length), margen + 5, 61);
    documento.text(datos.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }), 117, 61);

    y = 76;
    documento.setFontSize(8);
    documento.setTextColor(100, 116, 139);
    documento.text('DESCRIPCION', margen, y);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(10);
    documento.setTextColor(31, 41, 55);
    const descripcion = documento.splitTextToSize(datos.descripcion || 'Sin descripcion', ancho - margen * 2);
    documento.text(descripcion, margen, y + 6);
    y += 13 + descripcion.length * 4;

    const dibujarEncabezado = (): void => {
      documento.setFillColor(241, 245, 249);
      documento.rect(margen, y, ancho - margen * 2, 9, 'F');
      documento.setFont('helvetica', 'bold');
      documento.setFontSize(8);
      documento.setTextColor(71, 84, 103);
      documento.text('FOLIO', margen + 3, y + 6);
      documento.text('PROVEEDOR', 52, y + 6);
      documento.text('FECHA', 126, y + 6);
      documento.text('ESTADO', 151, y + 6);
      documento.text('TOTAL', 178, y + 6, { align: 'right' });
      y += 9;
    };

    dibujarEncabezado();
    for (const orden of datos.ordenes) {
      if (y > 276) {
        documento.addPage();
        y = 18;
        dibujarEncabezado();
      }
      documento.setDrawColor(226, 232, 240);
      documento.line(margen, y + 12, ancho - margen, y + 12);
      documento.setFont('helvetica', 'normal');
      documento.setFontSize(8);
      documento.setTextColor(31, 41, 55);
      documento.text(orden.folio, margen + 3, y + 7);
      documento.text(documento.splitTextToSize(orden.proveedor, 65)[0], 52, y + 7);
      documento.text(new Date(orden.fecha).toLocaleDateString('es-MX'), 126, y + 7);
      documento.text(orden.estado, 151, y + 7);
      documento.text(orden.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }), 194, y + 7, { align: 'right' });
      y += 12;
    }

    documento.save(`reporte-compras-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
