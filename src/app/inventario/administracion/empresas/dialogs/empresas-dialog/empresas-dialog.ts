import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { EmpresaAdministracion } from '../../../administracion-datos';

export interface EmpresaDialogData {
  mode: 'add' | 'edit';
  empresa?: EmpresaAdministracion;
  rfcs?: string[];
}

@Component({
  selector: 'app-empresas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './empresas-dialog.html',
  styleUrl: './empresas-dialog.css',
})
export class EmpresasDialog {
  empresa: EmpresaAdministracion;

  constructor(
    private dialogRef: MatDialogRef<EmpresasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: EmpresaDialogData,
  ) {
    this.empresa = data.empresa ? { ...data.empresa } : {
      id: '', nombre: '', razonSocial: '', rfc: '', direccion: '', telefono: '', email: '',
      estado: true, fechaCreacion: '', fechaActualizacion: '',
      creadoPorUsuarioId: '', actualizadoPorUsuarioId: '',
    };
  }

  get rfcDuplicado(): boolean {
    return (this.data.rfcs || []).some(rfc => rfc.toUpperCase() === this.empresa.rfc.trim().toUpperCase());
  }

  get rfcValido(): boolean {
    return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(this.empresa.rfc.trim());
  }

  get emailValido(): boolean {
    return !this.empresa.email.trim() ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.empresa.email.trim());
  }

  get puedeGuardar(): boolean {
    return !!this.empresa.nombre.trim() && !!this.empresa.razonSocial.trim() &&
      this.rfcValido && !this.rfcDuplicado && this.emailValido;
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    this.dialogRef.close({
      ...this.empresa,
      nombre: this.empresa.nombre.trim(), razonSocial: this.empresa.razonSocial.trim(),
      rfc: this.empresa.rfc.trim().toUpperCase(), direccion: this.empresa.direccion.trim(),
      telefono: this.empresa.telefono.trim(), email: this.empresa.email.trim().toLowerCase(),
    });
  }
}
