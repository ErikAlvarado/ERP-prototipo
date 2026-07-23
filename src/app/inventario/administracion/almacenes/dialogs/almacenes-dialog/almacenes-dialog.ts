import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { AlmacenAdministracion, EmpresaAdministracion } from '../../../administracion-datos';

export interface AlmacenesDialogData {
  mode: 'add' | 'edit';
  almacen?: AlmacenAdministracion;
  empresas: EmpresaAdministracion[];
  almacenes: AlmacenAdministracion[];
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
      creadoPorUsuarioId: '', actualizadoPorUsuarioId: '',
    };
  }

  get nombreDuplicado(): boolean {
    const nombre = this.almacen.nombre.trim().toLocaleLowerCase();
    return this.data.almacenes.some(almacen =>
      almacen.id !== this.almacen.id &&
      almacen.empresaId === this.almacen.empresaId &&
      almacen.nombre.trim().toLocaleLowerCase() === nombre);
  }

  get principalExistente(): AlmacenAdministracion | undefined {
    return this.data.almacenes.find(almacen =>
      almacen.id !== this.almacen.id &&
      almacen.empresaId === this.almacen.empresaId &&
      almacen.principal &&
      almacen.estado);
  }

  get puedeGuardar(): boolean {
    return !!this.almacen.nombre.trim() && !!this.almacen.empresaId && !this.nombreDuplicado;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({ ...this.almacen, nombre: this.almacen.nombre.trim(), direccion: this.almacen.direccion.trim() });
  }
}
