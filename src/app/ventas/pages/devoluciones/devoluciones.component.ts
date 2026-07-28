import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HistorialService } from '../../services/historial.service';
import { DevolucionService } from '../../services/devolucion.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Venta } from '../../models/venta.model';
import { DevolucionReason, DevolucionPriority } from '../../models/devolucion.model';

@Component({
  selector: 'app-devoluciones-init',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatInputModule, MatSelectModule],
  template: `
    <div class="returns-init-page animate-fade-in">
      <!-- Search Folio Card -->
      <div class="search-folio-card card-premium">
        <h3><i class="fa-solid fa-receipt text-accent"></i> Localizar Venta</h3>
        <p class="text-secondary text-xs mb-3">Ingrese el folio del ticket de venta para iniciar la solicitud de devolución.</p>
        
        <div class="search-row">
          <input matInput
            type="text" 
            placeholder="Folio de venta (ej. F-10003)..." 
            class="form-control" 
            [(ngModel)]="searchFolio"
            (keydown.enter)="searchSale()"
          />
          <button class="btn-premium btn-accent" (click)="searchSale()" [disabled]="isValidating">
            <span *ngIf="!isValidating"><i class="fa-solid fa-magnifying-glass"></i> Buscar Venta</span>
            <span *ngIf="isValidating"><i class="fa-solid fa-spinner fa-spin"></i> Validando...</span>
          </button>
        </div>
      </div>

      <!-- Return Form Details (Shown only when sale is loaded) -->
      <div class="return-form-container" *ngIf="matchedSale">
        <div class="form-grid-layout">
          
          <!-- Left Column: Sale Summary & Item Selector -->
          <div class="sale-summary-column card-premium">
            <div class="column-head">
              <h3>Resumen de Venta</h3>
              <span class="sale-folio-badge font-bold">{{ matchedSale.folio }}</span>
            </div>
            
            <div class="meta-info-grid">
              <div class="meta-field">
                <span class="label">Fecha y Hora:</span>
                <span class="val font-semibold">{{ matchedSale.date }} {{ matchedSale.time }}</span>
              </div>
              <div class="meta-field">
                <span class="label">Cliente:</span>
                <span class="val">{{ matchedSale.client.name }}</span>
              </div>
              <div class="meta-field">
                <span class="label">Cajero:</span>
                <span class="val">{{ matchedSale.cashier }}</span>
              </div>
              <div class="meta-field">
                <span class="label">Método Pago:</span>
                <span class="val">{{ matchedSale.paymentMethod }}</span>
              </div>
              <div class="meta-field">
                <span class="label">Importe Venta:</span>
                <span class="val font-semibold text-accent">\${{ matchedSale.total | number:'1.2-2' }}</span>
              </div>
              <div class="meta-field">
                <span class="label">Estado Actual:</span>
                <span class="val font-semibold">{{ matchedSale.status }}</span>
              </div>
            </div>

            <div class="divider-dashed"></div>
            
            <h4>Productos Disponibles para Devolución</h4>
            <p class="text-secondary text-xs mb-3">Marque los casilleros de los artículos que el cliente presentará para su reintegro.</p>
            
            <div class="items-selection-list">
              <div class="selection-item" *ngFor="let item of returnCandidates">
                <div class="chk-wrap">
                  <mat-checkbox [(ngModel)]="item.selected" (change)="onCandidateSelectChange()" aria-label="Seleccionar producto para devolución"></mat-checkbox>
                </div>
                <div class="item-name-wrap">
                  <span class="item-name font-semibold">{{ item.product.name }}</span>
                  <span class="item-meta">SKU: {{ item.product.sku }} | Comprado: {{ item.purchasedQty }} {{ item.product.unit }}</span>
                </div>
                
                <div class="qty-select-wrap" *ngIf="item.selected">
                  <label>Cant. a Devolver:</label>
                  <mat-select [(ngModel)]="item.returnQty" class="form-control qty-select">
                    <mat-option *ngFor="let q of getQtyArray(item.purchasedQty)" [value]="q">{{ q }}</mat-option>
                  </mat-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Return Request Properties -->
          <div class="return-details-column card-premium">
            <h3>Detalles de la Solicitud</h3>
            
            <!-- Reason Selector -->
            <div class="form-group">
              <label for="ret-reason">Motivo de la Devolución *</label>
              <mat-select id="ret-reason" class="form-control" [(ngModel)]="returnReason">
                <mat-option *ngFor="let r of reasons" [value]="r">{{ r }}</mat-option>
              </mat-select>
            </div>

            <!-- Priority -->
            <div class="form-group">
              <label for="ret-priority">Prioridad de Revisión *</label>
              <mat-select id="ret-priority" class="form-control" [(ngModel)]="returnPriority">
                <mat-option value="Baja">Baja (Revisión de rutina)</mat-option>
                <mat-option value="Media">Media (Validación estándar)</mat-option>
                <mat-option value="Alta">Alta (Garantías urgentes / Quejas)</mat-option>
              </mat-select>
            </div>

            <!-- Comment -->
            <div class="form-group">
              <label for="ret-comment">Comentarios / Diagnóstico Inicial</label>
              <textarea matInput
                id="ret-comment" 
                class="form-control" 
                rows="4" 
                placeholder="Describa a detalle la condición del producto o motivo del reclamo..."
                [(ngModel)]="returnComment"
              ></textarea>
            </div>

            <!-- Info Alert -->
            <div class="alert-info-box">
              <i class="fa-solid fa-circle-info"></i>
              <p>Esta acción generará una solicitud de validación. La existencia física no se modificará hasta que sea revisada en Gestión de Devoluciones y validada por el Almacén.</p>
            </div>

            <!-- Submit Button -->
            <button 
              class="btn-premium btn-success submit-return-btn font-bold"
              [disabled]="!canSubmit()"
              (click)="submitReturnRequest()"
            >
              <i class="fa-solid fa-paper-plane"></i> ENVIAR SOLICITUD DE DEVOLUCIÓN
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .returns-init-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .search-folio-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-row {
      display: flex;
      gap: 12px;
      max-width: 550px;
      
      input {
        height: 44px;
      }

      button {
        height: 44px;
        padding: 0 20px;
        flex-shrink: 0;
      }
    }

    /* Return Form Layout */
    .return-form-container {
      animation: fadeIn 0.3s ease;
    }

    .form-grid-layout {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
    }

    .sale-summary-column, .return-details-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px !important;
    }

    .column-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { font-size: 1.05rem; }
    }

    .sale-folio-badge {
      background-color: var(--accent-light);
      color: var(--accent-color);
      font-size: 0.85rem;
      padding: 4px 10px;
      border-radius: var(--border-radius-sm);
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-weight: 700;
    }

    .meta-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background-color: var(--bg-color);
      padding: 14px;
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
    }

    .meta-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8rem;
      .label { color: var(--text-secondary); }
      .val { color: var(--text-primary); }
    }

    .divider-dashed {
      border-top: 1px dashed var(--border-color);
      margin: 8px 0;
    }

    .mb-3 { margin-bottom: 12px; }

    .items-selection-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .selection-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      transition: border-color 0.2s;

      &:hover {
        border-color: var(--primary-color);
      }
    }

    .chk-wrap {
      display: flex;
      align-items: center;
      
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--success-color);
      }
    }

    .item-name-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      .item-name { font-size: 0.88rem; }
      .item-meta { font-size: 0.72rem; color: var(--text-secondary); }
    }

    .qty-select-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      
      .qty-select {
        width: 60px;
        height: 32px;
        padding: 2px 6px;
      }
    }

    .alert-info-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background-color: var(--accent-light);
      border: 1px solid rgba(2, 132, 199, 0.15);
      border-radius: var(--border-radius-sm);
      color: var(--accent-color);
      font-size: 0.78rem;
      line-height: 1.4;
      margin-top: 10px;

      i { font-size: 1rem; margin-top: 2px; }
    }

    .submit-return-btn {
      width: 100%;
      height: 48px;
      border-radius: var(--border-radius-sm);
      font-size: 0.95rem;
    }

    @media (max-width: 1024px) {
      .form-grid-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DevolucionesComponent implements OnInit {
  searchFolio = '';
  isValidating = false;
  matchedSale: Venta | null = null;

  // Selection form
  returnCandidates: {
    product: any;
    purchasedQty: number;
    selected: boolean;
    returnQty: number;
  }[] = [];

  reasons: DevolucionReason[] = [
    'Producto defectuoso',
    'Producto equivocado',
    'Error de captura',
    'Cambio por garantía',
    'Cliente cambió de opinión',
    'Producto incompleto',
    'Producto dañado',
    'Error de precio',
    'Otro'
  ];

  returnReason: DevolucionReason = 'Producto defectuoso';
  returnPriority: DevolucionPriority = 'Media';
  returnComment = '';

  constructor(
    private historialService: HistorialService,
    private devolucionService: DevolucionService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {}

  searchSale(): void {
    const folio = this.searchFolio.toUpperCase().trim();
    if (!folio) {
      this.notificationService.warning('Ingrese un folio válido.');
      return;
    }

    this.isValidating = true;
    this.matchedSale = null;
    this.returnCandidates = [];

    setTimeout(() => {
      this.historialService.getSaleByFolio(folio).subscribe(sale => {
        this.isValidating = false;
        if (sale) {
          if (sale.status === 'Cancelada') {
            this.notificationService.error('No se puede iniciar devoluciones sobre una venta Cancelada.');
            return;
          }
          
          this.matchedSale = sale;
          
          // Map candidate items
          this.returnCandidates = sale.items.map(item => ({
            product: item.product,
            purchasedQty: item.quantity,
            selected: false,
            returnQty: 1
          }));

          this.notificationService.success(`Venta localizada: ${sale.folio}`);
        } else {
          this.notificationService.error(`No se encontró ninguna venta con folio ${folio}`);
        }
      });
    }, 700);
  }

  getQtyArray(qty: number): number[] {
    const arr = [];
    for (let i = 1; i <= qty; i++) {
      arr.push(i);
    }
    return arr;
  }

  onCandidateSelectChange(): void {
    // Basic triggers
  }

  canSubmit(): boolean {
    const anySelected = this.returnCandidates.some(c => c.selected);
    return anySelected && !!this.returnReason;
  }

  submitReturnRequest(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.status !== 'Online') {
      this.notificationService.error('Inicie sesión para continuar.');
      return;
    }

    const selectedItems = this.returnCandidates
      .filter(c => c.selected)
      .map(c => ({
        product: c.product,
        // Ensure quantity is parsed as integer
        quantity: parseInt(c.returnQty as any, 10)
      }));

    if (selectedItems.length === 0) {
      this.notificationService.warning('Seleccione al menos un producto.');
      return;
    }

    this.devolucionService.initiateReturn(
      this.matchedSale!.folio,
      selectedItems,
      this.returnReason,
      user.name,
      this.returnPriority,
      this.returnComment
    ).subscribe(res => {
      if (res) {
        // Reset form
        this.matchedSale = null;
        this.searchFolio = '';
        this.returnCandidates = [];
        this.returnReason = 'Producto defectuoso';
        this.returnPriority = 'Media';
        this.returnComment = '';
      }
    });
  }
}
