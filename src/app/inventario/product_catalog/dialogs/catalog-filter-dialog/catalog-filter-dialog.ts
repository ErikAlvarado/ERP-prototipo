import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../shared/imports/shared-imports';

export type ValorFiltroCatalogo = string | number | null;

export interface OpcionFiltroCatalogo {
  valor: string;
  etiqueta: string;
}

export interface CampoFiltroCatalogo {
  clave: string;
  etiqueta: string;
  icono: string;
  tipo?: 'select' | 'number';
  opciones?: OpcionFiltroCatalogo[];
  placeholder?: string;
  minimo?: number;
}

export interface CatalogFilterDialogData {
  titulo: string;
  filtros: Record<string, ValorFiltroCatalogo>;
  campos: CampoFiltroCatalogo[];
}

@Component({
  selector: 'app-catalog-filter-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './catalog-filter-dialog.html',
  styleUrl: './catalog-filter-dialog.css',
})
export class CatalogFilterDialog {
  filtros: Record<string, ValorFiltroCatalogo>;

  constructor(
    private dialogRef: MatDialogRef<CatalogFilterDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CatalogFilterDialogData,
  ) {
    this.filtros = { ...data.filtros };
  }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor !== '' && valor !== null).length;
  }

  limpiar(): void {
    this.filtros = Object.fromEntries(this.data.campos.map(campo => [
      campo.clave,
      campo.tipo === 'number' ? null : '',
    ]));
  }

  aplicar(): void { this.dialogRef.close(this.filtros); }
  cerrar(): void { this.dialogRef.close(); }
}
