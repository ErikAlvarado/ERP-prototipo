import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { PaymentDetails, PaymentMethod } from '../../models/venta.model';

export interface PaymentDialogData {
  method: Extract<PaymentMethod, 'Tarjeta' | 'Transferencia' | 'Vales'>;
  details?: PaymentDetails;
}

@Component({
  selector: 'app-payment-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './payment-dialog.component.html',
  styleUrl: './payment-dialog.component.css',
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
  details: PaymentDetails;
  transferenciaConfirmada = false;
  private terminalTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData,
  ) {
    this.details = {
      cardBank: 'Otro', cardType: 'Débito',
      transferBank: 'SPEI / Otro', voucherCompany: 'Otra',
      ...data.details,
    };
  }

  ngOnInit(): void {
    if (this.data.method !== 'Tarjeta') return;
    this.terminalTimer = setTimeout(() => {
      this.dialogRef.close({
        cardType: 'Débito',
        authorizationCode: `SIM-${Date.now()}`,
      } satisfies PaymentDetails);
    }, 2400);
  }

  ngOnDestroy(): void {
    if (this.terminalTimer) clearTimeout(this.terminalTimer);
  }

  get titulo(): string {
    if (this.data.method === 'Tarjeta') return 'Pago con tarjeta';
    if (this.data.method === 'Transferencia') return 'Confirmar transferencia';
    return 'Procesar vale';
  }

  get puedeConfirmar(): boolean {
    if (this.data.method === 'Tarjeta') {
      return true;
    }
    if (this.data.method === 'Transferencia') {
      return !!this.details.transferReference?.trim() && !!this.details.transferFolio?.trim() && this.transferenciaConfirmada;
    }
    return !!this.details.voucherCompany?.trim() && !!this.details.voucherNumber?.trim();
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    if (this.data.method === 'Tarjeta') {
      this.dialogRef.close({
        cardType: 'Débito',
        authorizationCode: `SIM-${Date.now()}`,
      } satisfies PaymentDetails);
      return;
    }
    this.dialogRef.close(this.limpiar(this.details));
  }

  private limpiar(details: PaymentDetails): PaymentDetails {
    return Object.fromEntries(Object.entries(details).map(([key, value]) => [
      key, typeof value === 'string' ? value.trim() : value,
    ])) as PaymentDetails;
  }
}
