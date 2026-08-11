import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';

export type ValorFiltroAdministracion = string | boolean | null;

export interface OpcionFiltroAdministracion {
  valor: ValorFiltroAdministracion;
  etiqueta: string;
}

export interface CampoFiltroAdministracion {
  clave: string;
  etiqueta: string;
  icono: string;
  opciones: OpcionFiltroAdministracion[];
  valorVacio: ValorFiltroAdministracion;
  etiquetaVacia?: string;
}

export interface FiltrosAdministracionData {
  titulo: string;
  filtros: Record<string, ValorFiltroAdministracion>;
  campos: CampoFiltroAdministracion[];
}

@Component({
  selector: 'app-filtros-administracion-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './filtros-administracion-dialog.html',
  styleUrl: './filtros-administracion-dialog.css',
})
export class FiltrosAdministracionDialog {
  filtros: Record<string, ValorFiltroAdministracion>;

  constructor(
    private dialogRef: MatDialogRef<FiltrosAdministracionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: FiltrosAdministracionData,
  ) {
    this.filtros = { ...data.filtros };
  }

  get activos(): number {
    return this.data.campos.filter(campo => this.filtros[campo.clave] !== campo.valorVacio).length;
  }

  limpiar(): void {
    this.filtros = Object.fromEntries(this.data.campos.map(campo => [campo.clave, campo.valorVacio]));
  }

  aplicar(): void { this.dialogRef.close(this.filtros); }
  cerrar(): void { this.dialogRef.close(); }
}
