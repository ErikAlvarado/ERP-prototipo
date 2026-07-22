import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';

export type ValorFiltroInventario = string | number | null;

export interface OpcionFiltroInventario {
  label: string;
  value: string | number;
}

export interface CampoFiltroInventario {
  key: string;
  label: string;
  icon: string;
  type: 'select' | 'date' | 'number';
  options?: OpcionFiltroInventario[];
  emptyLabel?: string;
  defaultValue?: ValorFiltroInventario;
  min?: number;
  step?: number;
  placeholder?: string;
}

export interface FiltrosInventarioDialogData {
  title: string;
  filters: Record<string, ValorFiltroInventario>;
  fields: CampoFiltroInventario[];
}

@Component({
  selector: 'app-filtros-inventario-dialog',
  imports: [...SHARED_IMPORTS],
  templateUrl: './filtros-inventario-dialog.html',
  styleUrl: './filtros-inventario-dialog.css',
})
export class FiltrosInventarioDialog {
  filters: Record<string, ValorFiltroInventario>;

  constructor(
    private dialogRef: MatDialogRef<FiltrosInventarioDialog>,
    @Inject(MAT_DIALOG_DATA) public data: FiltrosInventarioDialogData,
  ) {
    this.filters = { ...data.filters };
  }

  get activeCount(): number {
    return Object.values(this.filters).filter((value) => value !== '' && value !== null).length;
  }

  emptyValue(field: CampoFiltroInventario): ValorFiltroInventario {
    return Object.prototype.hasOwnProperty.call(field, 'defaultValue') ? field.defaultValue ?? null : '';
  }

  clear(): void {
    this.filters = Object.fromEntries(
      this.data.fields.map((field) => [field.key, this.emptyValue(field)]),
    );
  }

  apply(): void {
    this.dialogRef.close(this.filters);
  }

  close(): void {
    this.dialogRef.close();
  }
}
