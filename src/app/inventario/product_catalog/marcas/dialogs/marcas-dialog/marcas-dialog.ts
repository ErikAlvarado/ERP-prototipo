import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { EmpresaMarcaOption, Marca } from '../../marcas';

export interface MarcasDialogData {
  mode: 'add' | 'edit';
  marca?: Marca;
  empresas: EmpresaMarcaOption[];
  existentes: { nombre: string; idEmpresa: string }[];
}

@Component({
  selector: 'app-marcas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './marcas-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './marcas-dialog.css'],
})
export class MarcasDialog {
  marca: Pick<Marca, 'nombre' | 'idEmpresa' | 'estado'>;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<MarcasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MarcasDialogData,
  ) {
    this.marca = data.marca
      ? { nombre: data.marca.nombre, idEmpresa: data.marca.idEmpresa, estado: data.marca.estado }
      : { nombre: '', idEmpresa: data.empresas[0]?.id || '', estado: true };
  }

  guardar(): void {
    const nombre = this.marca.nombre.trim();
    if (!nombre) { this.error = 'El nombre de la marca es obligatorio.'; return; }
    if (!this.marca.idEmpresa) { this.error = 'Selecciona la empresa de la marca.'; return; }
    if (this.data.existentes.some(actual => actual.idEmpresa === this.marca.idEmpresa && actual.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      this.error = 'Ya existe una marca con ese nombre en la empresa seleccionada.';
      return;
    }
    this.dialogRef.close({ ...this.marca, nombre });
  }
}
