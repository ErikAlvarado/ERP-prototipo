import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { EmpresaUnidadOption, Unidad } from '../../unidades';

export interface UnidadesDialogData {
  mode: 'add' | 'edit';
  unidad?: Unidad;
  empresas: EmpresaUnidadOption[];
  existentes: { nombre: string; abreviatura: string; idEmpresa: string }[];
}

@Component({
  selector: 'app-unidades-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './unidades-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './unidades-dialog.css'],
})
export class UnidadesDialog {
  unidad: Pick<Unidad, 'nombre' | 'abreviatura' | 'idEmpresa' | 'permitirDecimales'>;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<UnidadesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UnidadesDialogData,
  ) {
    this.unidad = data.unidad
      ? { nombre: data.unidad.nombre, abreviatura: data.unidad.abreviatura, idEmpresa: data.unidad.idEmpresa, permitirDecimales: data.unidad.permitirDecimales }
      : { nombre: '', abreviatura: '', idEmpresa: data.empresas[0]?.id || '', permitirDecimales: false };
  }

  guardar(): void {
    const nombre = this.unidad.nombre.trim();
    const abreviatura = this.unidad.abreviatura.trim();
    if (!nombre || !abreviatura) { this.error = 'Nombre y abreviatura son obligatorios.'; return; }
    if (!this.unidad.idEmpresa) { this.error = 'Selecciona la empresa de la unidad.'; return; }
    const existentesEmpresa = this.data.existentes.filter(actual => actual.idEmpresa === this.unidad.idEmpresa);
    if (existentesEmpresa.some(actual => actual.nombre.toLowerCase() === nombre.toLowerCase())) { this.error = 'Ya existe una unidad con ese nombre en la empresa seleccionada.'; return; }
    if (existentesEmpresa.some(actual => actual.abreviatura.toLowerCase() === abreviatura.toLowerCase())) { this.error = 'Ya existe una unidad con esa abreviatura en la empresa seleccionada.'; return; }
    this.dialogRef.close({ ...this.unidad, nombre, abreviatura });
  }
}
