import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IMPORTACIONES_MATERIAL_PROVEEDORES,
  MatDialogRef,
} from '../../../../shared/material/importaciones-material';

export interface NuevoProveedor {
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  contacto: string;
  correo: string;
  telefono: string;
  categoria: string;
}

@Component({
  selector: 'app-nuevo-proveedor-dialog',
  imports: [ReactiveFormsModule, IMPORTACIONES_MATERIAL_PROVEEDORES],
  templateUrl: './nuevo-proveedor-dialog.html',
  styleUrl: './nuevo-proveedor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevoProveedorDialog {
  private readonly constructorFormulario = inject(FormBuilder);
  private readonly referenciaDialogo = inject(MatDialogRef<NuevoProveedorDialog, NuevoProveedor>);

  readonly categorias = ['Tecnología', 'Papelería', 'Industrial', 'Mobiliario', 'Consumibles', 'Logística'];
  readonly formulario = this.constructorFormulario.nonNullable.group({
    razonSocial: ['', [Validators.required, Validators.minLength(3)]],
    nombreComercial: ['', [Validators.required, Validators.minLength(2)]],
    direccionFiscal: ['', [Validators.required, Validators.minLength(10)]],
    contacto: [''],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    categoria: ['Tecnología', Validators.required],
  });

  cancelar(): void {
    this.referenciaDialogo.close();
  }

  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.referenciaDialogo.close(this.formulario.getRawValue());
  }
}
