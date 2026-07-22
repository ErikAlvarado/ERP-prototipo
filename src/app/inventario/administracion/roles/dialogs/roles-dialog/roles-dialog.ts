import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { EmpresaAdministracion, PermisoAdministracion, RolAdministracion } from '../../../administracion-datos';

export interface RolDialogData {
  mode: 'add' | 'edit';
  rol?: RolAdministracion;
  empresas: EmpresaAdministracion[];
  permisos: PermisoAdministracion[];
  nombres?: string[];
}

@Component({
  selector: 'app-roles-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './roles-dialog.html',
  styleUrl: './roles-dialog.css',
})
export class RolesDialog {
  rol: RolAdministracion;

  constructor(
    private dialogRef: MatDialogRef<RolesDialog>,
    @Inject(MAT_DIALOG_DATA) public data: RolDialogData,
  ) {
    this.rol = data.rol ? { ...data.rol, permisoIds: [...data.rol.permisoIds] } : {
      id: '', empresaId: data.empresas[0]?.id || '', nombre: '', descripcion: '', estado: true,
      permisoIds: [], fechaCreacion: '', fechaActualizacion: '',
    };
  }

  get nombreDuplicado(): boolean {
    return (this.data.nombres || []).some(nombre => nombre.toLowerCase() === this.rol.nombre.trim().toLowerCase());
  }

  get puedeGuardar(): boolean { return !!this.rol.nombre.trim() && !!this.rol.empresaId && !this.nombreDuplicado; }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({ ...this.rol, nombre: this.rol.nombre.trim(), descripcion: this.rol.descripcion.trim() });
  }
}
