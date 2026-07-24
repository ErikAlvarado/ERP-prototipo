import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Venta } from '../../models/venta.model';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="ticket-modal-card" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="ticket-header">
          <div class="success-ring" [class.quote-ring]="sale.operationType === 'Cotización'">
            <i [class]="sale.operationType === 'Cotización' ? 'fa-solid fa-file-invoice-dollar' : 'fa-solid fa-check'"></i>
          </div>
          <h3>{{ sale.operationType === 'Cotización' ? '¡Cotización Generada!' : '¡Venta Completada!' }}</h3>
          <p>{{ sale.operationType === 'Cotización' ? 'Documento de cotización emitido correctamente.' : 'La transacción ha sido registrada de forma segura.' }}</p>
        </div>

        <!-- Ticket Body wrapper -->
        <div class="ticket-body-container" id="printable-ticket">
          <div class="thermal-ticket">
            <!-- Brand & Company Info -->
            <div class="brand-section">
              <h2 class="font-bold">ZYRO POS</h2>
              <p class="company-sub">SISTEMA POS PROFESIONAL</p>
              <p class="company-address">Av. Insurgentes Sur 1420, Col. Juárez, CDMX</p>
              <p class="company-rfc">RFC: ZYR260101XYZ | Tel: (55) 5555-9900</p>
            </div>

            <!-- Operation Type Banner -->
            <div class="divider-dashed"></div>
            <div class="op-type-banner text-center font-bold" [class.is-quote]="sale.operationType === 'Cotización'">
              *** {{ sale.operationType === 'Cotización' ? 'COTIZACIÓN (NO FISCAL)' : 'TICKET DE VENTA' }} ***
            </div>

            <!-- Metadata Section -->
            <div class="divider-dashed"></div>
            <div class="meta-section">
              <div class="meta-row">
                <span>FOLIO:</span>
                <span class="font-bold">{{ sale.folio }}</span>
              </div>
              <div class="meta-row">
                <span>FECHA:</span>
                <span>{{ sale.date }} {{ sale.time }}</span>
              </div>
              <div class="meta-row">
                <span>CAJA / TURNO:</span>
                <span>CAJA-01 (MATUTINO)</span>
              </div>
              <div class="meta-row">
                <span>EMPLEADO / CAJERO:</span>
                <span>EMP-001 - {{ sale.cashier }}</span>
              </div>
              <div class="meta-row">
                <span>CLIENTE:</span>
                <span class="font-semibold">{{ sale.client.name }}</span>
              </div>
              <div class="meta-row" *ngIf="sale.client.rfc && sale.client.rfc !== 'XAXX010101000'">
                <span>RFC CLIENTE:</span>
                <span>{{ sale.client.rfc }}</span>
              </div>
            </div>

            <!-- Itemized Products Section -->
            <div class="divider-dashed"></div>
            <div class="products-section">
              <div class="product-item-header">
                <span class="col-desc">Descripción</span>
                <span class="col-qty">Cant</span>
                <span class="col-price">P.U.</span>
                <span class="col-sub">Importe</span>
              </div>
              <div class="divider-thin"></div>
              
              <div class="product-item" *ngFor="let item of sale.items">
                <div class="prod-row">
                  <span class="prod-name font-semibold">{{ item.product.name }}</span>
                </div>
                <div class="prod-row-details">
                  <span class="col-desc text-secondary-sm">SKU: {{ item.product.sku }}</span>
                  <span class="col-qty text-right">{{ item.quantity }}</span>
                  <span class="col-price text-right">\${{ item.product.price | number:'1.2-2' }}</span>
                  <span class="col-sub text-right font-bold">\${{ item.subtotal | number:'1.2-2' }}</span>
                </div>
                <div class="prod-discount-row" *ngIf="item.discount > 0">
                  <span>↳ Descuento Catálogo ({{ item.discount }}%)</span>
                  <span>-\${{ (item.product.price * item.quantity * (item.discount / 100)) | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Summary Totals Section -->
            <div class="divider-dashed"></div>
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>\${{ sale.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="total-row" *ngIf="sale.discount > 0">
                <span>Descuento Aplicado:</span>
                <span>-\${{ sale.discount | number:'1.2-2' }}</span>
              </div>
              <div class="total-row">
                <span>IVA (16%):</span>
                <span>\${{ sale.tax | number:'1.2-2' }}</span>
              </div>
              <div class="divider-thin"></div>
              <div class="total-row grand-total font-bold">
                <span>TOTAL:</span>
                <span>\${{ sale.total | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- Payment Details Section -->
            <div class="divider-dashed"></div>
            <div class="payment-details-section" *ngIf="sale.operationType !== 'Cotización'">
              <p class="payment-method font-semibold text-center">FORMA DE PAGO: {{ sale.paymentMethod | uppercase }}</p>
              
              <!-- Cash Payment breakdown -->
              <div class="payment-extra" *ngIf="sale.paymentMethod === 'Efectivo' && sale.paymentDetails">
                <div class="meta-row" *ngIf="sale.paymentDetails.cashReceived">
                  <span>Efectivo Recibido:</span>
                  <span>\${{ sale.paymentDetails.cashReceived | number:'1.2-2' }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.changeGiven !== undefined">
                  <span>Cambio Entregado:</span>
                  <span class="font-bold">\${{ sale.paymentDetails.changeGiven | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Card Payment breakdown -->
              <div class="payment-extra" *ngIf="sale.paymentMethod === 'Tarjeta' && sale.paymentDetails">
                <div class="meta-row" *ngIf="sale.paymentDetails.cardBank">
                  <span>Banco Emisor:</span>
                  <span>{{ sale.paymentDetails.cardBank }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.cardType">
                  <span>Tipo de Tarjeta:</span>
                  <span>{{ sale.paymentDetails.cardType }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.cardHolderName">
                  <span>Titular:</span>
                  <span>{{ sale.paymentDetails.cardHolderName }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.cardLast4">
                  <span>Últimos 4 Dígitos:</span>
                  <span>**** {{ sale.paymentDetails.cardLast4 }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.authorizationCode">
                  <span>N° Autorización:</span>
                  <span>{{ sale.paymentDetails.authorizationCode }}</span>
                </div>
              </div>

              <!-- Transfer Payment breakdown -->
              <div class="payment-extra" *ngIf="sale.paymentMethod === 'Transferencia' && sale.paymentDetails">
                <div class="meta-row" *ngIf="sale.paymentDetails.transferBank">
                  <span>Banco:</span>
                  <span>{{ sale.paymentDetails.transferBank }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.transferReference">
                  <span>Referencia:</span>
                  <span>{{ sale.paymentDetails.transferReference }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.transferFolio">
                  <span>Folio Transferencia:</span>
                  <span>{{ sale.paymentDetails.transferFolio }}</span>
                </div>
              </div>

              <!-- Voucher Payment breakdown -->
              <div class="payment-extra" *ngIf="sale.paymentMethod === 'Vales' && sale.paymentDetails">
                <div class="meta-row" *ngIf="sale.paymentDetails.voucherCompany">
                  <span>Empresa Emisora:</span>
                  <span>{{ sale.paymentDetails.voucherCompany }}</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.voucherNumber">
                  <span>N° de Vale:</span>
                  <span>{{ sale.paymentDetails.voucherNumber }}</span>
                </div>
              </div>

              <!-- Credit Payment breakdown -->
              <div class="payment-extra" *ngIf="sale.paymentMethod === 'Crédito' && sale.paymentDetails">
                <div class="meta-row" *ngIf="sale.paymentDetails.creditDays">
                  <span>Días de Crédito:</span>
                  <span>{{ sale.paymentDetails.creditDays }} días</span>
                </div>
                <div class="meta-row" *ngIf="sale.paymentDetails.creditNotes">
                  <span>Observaciones:</span>
                  <span>{{ sale.paymentDetails.creditNotes }}</span>
                </div>
              </div>
            </div>

            <!-- Footer & Barcode/QR Visual Elements -->
            <div class="divider-dashed"></div>
            <div class="payment-footer">
              <p class="thanks-msg">¡GRACIAS POR SU COMPRA EN ZYRO POS!</p>
              
              <!-- Visual Barcode Simulation -->
              <div class="barcode-wrapper">
                <div class="barcode-lines">
                  <span *ngFor="let width of barcodePattern" [style.width.px]="width" class="bar"></span>
                </div>
                <span class="barcode-text">{{ sale.folio }}</span>
              </div>

              <!-- Visual QR Code Simulation -->
              <div class="qr-wrapper">
                <div class="qr-code">
                  <div class="qr-pixel-row" *ngFor="let row of qrPattern">
                    <span 
                      *ngFor="let col of row" 
                      [class]="'qr-pixel ' + (col ? 'qr-dark' : 'qr-light')"
                    ></span>
                  </div>
                </div>
                <span class="qr-caption">Timbre de Verificación SAT</span>
              </div>

              <p class="footer-msg">
                Comprobante emitido por ZYRO POS. Para facturación electrónica visite facturas.zyropos.com.mx dentro del mes en curso.
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="ticket-actions">
          <button class="btn-premium btn-secondary" (click)="printTicket()">
            <i class="fa-solid fa-print"></i> Imprimir Comprobante
          </button>
          <button class="btn-premium btn-accent" (click)="downloadPdf()">
            <i class="fa-solid fa-file-pdf"></i> Descargar PDF
          </button>
          <button class="btn-premium btn-primary close-btn" (click)="close()">
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .ticket-modal-card {
      background: var(--panel-bg);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-premium);
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ticket-header {
      padding: 20px 20px 10px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;

      .success-ring {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: var(--success-light);
        color: var(--success-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        margin-bottom: 4px;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);

        &.quote-ring {
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }
      }

      h3 {
        font-size: 1.25rem;
        color: var(--text-primary);
      }

      p {
        font-size: 0.82rem;
        color: var(--text-secondary);
      }
    }

    .ticket-body-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px 24px;
    }

    .thermal-ticket {
      background: #fafafa;
      color: #111111;
      padding: 22px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.82rem;
      border-radius: 4px;
    }

    .brand-section {
      text-align: center;
      margin-bottom: 10px;
      h2 {
        font-size: 1.25rem;
        letter-spacing: 0.08em;
        margin-bottom: 2px;
      }
    }

    .company-sub { font-size: 0.72rem; letter-spacing: 0.08em; opacity: 0.85; margin-bottom: 4px; }
    .company-address, .company-rfc { font-size: 0.68rem; opacity: 0.8; }

    .op-type-banner {
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      padding: 4px 0;
      color: #1e293b;
      
      &.is-quote {
        color: #2563eb;
        background-color: #eff6ff;
        border-radius: 4px;
      }
    }

    .divider-dashed {
      border-top: 1px dashed #6b7280;
      margin: 10px 0;
    }

    .divider-thin {
      border-top: 1px solid #d1d5db;
      margin: 6px 0;
    }

    .meta-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      span:first-child {
        opacity: 0.75;
      }
    }

    .products-section {
      display: flex;
      flex-direction: column;
    }

    .product-item-header {
      display: flex;
      font-weight: bold;
      span {
        font-size: 0.76rem;
      }
    }

    .product-item {
      padding: 6px 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .prod-row {
      display: flex;
      justify-content: space-between;
    }

    .prod-row-details {
      display: flex;
    }

    .col-desc { flex: 2.2; text-align: left; }
    .col-qty { flex: 0.6; text-align: right; }
    .col-price { flex: 1; text-align: right; }
    .col-sub { flex: 1.2; text-align: right; }

    .text-secondary-sm {
      font-size: 0.72rem;
      opacity: 0.65;
    }

    .prod-discount-row {
      display: flex;
      justify-content: space-between;
      color: #dc2626;
      font-size: 0.74rem;
      padding-left: 10px;
    }

    .totals-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .grand-total {
      font-size: 1.05rem;
    }

    .payment-details-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .payment-extra {
      margin-top: 4px;
      padding-left: 8px;
      border-left: 2px solid #cbd5e1;
    }

    .payment-footer {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .thanks-msg {
      font-weight: bold;
      letter-spacing: 0.08em;
      margin: 4px 0;
    }

    /* Barcode Visual Simulation */
    .barcode-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin: 8px 0;
    }

    .barcode-lines {
      display: flex;
      align-items: center;
      height: 38px;
      gap: 2px;
      background: #000;
      padding: 4px 8px;
      border-radius: 2px;
    }

    .barcode-lines .bar {
      height: 100%;
      background: #fff;
      display: inline-block;
    }

    .barcode-text {
      font-size: 0.75rem;
      letter-spacing: 0.25em;
      font-weight: bold;
    }

    /* QR Grid Simulation */
    .qr-wrapper {
      margin: 6px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .qr-code {
      display: flex;
      flex-direction: column;
      padding: 6px;
      background-color: #ffffff;
      border: 1px solid #d1d5db;
    }

    .qr-pixel-row {
      display: flex;
    }

    .qr-pixel {
      width: 4px;
      height: 4px;
    }

    .qr-dark { background-color: #000000; }
    .qr-light { background-color: #ffffff; }

    .qr-caption {
      font-size: 0.65rem;
      opacity: 0.65;
    }

    .footer-msg {
      font-size: 0.65rem;
      opacity: 0.65;
      line-height: 1.3;
    }

    .ticket-actions {
      padding: 16px 20px;
      border-top: 1px solid var(--border-color);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .close-btn {
      grid-column: span 2;
    }

    @keyframes zoomIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class TicketComponent {
  @Input() sale!: Venta;
  @Output() closeTicket = new EventEmitter<void>();

  // Visual barcode pattern simulation
  barcodePattern: number[] = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2];

  // Visual QR code simulation grid
  qrPattern: boolean[][] = [
    [true, true, true, true, false, false, true, false, true, true, false, false, true, true, true, true],
    [true, false, false, true, false, true, true, false, false, true, false, true, true, false, false, true],
    [true, false, false, true, false, false, true, true, true, false, true, false, true, false, false, true],
    [true, true, true, true, false, true, false, false, true, true, false, false, true, true, true, true],
    [false, false, false, false, true, true, false, true, false, true, true, true, false, false, false, false],
    [true, false, true, false, true, false, true, false, false, true, false, true, false, true, false, true],
    [false, true, true, true, false, true, false, true, true, false, true, false, true, true, true, false],
    [true, false, false, true, true, false, true, true, false, true, false, true, true, false, false, true],
    [true, true, false, false, true, true, false, true, true, false, true, true, false, false, true, true],
    [false, true, true, true, false, true, false, true, true, false, true, false, true, true, true, false],
    [true, false, true, false, true, false, true, false, false, true, false, true, false, true, false, true],
    [false, false, false, false, true, true, false, true, false, true, true, true, false, false, false, false],
    [true, true, true, true, false, true, false, false, true, true, false, false, true, true, true, true],
    [true, false, false, true, false, false, true, true, true, false, true, false, true, false, false, true],
    [true, false, false, true, false, true, true, false, false, true, false, true, true, false, false, true],
    [true, true, true, true, false, false, true, false, true, true, false, false, true, true, true, true]
  ];

  constructor(private notificationService: NotificationService) {}

  printTicket(): void {
    this.notificationService.success('Enviando instrucción a impresora térmica POS...');
    setTimeout(() => {
      alert(`Imprimiendo comprobante ${this.sale.folio}... \n(Simulado en terminal POS)`);
    }, 400);
  }

  downloadPdf(): void {
    this.notificationService.success('Generando comprobante PDF...');
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Comprobante ZYRO POS - Folio: ${this.sale.folio}\nTotal: $${this.sale.total}`);
      link.setAttribute('download', `comprobante_${this.sale.folio}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.notificationService.success('Descarga iniciada.');
    }, 600);
  }

  close(): void {
    this.closeTicket.emit();
  }
}
