import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '../../../../shared/material/importaciones-material';
import { IMPORTACIONES_MATERIAL_COMPRAS } from '../../../../shared/material/importaciones-material';
import { Estado } from '../../../../shared/components/estado/estado';
import { OrdenCompra } from '../../gestion-compras';

@Component({
  selector: 'app-detalle-orden-dialog',
  imports: [DatePipe, Estado, IMPORTACIONES_MATERIAL_COMPRAS],
  templateUrl: './detalle-orden-dialog.html',
  styleUrl: './detalle-orden-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleOrdenDialog {
  readonly orden = inject<OrdenCompra>(MAT_DIALOG_DATA);
  private readonly referencia = inject(MatDialogRef<DetalleOrdenDialog>);

  cerrar(): void {
    this.referencia.close();
  }
}
