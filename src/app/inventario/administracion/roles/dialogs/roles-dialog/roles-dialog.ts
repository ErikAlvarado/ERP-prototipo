import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { EmpresaAdministracion, PermisoAdministracion, RolAdministracion } from '../../../administracion-datos';

export interface RolDialogData {
  mode: 'add' | 'edit';
  rol?: RolAdministracion;
  empresas: EmpresaAdministracion[];
  permisos: PermisoAdministracion[];
  roles: RolAdministracion[];
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
      creadoPorUsuarioId: '', actualizadoPorUsuarioId: '',
    };
  }

  get nombreDuplicado(): boolean {
    const nombre = this.rol.nombre.trim().toLocaleLowerCase();
    return this.data.roles.some(rol =>
      rol.id !== this.rol.id &&
      rol.empresaId === this.rol.empresaId &&
      rol.nombre.trim().toLocaleLowerCase() === nombre);
  }

  get puedeGuardar(): boolean { return !!this.rol.nombre.trim() && !!this.rol.empresaId && !this.nombreDuplicado; }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({ ...this.rol, nombre: this.rol.nombre.trim(), descripcion: this.rol.descripcion.trim() });
  }
}
