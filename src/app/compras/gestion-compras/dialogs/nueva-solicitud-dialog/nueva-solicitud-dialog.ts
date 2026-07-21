import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IMPORTACIONES_MATERIAL_COMPRAS,
  MatDialogRef,
} from '../../../../shared/material/importaciones-material';

/** Datos limpios que el dialogo devuelve a GestionCompras al guardar. */
export interface NuevaSolicitud {
  solicitante: string;
  departamento: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  fecha: Date;
  importe: number;
  descripcion: string;
  justificacion: string;
  archivo: File | null;
}

/**
 * Dialogo standalone para capturar una solicitud de compra.
 * Reactive Forms concentra valores, validaciones y estado del formulario.
 */
@Component({
  selector: 'app-nueva-solicitud-dialog',
  imports: [ReactiveFormsModule, IMPORTACIONES_MATERIAL_COMPRAS],
  templateUrl: './nueva-solicitud-dialog.html',
  styleUrl: './nueva-solicitud-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaSolicitudDialog {
  private readonly constructorFormulario = inject(FormBuilder);
  private readonly referencia = inject(MatDialogRef<NuevaSolicitudDialog, NuevaSolicitud>);

  readonly departamentos = ['TI', 'Administracion', 'Operaciones', 'Direccion General'];
  readonly nombreArchivo = signal('Ningun archivo seleccionado');
  private archivo: File | null = null;

  // Cada control obligatorio replica los campos principales del diseño de referencia.
  readonly formulario = this.constructorFormulario.nonNullable.group({
    solicitante: ['', [Validators.required, Validators.minLength(3)]],
    departamento: ['TI', Validators.required],
    prioridad: ['Media' as NuevaSolicitud['prioridad'], Validators.required],
    fecha: [new Date(), Validators.required],
    importe: [0, [Validators.required, Validators.min(1)]],
    descripcion: ['', [Validators.required, Validators.minLength(5)]],
    justificacion: ['', [Validators.required, Validators.minLength(10)]],
  });

  /** Conserva el archivo local para devolverlo junto con el formulario. */
  seleccionarArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.archivo = entrada.files?.item(0) ?? null;
    this.nombreArchivo.set(this.archivo?.name ?? 'Ningun archivo seleccionado');
  }

  /** Cierra sin resultado para que la pantalla principal no agregue registros. */
  cancelar(): void {
    this.referencia.close();
  }

  /** Valida, muestra errores si hacen falta y devuelve una solicitud completa. */
  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.referencia.close({ ...this.formulario.getRawValue(), archivo: this.archivo });
  }
}
