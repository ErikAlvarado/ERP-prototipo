import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AlmacenAdministracion,
  EmpresaAdministracion,
} from '../../../../administracion/administracion-datos';
import { AnaquelCatalogo, normalizarNombreAnaquel } from '../../anaqueles-catalogo';

export interface AnaquelesDialogData {
  mode: 'add' | 'edit';
  anaquel?: AnaquelCatalogo;
  empresas: EmpresaAdministracion[];
  almacenes: AlmacenAdministracion[];
  existentes: AnaquelCatalogo[];
}

@Component({
  selector: 'app-anaqueles-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './anaqueles-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './anaqueles-dialog.css'],
})
export class AnaquelesDialog {
  anaquel: Omit<AnaquelCatalogo, 'id'>;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<AnaquelesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AnaquelesDialogData,
  ) {
    const empresa = data.empresas.find(actual => actual.estado) || data.empresas[0];
    const almacen = data.almacenes.find(actual =>
      actual.estado && actual.empresaId === empresa?.id);
    this.anaquel = data.anaquel
      ? {
          idEmpresa: Number(data.anaquel.idEmpresa),
          idAlmacen: Number(data.anaquel.idAlmacen),
          nombre: data.anaquel.nombre,
          estado: data.anaquel.estado,
        }
      : {
          idEmpresa: Number(empresa?.id) || 0,
          idAlmacen: Number(almacen?.id) || 0,
          nombre: '',
          estado: true,
        };
  }

  get almacenesDisponibles(): AlmacenAdministracion[] {
    return this.data.almacenes.filter(almacen =>
      Number(almacen.empresaId) === Number(this.anaquel.idEmpresa)
      && (almacen.estado || Number(almacen.id) === Number(this.anaquel.idAlmacen)));
  }

  cambiarEmpresa(): void {
    const actual = this.almacenesDisponibles.find(almacen =>
      Number(almacen.id) === Number(this.anaquel.idAlmacen));
    if (!actual) this.anaquel.idAlmacen = Number(this.almacenesDisponibles[0]?.id) || 0;
    this.error = '';
  }

  guardar(): void {
    this.error = '';
    const nombre = this.anaquel.nombre.trim();
    if (!nombre) {
      this.error = 'El nombre o código del anaquel es obligatorio.';
      return;
    }
    if (!this.anaquel.idEmpresa || !this.anaquel.idAlmacen) {
      this.error = 'Selecciona la empresa y el almacén del anaquel.';
      return;
    }
    const almacen = this.data.almacenes.find(actual =>
      Number(actual.id) === Number(this.anaquel.idAlmacen)
      && Number(actual.empresaId) === Number(this.anaquel.idEmpresa));
    if (!almacen) {
      this.error = 'El almacén seleccionado no pertenece a la empresa.';
      return;
    }
    const duplicado = this.data.existentes.some(actual =>
      Number(actual.idAlmacen) === Number(this.anaquel.idAlmacen)
      && normalizarNombreAnaquel(actual.nombre) === normalizarNombreAnaquel(nombre));
    if (duplicado) {
      this.error = 'Ya existe un anaquel con ese nombre en el almacén seleccionado.';
      return;
    }
    this.dialogRef.close({ ...this.anaquel, nombre });
  }
}
