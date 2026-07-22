import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import {
  AlmacenAdministracion, EmpresaAdministracion, RolAdministracion, UsuarioAdministracion,
} from '../../../administracion-datos';

export interface UsuarioDialogData {
  mode: 'add' | 'edit';
  usuario?: UsuarioAdministracion;
  empresas: EmpresaAdministracion[];
  roles: RolAdministracion[];
  almacenes: AlmacenAdministracion[];
  emails?: string[];
}

@Component({
  selector: 'app-usuarios-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './usuarios-dialog.html',
  styleUrl: './usuarios-dialog.css',
})
export class UsuariosDialog {
  usuario: UsuarioAdministracion;
  password = '';

  constructor(
    private dialogRef: MatDialogRef<UsuariosDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UsuarioDialogData,
  ) {
    const empresaId = data.empresas[0]?.id || '';
    this.usuario = data.usuario ? { ...data.usuario, rolIds: [...data.usuario.rolIds] } : {
      id: '', empresaId, nombres: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '',
      email: '', telefono: '', estado: true, ultimoAcceso: '', intentosFallidos: 0,
      fechaBloqueo: '', almacenId: data.almacenes.find(almacen => almacen.empresaId === empresaId)?.id || '',
      rolIds: [], fechaCreacion: '', fechaActualizacion: '',
    };
  }

  get rolesDisponibles(): RolAdministracion[] {
    return this.data.roles.filter(rol => rol.empresaId === this.usuario.empresaId);
  }

  get almacenesDisponibles(): AlmacenAdministracion[] {
    return this.data.almacenes.filter(almacen => almacen.empresaId === this.usuario.empresaId);
  }

  get emailDuplicado(): boolean {
    return (this.data.emails || []).some(email => email.toLowerCase() === this.usuario.email.trim().toLowerCase());
  }

  get emailValido(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.usuario.email.trim()); }

  get passwordValido(): boolean { return this.data.mode === 'edit' ? !this.password || this.password.length >= 8 : this.password.length >= 8; }

  get puedeGuardar(): boolean {
    return !!this.usuario.empresaId && !!this.usuario.nombres.trim() && !!this.usuario.apellidoPaterno.trim() &&
      this.emailValido && !this.emailDuplicado && this.passwordValido;
  }

  cambiarEmpresa(): void {
    this.usuario.rolIds = this.usuario.rolIds.filter(id => this.rolesDisponibles.some(rol => rol.id === id));
    if (!this.almacenesDisponibles.some(almacen => almacen.id === this.usuario.almacenId)) {
      this.usuario.almacenId = this.almacenesDisponibles[0]?.id || '';
    }
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({
      ...this.usuario,
      nombres: this.usuario.nombres.trim(), apellidoPaterno: this.usuario.apellidoPaterno.trim(),
      apellidoMaterno: this.usuario.apellidoMaterno.trim(), email: this.usuario.email.trim().toLowerCase(),
      telefono: this.usuario.telefono.trim(),
    });
  }
}
