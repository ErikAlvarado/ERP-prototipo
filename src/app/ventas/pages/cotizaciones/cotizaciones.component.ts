import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../services/cotizacion.service';
import { ClienteService } from '../../services/cliente.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Cotizacion, CotizacionStatus } from '../../models/cotizacion.model';
import { Client } from '../../models/client.model';
import { Product } from '../../models/product.model';
import { MOCK_PRODUCTS } from '../../services/mock-data';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quotes-page animate-fade-in">
      <!-- Top Action Bar -->
      <div class="action-bar card-premium">
        <div class="search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Buscar por folio o cliente..." 
            class="form-control filter-input" 
            [(ngModel)]="searchFilter"
            (input)="applyFilter()"
          />
        </div>
        <button class="btn-premium btn-accent" (click)="openCreateModal()">
          <i class="fa-solid fa-file-circle-plus"></i> Nueva Cotización
        </button>
      </div>

      <!-- Main Quotes Table -->
      <div class="table-container card-premium">
        <table class="quotes-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Fecha Emisión</th>
              <th>Vencimiento</th>
              <th class="text-right">Importe Total</th>
              <th class="text-center">Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let q of filteredQuotes">
              <td class="font-bold">{{ q.folio }}</td>
              <td>{{ q.client.name }}</td>
              <td>{{ q.date }}</td>
              <td>{{ q.expirationDate }}</td>
              <td class="text-right font-semibold">\${{ q.total | number:'1.2-2' }}</td>
              <td class="text-center">
                <span [class]="'badge-custom ' + getStatusClass(q.status)">
                  {{ q.status }}
                </span>
              </td>
              <td class="text-right actions-cell">
                <button class="action-icon-btn" (click)="convertQuote(q.id)" [disabled]="q.status !== 'Vigente'" title="Convertir en Venta">
                  <i class="fa-solid fa-cart-shopping text-success"></i>
                </button>
                <button class="action-icon-btn" (click)="duplicateQuote(q.id)" title="Duplicar">
                  <i class="fa-regular fa-copy text-accent"></i>
                </button>
                <button class="action-icon-btn" (click)="openEmailModal(q)" title="Enviar por Correo">
                  <i class="fa-regular fa-envelope"></i>
                </button>
                <button class="action-icon-btn" (click)="downloadPdf(q)" title="Guardar PDF">
                  <i class="fa-regular fa-file-pdf"></i>
                </button>
                <button class="action-icon-btn" (click)="openEditModal(q)" [disabled]="q.status !== 'Vigente'" title="Editar">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="action-icon-btn" (click)="deleteQuote(q.id)" title="Eliminar">
                  <i class="fa-regular fa-trash-can text-danger"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredQuotes.length === 0">
              <td colspan="7" class="no-records-cell">
                No se encontraron cotizaciones registradas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create / Edit Quote Modal -->
      <div class="modal-overlay" *ngIf="showFormModal">
        <div class="modal-card card-premium">
          <div class="modal-head">
            <h3>{{ isEditMode ? 'Editar Cotización ' + activeQuote?.folio : 'Crear Nueva Cotización' }}</h3>
            <button class="close-modal-btn" (click)="closeFormModal()">&times;</button>
          </div>
          <div class="modal-body form-body-grid">
            <div class="form-group">
              <label>Cliente *</label>
              <select class="form-control" [(ngModel)]="formQuote.client">
                <option *ngFor="let c of clients" [ngValue]="c">{{ c.name }}</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Fecha de Vencimiento *</label>
              <input type="date" class="form-control" [(ngModel)]="formQuote.expirationDate" />
            </div>

            <!-- Item Selector -->
            <div class="form-group items-selector-section">
              <label>Agregar Producto</label>
              <div class="add-item-row">
                <select class="form-control" [(ngModel)]="selectedProductToAdd">
                  <option [ngValue]="null">Seleccione un producto...</option>
                  <option *ngFor="let p of availableProducts" [ngValue]="p">{{ p.name }} (\${{ p.price | number:'1.2-2' }})</option>
                </select>
                <input type="number" class="form-control qty-mini-input" [(ngModel)]="productQtyToAdd" min="1" placeholder="Cant" />
                <button class="btn-premium btn-accent" (click)="addItemToForm()">Agregar</button>
              </div>
            </div>

            <!-- Items Table inside form -->
            <div class="form-items-table-wrap">
              <table class="form-items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="text-center">Cant</th>
                    <th class="text-right">P.U</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-center">Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of formQuote.items; let idx = index">
                    <td>{{ item.product.name }}</td>
                    <td class="text-center">
                      <input 
                        type="number" 
                        class="form-qty-edit" 
                        [(ngModel)]="item.quantity" 
                        (ngModelChange)="recalculateFormTotals()" 
                        min="1"
                      />
                    </td>
                    <td class="text-right">\${{ item.product.price | number:'1.2-2' }}</td>
                    <td class="text-right">\${{ item.subtotal | number:'1.2-2' }}</td>
                    <td class="text-center">
                      <button class="remove-btn" (click)="removeItemFromForm(idx)">&times;</button>
                    </td>
                  </tr>
                  <tr *ngIf="formQuote.items.length === 0">
                    <td colspan="5" class="text-center text-secondary py-3">No hay productos agregados.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Form Totals -->
            <div class="form-totals-summary">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span>\${{ formQuote.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="totals-row">
                <span>IVA (16%):</span>
                <span>\${{ formQuote.tax | number:'1.2-2' }}</span>
              </div>
              <div class="divider-thin"></div>
              <div class="totals-row grand-total font-bold">
                <span>TOTAL:</span>
                <span>\${{ formQuote.total | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-secondary" (click)="closeFormModal()">Cancelar</button>
            <button class="btn-premium btn-accent" (click)="submitForm()">Guardar Cotización</button>
          </div>
        </div>
      </div>

      <!-- Email Dialog Modal Overlay -->
      <div class="modal-overlay" *ngIf="showEmailModal">
        <div class="modal-card card-premium email-card">
          <div class="modal-head">
            <h3>Enviar Cotización por Correo</h3>
            <button class="close-modal-btn" (click)="closeEmailModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="em-to">Destinatario *</label>
              <input type="email" id="em-to" class="form-control" [(ngModel)]="emailForm.to" />
            </div>
            <div class="form-group">
              <label for="em-sub">Asunto</label>
              <input type="text" id="em-sub" class="form-control" [(ngModel)]="emailForm.subject" />
            </div>
            <div class="form-group">
              <label for="em-msg">Mensaje</label>
              <textarea id="em-msg" class="form-control" rows="4" [(ngModel)]="emailForm.message"></textarea>
            </div>
            <div class="email-attachment-info">
              <i class="fa-solid fa-paperclip"></i>
              <span>Adjunto: cotizacion_{{ activeQuote?.folio }}.pdf (Simulado)</span>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-secondary" (click)="closeEmailModal()">Cancelar</button>
            <button class="btn-premium btn-accent" (click)="sendEmail()">
              <i class="fa-regular fa-paper-plane"></i> Enviar Correo
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quotes-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px !important;
    }

    .search-wrap {
      position: relative;
      width: 300px;
      display: flex;
      align-items: center;

      i {
        position: absolute;
        left: 12px;
        color: var(--text-secondary);
        opacity: 0.6;
      }

      .filter-input {
        padding-left: 36px;
        height: 40px;
      }
    }

    /* Table container */
    .table-container {
      padding: 0 !important;
      overflow-x: auto;
    }

    .quotes-table {
    }

    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .no-records-cell {
      text-align: center;
      padding: 40px !important;
      color: var(--text-secondary);
    }

    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .action-icon-btn {
      background: none;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s, color 0.2s;

      &:hover:not(:disabled) {
        background-color: var(--bg-color);
        color: var(--text-primary);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Status classes - mapped to standard design */
    .badge-vigente { background-color: #e6f4ea; color: #1e8e3e; }
    .badge-convertida { background-color: var(--accent-light); color: var(--accent-color); }
    .badge-vencida { background-color: var(--warning-light); color: var(--warning-color); }
    .badge-cancelada { background-color: var(--danger-light); color: var(--danger-color); }

    /* Modals configurations - sizes and forms */
    .modal-card {
      max-width: 680px;
      width: 100%;

      &.email-card {
        max-width: 480px;
      }
    }

    .form-body-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .form-group {
        grid-column: span 1;
      }
      .items-selector-section {
        grid-column: span 2;
      }
      .form-items-table-wrap {
        grid-column: span 2;
      }
      .form-totals-summary {
        grid-column: span 2;
      }
    }

    .add-item-row {
      display: flex;
      gap: 10px;
      align-items: center;
      
      select { flex: 2; }
      .qty-mini-input { width: 80px; }
      button { height: 40px; }
    }

    /* Form Items Table */
    .form-items-table-wrap {
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      max-height: 180px;
      overflow-y: auto;
    }

    .form-qty-edit {
      width: 50px;
      text-align: center;
      padding: 3px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background-color: var(--panel-bg);
      color: var(--text-primary);
      font-family: inherit;
    }

    .remove-btn {
      background: none;
      border: none;
      color: var(--danger-color);
      font-size: 1.2rem;
      cursor: pointer;
      font-weight: bold;
      &:hover { opacity: 0.8; }
    }

    .form-totals-summary {
      background-color: var(--bg-color);
      padding: 12px 16px;
      border-radius: var(--border-radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;

      .totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.82rem;
        color: var(--text-secondary);
      }

      .grand-total {
        font-size: 0.95rem;
        color: var(--text-primary);
      }
    }

    /* Email specific */
    .email-attachment-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--text-secondary);
      background-color: var(--bg-color);
      padding: 10px 14px;
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      margin-top: 8px;
      i { color: var(--accent-color); }
    }
  `]
})
export class CotizacionesComponent implements OnInit {
  quotes: Cotizacion[] = [];
  filteredQuotes: Cotizacion[] = [];
  searchFilter = '';

  clients: Client[] = [];
  availableProducts = MOCK_PRODUCTS;

  // Form modal state
  showFormModal = false;
  isEditMode = false;
  activeQuote: Cotizacion | null = null;
  formQuote!: {
    client: Client;
    expirationDate: string;
    items: { product: Product; quantity: number; discount: number; subtotal: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };

  selectedProductToAdd: Product | null = null;
  productQtyToAdd = 1;

  // Email modal state
  showEmailModal = false;
  emailForm = {
    to: '',
    subject: '',
    message: ''
  };

  constructor(
    private cotizacionService: CotizacionService,
    private clienteService: ClienteService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadQuotes();
    
    this.clienteService.clients$.subscribe(clients => {
      this.clients = clients;
    });
  }

  loadQuotes(): void {
    this.cotizacionService.getQuotes().subscribe(quotes => {
      this.quotes = quotes;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    const term = this.searchFilter.toLowerCase().trim();
    if (!term) {
      this.filteredQuotes = this.quotes;
      return;
    }

    this.filteredQuotes = this.quotes.filter(q => 
      q.folio.toLowerCase().includes(term) ||
      q.client.name.toLowerCase().includes(term)
    );
  }

  getStatusClass(status: CotizacionStatus): string {
    return `badge-${status.toLowerCase()}`;
  }

  // Quote Actions
  convertQuote(id: string): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.status !== 'Online') {
      this.notificationService.error('Inicie sesión para completar operaciones.');
      return;
    }

    this.notificationService.info('Convirtiendo cotización en venta...');
    this.cotizacionService.convertQuoteToSale(id, user.name).subscribe({
      next: () => {
        this.loadQuotes();
      },
      error: (err) => {
        this.notificationService.error(err.message || 'Error al convertir cotización');
      }
    });
  }

  duplicateQuote(id: string): void {
    this.cotizacionService.duplicateQuote(id).subscribe(res => {
      if (res) this.loadQuotes();
    });
  }

  deleteQuote(id: string): void {
    if (confirm('¿Está seguro de eliminar esta cotización?')) {
      this.cotizacionService.deleteQuote(id).subscribe(success => {
        if (success) this.loadQuotes();
      });
    }
  }

  downloadPdf(q: Cotizacion): void {
    this.notificationService.success(`Descargando cotizacion_${q.folio}.pdf...`);
    
    // Simulate PDF generation download
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Simulated Quote PDF for Folio: ' + q.folio);
      link.setAttribute('download', `cotizacion_${q.folio}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.notificationService.success('Descarga de cotización completada.');
    }, 800);
  }

  // Email Dialog
  openEmailModal(q: Cotizacion): void {
    this.activeQuote = q;
    this.emailForm = {
      to: q.client.email,
      subject: `Cotización de Servicios ${q.folio} - ZYRO IT`,
      message: `Estimado(a) ${q.client.name},\n\nAdjuntamos la cotización de productos solicitada con vigencia al ${q.expirationDate} por un importe total de \$${q.total.toFixed(2)} MXN.\n\nQuedamos a sus órdenes.\n\nAtentamente,\nZYRO IT - Ventas`
    };
    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.activeQuote = null;
  }

  sendEmail(): void {
    if (!this.emailForm.to) {
      this.notificationService.warning('Ingrese el destinatario.');
      return;
    }

    this.notificationService.info('Enviando correo...');
    setTimeout(() => {
      this.showEmailModal = false;
      this.notificationService.success(`Cotización enviada exitosamente a ${this.emailForm.to}`);
      this.activeQuote = null;
    }, 1200);
  }

  // Create & Edit form modals
  openCreateModal(): void {
    this.isEditMode = false;
    this.activeQuote = null;
    this.formQuote = {
      client: this.clients[0] || null,
      expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days expiration
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0
    };
    this.selectedProductToAdd = null;
    this.productQtyToAdd = 1;
    this.showFormModal = true;
  }

  openEditModal(q: Cotizacion): void {
    this.isEditMode = true;
    this.activeQuote = q;
    
    // Copy items deeply
    const clonedItems = q.items.map(item => ({
      product: { ...item.product },
      quantity: item.quantity,
      discount: item.discount,
      subtotal: item.subtotal
    }));

    this.formQuote = {
      client: this.clients.find(c => c.id === q.client.id) || q.client,
      expirationDate: q.expirationDate,
      items: clonedItems,
      subtotal: q.subtotal,
      tax: q.tax,
      discount: q.discount,
      total: q.total
    };
    this.selectedProductToAdd = null;
    this.productQtyToAdd = 1;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.activeQuote = null;
  }

  addItemToForm(): void {
    if (!this.selectedProductToAdd) {
      this.notificationService.warning('Seleccione un producto para agregar.');
      return;
    }
    if (this.productQtyToAdd <= 0) {
      this.notificationService.warning('La cantidad debe ser mayor a 0.');
      return;
    }

    const prod = this.selectedProductToAdd;
    const qty = this.productQtyToAdd;
    const existing = this.formQuote.items.find(item => item.product.sku === prod.sku);

    if (existing) {
      existing.quantity += qty;
    } else {
      const discountAmount = (prod.price * (prod.discount / 100));
      this.formQuote.items.push({
        product: prod,
        quantity: qty,
        discount: prod.discount,
        subtotal: (prod.price - discountAmount) * qty
      });
    }

    this.recalculateFormTotals();
    this.selectedProductToAdd = null;
    this.productQtyToAdd = 1;
    this.notificationService.success(`Producto agregado a la cotización.`);
  }

  removeItemItem(idx: number): void {
    this.removeItemFromForm(idx);
  }

  removeItemFromForm(idx: number): void {
    this.formQuote.items.splice(idx, 1);
    this.recalculateFormTotals();
  }

  recalculateFormTotals(): void {
    let subtotal = 0;
    let totalDiscount = 0;
    
    this.formQuote.items.forEach(item => {
      const originalSub = item.product.price * item.quantity;
      const discAmt = originalSub * (item.product.discount / 100);
      item.subtotal = originalSub - discAmt;
      
      subtotal += originalSub;
      totalDiscount += discAmt;
    });

    const netSubtotal = subtotal - totalDiscount;
    const tax = netSubtotal * 0.16;
    const total = netSubtotal + tax;

    this.formQuote.subtotal = subtotal;
    this.formQuote.discount = totalDiscount;
    this.formQuote.tax = tax;
    this.formQuote.total = total;
  }

  submitForm(): void {
    if (this.formQuote.items.length === 0) {
      this.notificationService.warning('La cotización debe contener al menos un producto.');
      return;
    }

    if (this.isEditMode && this.activeQuote) {
      const updatedQuote: Cotizacion = {
        ...this.activeQuote,
        client: this.formQuote.client,
        expirationDate: this.formQuote.expirationDate,
        items: this.formQuote.items,
        subtotal: this.formQuote.subtotal,
        tax: this.formQuote.tax,
        discount: this.formQuote.discount,
        total: this.formQuote.total
      };

      this.cotizacionService.updateQuote(updatedQuote).subscribe(success => {
        if (success) {
          this.loadQuotes();
          this.showFormModal = false;
        }
      });
    } else {
      const nowStr = new Date().toISOString().split('T')[0];
      const newQuoteData = {
        date: nowStr,
        client: this.formQuote.client,
        expirationDate: this.formQuote.expirationDate,
        items: this.formQuote.items,
        subtotal: this.formQuote.subtotal,
        tax: this.formQuote.tax,
        discount: this.formQuote.discount,
        total: this.formQuote.total,
        status: 'Vigente' as CotizacionStatus
      };

      this.cotizacionService.addQuote(newQuoteData).subscribe(res => {
        this.loadQuotes();
        this.showFormModal = false;
      });
    }
  }
}
