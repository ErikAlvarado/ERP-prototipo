import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { AlmacenAdministracion, EmpresaAdministracion } from '../../../administracion-datos';

export interface AlmacenesDialogData {
  mode: 'add' | 'edit';
  almacen?: AlmacenAdministracion;
  empresas: EmpresaAdministracion[];
}

@Component({
  selector: 'app-almacenes-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './almacenes-dialog.html',
  styleUrl: './almacenes-dialog.css',
})
export class AlmacenesDialog {
  almacen: AlmacenAdministracion;

  constructor(
    private dialogRef: MatDialogRef<AlmacenesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AlmacenesDialogData,
  ) {
    this.almacen = data.almacen ? { ...data.almacen } : {
      id: '', empresaId: data.empresas[0]?.id || '', nombre: '', direccion: '', principal: false,
      estado: true, fechaCreacion: '', fechaActualizacion: '',
    };
  }

  get puedeGuardar(): boolean { return !!this.almacen.nombre.trim() && !!this.almacen.empresaId; }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({ ...this.almacen, nombre: this.almacen.nombre.trim(), direccion: this.almacen.direccion.trim() });
  }
}
