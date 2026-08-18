import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { AlmacenAdministracion, EmpresaAdministracion } from '../../../administracion-datos';
import { CajaAdministracion } from '../../cajas';

export interface CajasDialogData {
  mode: 'add' | 'edit';
  caja?: CajaAdministracion;
  empresas: EmpresaAdministracion[];
  almacenes: AlmacenAdministracion[];
  cajas: CajaAdministracion[];
}

@Component({
  selector: 'app-cajas-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './cajas-dialog.html',
  styleUrl: './cajas-dialog.css',
})
export class CajasDialog {
  caja: CajaAdministracion;

  constructor(
    private dialogRef: MatDialogRef<CajasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CajasDialogData,
  ) {
    const empresaId = data.empresas[0]?.id || '';
    this.caja = data.caja ? { ...data.caja } : {
      id: '', empresaId, almacenId: data.almacenes.find(item => item.empresaId === empresaId)?.id || '',
      codigo: '', nombre: '', estatus: 'Disponible', activa: true,
      fechaCreacion: '', fechaActualizacion: '',
    };
  }

  get almacenesEmpresa(): AlmacenAdministracion[] {
    return this.data.almacenes.filter(item => item.empresaId === this.caja.empresaId && (item.estado || item.id === this.caja.almacenId));
  }

  get codigoDuplicado(): boolean {
    const codigo = this.caja.codigo.trim().toLocaleLowerCase();
    return !!codigo && this.data.cajas.some(item => item.id !== this.caja.id &&
      item.empresaId === this.caja.empresaId && item.codigo.trim().toLocaleLowerCase() === codigo);
  }

  get puedeGuardar(): boolean {
    return !!this.caja.empresaId && !!this.caja.almacenId && !!this.caja.codigo.trim() && !this.codigoDuplicado;
  }

  cambiarEmpresa(): void {
    if (!this.almacenesEmpresa.some(item => item.id === this.caja.almacenId)) {
      this.caja.almacenId = this.almacenesEmpresa[0]?.id || '';
    }
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    const codigo = this.caja.codigo.trim().toLocaleUpperCase();
    this.dialogRef.close({ ...this.caja, codigo, nombre: this.caja.nombre || codigo,
      estatus: this.caja.activa ? 'Disponible' : 'Fuera de servicio' });
  }
}
