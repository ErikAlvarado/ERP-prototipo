import { Component, Inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../shared/imports/shared-imports';
import { MovimientoInventario } from '../../gestion-inventario';

@Component({
  selector: 'app-kardex-detalle',
  imports: [...SHARED_IMPORTS, CurrencyPipe, DatePipe],
  templateUrl: './kardex-detalle.html',
  styleUrl: './kardex-detalle.css',
})
export class KardexDetalle {
  constructor(@Inject(MAT_DIALOG_DATA) public movimiento: MovimientoInventario) {}
}
