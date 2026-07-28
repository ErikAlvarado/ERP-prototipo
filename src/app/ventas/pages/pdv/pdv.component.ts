import { Component, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { VentaService } from '../../services/venta.service';
import { ClienteService } from '../../services/cliente.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { DescuentoService, DiscountRule } from '../../services/descuento.service';
import { Product } from '../../models/product.model';
import { Client } from '../../models/client.model';
import { PaymentMethod, PaymentDetails, Venta } from '../../models/venta.model';
import { SearchbarComponent } from '../../components/searchbar/searchbar.component';
import { TicketComponent } from '../../components/ticket/ticket.component';
import { Observable, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-pdv',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule, SearchbarComponent, TicketComponent],
  template: `
    <div class="pdv-layout animate-fade-in" *ngIf="currentUser$ | async as activeUser">
      <!-- Left Terminal: Cart and Search -->
      <div class="pdv-main">
        <!-- Station Header -->
        <div class="station-header card-premium">
          <div class="station-meta">
            <span class="station-badge"><i class="fa-solid fa-desktop"></i> CAJA 01</span>
            <span class="station-badge"><i class="fa-solid fa-business-time"></i> TURNO MATUTINO</span>
            <span class="station-badge"><i class="fa-solid fa-user"></i> CAJERO: {{ activeUser.name }}</span>
          </div>

          <!-- Operation Type Toggle (Venta vs Cotización) -->
          <div class="op-mode-toggle">
            <button 
              type="button" 
              class="mode-btn" 
              [class.active-venta]="operationType === 'Venta'"
              (click)="setOperationType('Venta')"
            >
              <i class="fa-solid fa-cart-shopping"></i> VENTA
            </button>
            <button 
              type="button" 
              class="mode-btn" 
              [class.active-cotizacion]="operationType === 'Cotización'"
              (click)="setOperationType('Cotización')"
            >
              <i class="fa-solid fa-file-invoice-dollar"></i> COTIZACIÓN
            </button>
          </div>

          <div class="station-status">
            <span class="status-indicator" [class.online]="activeUser.status === 'Online'"></span>
            <span class="status-text">{{ activeUser.status === 'Online' ? 'Caja Online' : 'Caja Fuera de Línea' }}</span>
          </div>
        </div>

        <!-- Search Bar Component -->
        <div class="search-section card-premium">
          <app-searchbar (productSelected)="onProductSelected($event)"></app-searchbar>
        </div>

        <!-- Cart Items Table -->
        <div class="cart-section card-premium">
          <div class="cart-header-row">
            <div class="cart-header-title">
              <h3>Carrito de Compra</h3>
              <span class="op-badge" [class.badge-quote]="operationType === 'Cotización'">
                {{ operationType === 'Cotización' ? 'Modo Cotización' : 'Modo Venta Directa' }}
              </span>
            </div>
            
            <div class="cart-header-actions">
              <button class="btn-premium btn-text text-accent font-semibold" (click)="openDiscountRulesModal()">
                <i class="fa-solid fa-tags"></i> Ver Descuentos
              </button>
              <button class="btn-premium btn-text text-danger" (click)="clearCart()" [disabled]="cartItems.length === 0">
                <i class="fa-solid fa-trash-can"></i> Vaciar Carrito
              </button>
            </div>
          </div>

          <div class="table-scroll-wrapper">
            <table class="pdv-table" *ngIf="cartItems.length > 0; else emptyCart">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-center">Código</th>
                  <th class="text-center">Unidad</th>
                  <th class="text-center" style="width: 130px;">Cantidad</th>
                  <th class="text-right">Precio U.</th>
                  <th class="text-center" style="width: 110px;">Descuento</th>
                  <th class="text-right">Subtotal</th>
                  <th class="text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of cartItems">
                  <td>
                    <div class="prod-desc-wrap">
                      <span class="font-semibold">{{ item.product.name }}</span>
                      <span class="prod-sku text-secondary">
                        SKU: {{ item.product.sku }} 
                        <span *ngIf="item.product.brand">| {{ item.product.brand }}</span>
                      </span>
                    </div>
                  </td>
                  <td class="text-center">{{ item.product.code }}</td>
                  <td class="text-center">{{ item.product.unit }}</td>
                  <td>
                    <div class="quantity-picker">
                      <button (click)="decreaseQty(item.product.sku, item.quantity)">-</button>
                      <input matInput
                        type="number" 
                        [ngModel]="item.quantity" 
                        (ngModelChange)="onQtyChange(item.product.sku, $event)"
                        min="1"
                      />
                      <button (click)="increaseQty(item.product.sku, item.quantity)">+</button>
                    </div>
                  </td>
                  <td class="text-right">\${{ item.product.price | number:'1.2-2' }}</td>
                  <td class="text-center">
                    <!-- Non-editable automatic catalog discount badge -->
                    <span class="discount-badge" [class.has-discount]="item.discount > 0" title="Descuento asignado automáticamente por catálogo">
                      <i class="fa-solid fa-tag"></i> {{ item.discount }}%
                    </span>
                  </td>
                  <td class="text-right font-bold">\${{ item.subtotal | number:'1.2-2' }}</td>
                  <td class="text-center">
                    <button class="delete-row-btn" (click)="removeItem(item.product.sku)">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <ng-template #emptyCart>
              <div class="empty-cart-state">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>El carrito está vacío. Escanee un producto o use el buscador para comenzar.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Right Panel: Customer, Payment & Checkout -->
      <div class="pdv-sidebar">
        
        <!-- Customer Search & Selection Section -->
        <div class="sidebar-section card-premium client-section-wrapper">
          <div class="section-title-row">
            <h3><i class="fa-solid fa-user-tag text-accent"></i> Cliente</h3>
            <button class="btn-premium btn-text text-accent font-semibold" (click)="openAddClientModal()">
              <i class="fa-solid fa-plus-circle"></i> Nuevo
            </button>
          </div>
          
          <!-- Searchable Client Dropdown Widget -->
          <div class="client-search-wrapper">
            <div class="input-with-icon">
              <i class="fa-solid fa-magnifying-glass search-client-icon"></i>
              <input matInput
                type="text" 
                class="form-control client-search-input" 
                placeholder="Buscar por nombre, RFC, razón social, teléfono..."
                [(ngModel)]="clientSearchQuery"
                (input)="onClientSearchInput()"
                (focus)="onClientSearchInput()"
              />
              <button *ngIf="clientSearchQuery" class="clear-search-btn" (click)="clearClientSearch()">&times;</button>
            </div>

            <!-- Client Suggestions Dropdown -->
            <div class="client-dropdown-overlay" *ngIf="showClientSuggestions && filteredClients.length > 0">
              <div 
                class="client-suggestion-item" 
                *ngFor="let client of filteredClients" 
                (mousedown)="selectClient(client)"
                [class.selected-item]="selectedClient.id === client.id"
              >
                <div class="client-item-main">
                  <span class="client-item-name font-semibold">{{ client.name }}</span>
                  <span class="client-item-rfc text-secondary-sm">RFC: {{ client.rfc }}</span>
                </div>
                <div class="client-item-sub text-xs">
                  <span><i class="fa-solid fa-phone"></i> {{ client.phone || 'N/A' }}</span>
                  <span class="text-secondary">| {{ client.email }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Selected Client Details Card -->
          <div class="client-details-card">
            <div class="detail-row header-client-name font-bold">
              <span>{{ selectedClient.name }}</span>
              <span class="badge-public" *ngIf="selectedClient.id === 'c1'">Mostrador</span>
            </div>
            <div class="detail-row">
              <span class="label">RFC:</span>
              <span class="val font-semibold">{{ selectedClient.rfc }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="val text-xs">{{ selectedClient.email }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedClient.phone">
              <span class="label">Teléfono:</span>
              <span class="val">{{ selectedClient.phone }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Method & Dynamic Form Section (Hidden in Quote Mode) -->
        <div class="sidebar-section card-premium" *ngIf="operationType === 'Venta'">
          <h3><i class="fa-solid fa-credit-card text-accent"></i> Método de Pago</h3>
          
          <div class="payment-grid">
            <button 
              type="button"
              *ngFor="let method of paymentMethods"
              [class]="'payment-btn ' + (selectedPayment === method.id ? 'active-payment' : '')"
              (click)="onPaymentChange(method.id)"
            >
              <i [class]="method.icon"></i>
              <span>{{ method.label }}</span>
            </button>
          </div>

          <!-- Dynamic Payment Method Fields -->
          <div class="dynamic-payment-form animate-fade-in">
            <!-- 1. Efectivo (Cash) -->
            <div *ngIf="selectedPayment === 'Efectivo'" class="payment-form-group">
              <div class="form-row">
                <label>Cantidad Recibida:</label>
                <div class="input-money-wrap">
                  <span class="currency-symbol">$</span>
                  <input matInput
                    type="number" 
                    class="form-control money-input" 
                    [(ngModel)]="cashReceived"
                    placeholder="0.00"
                    min="0"
                    step="10"
                  />
                </div>
              </div>
              
              <div class="change-display" [class.has-enough]="calculatedChange >= 0" [class.not-enough]="cashReceived !== null && calculatedChange < 0">
                <span class="change-label">Cambio Calculado:</span>
                <span class="change-val font-bold">
                  \${{ (calculatedChange >= 0 ? calculatedChange : 0) | number:'1.2-2' }}
                </span>
              </div>
              <p class="warning-text" *ngIf="cashReceived !== null && calculatedChange < 0">
                * La cantidad recibida es menor al total a cobrar.
              </p>
            </div>

            <!-- 2. Tarjeta (Card) -->
            <div *ngIf="selectedPayment === 'Tarjeta'" class="payment-form-group">
              <div class="form-row-2col">
                <div class="form-subcol">
                  <label>Titular de la Tarjeta:</label>
                  <input matInput type="text" class="form-control" [(ngModel)]="cardHolderName" placeholder="Nombre como en la tarjeta" />
                </div>
                <div class="form-subcol">
                  <label>Últimos 4 Dígitos:</label>
                  <input matInput type="text" class="form-control" [(ngModel)]="cardLast4" maxlength="4" placeholder="1234" />
                </div>
              </div>
              <div class="form-row-2col">
                <div class="form-subcol">
                  <label>Banco Emisor:</label>
                  <mat-select class="form-control" [(ngModel)]="cardBank">
                    <mat-option value="BBVA">BBVA</mat-option>
                    <mat-option value="Santander">Santander</mat-option>
                    <mat-option value="Banamex">Citibanamex</mat-option>
                    <mat-option value="Banorte">Banorte</mat-option>
                    <mat-option value="HSBC">HSBC</mat-option>
                    <mat-option value="Otro">Otro Banco</mat-option>
                  </mat-select>
                </div>
                <div class="form-subcol">
                  <label>Tipo de Tarjeta:</label>
                  <mat-select class="form-control" [(ngModel)]="cardType">
                    <mat-option value="Débito">Débito</mat-option>
                    <mat-option value="Crédito">Crédito</mat-option>
                  </mat-select>
                </div>
              </div>
              <div class="form-row">
                <label>Número de Autorización (Simulado):</label>
                <input matInput type="text" class="form-control font-mono" [(ngModel)]="authorizationCode" placeholder="Ej. AUTH-882710" />
              </div>
            </div>

            <!-- 3. Transferencia (Transfer) -->
            <div *ngIf="selectedPayment === 'Transferencia'" class="payment-form-group">
              <div class="form-row-2col">
                <div class="form-subcol">
                  <label>Banco Emisor:</label>
                  <mat-select class="form-control" [(ngModel)]="transferBank">
                    <mat-option value="BBVA">BBVA</mat-option>
                    <mat-option value="Santander">Santander</mat-option>
                    <mat-option value="Banamex">Citibanamex</mat-option>
                    <mat-option value="Banorte">Banorte</mat-option>
                    <mat-option value="SPEI / OTRO">SPEI / Otro</mat-option>
                  </mat-select>
                </div>
                <div class="form-subcol">
                  <label>Referencia:</label>
                  <input matInput type="text" class="form-control" [(ngModel)]="transferReference" placeholder="Ej. REF-99201" />
                </div>
              </div>
              <div class="form-row">
                <label>Folio de Transferencia (Clave RASTREO SPEI):</label>
                <input matInput type="text" class="form-control font-mono" [(ngModel)]="transferFolio" placeholder="Ej. 2026072440014782" />
              </div>
            </div>

            <!-- 4. Vales (Vouchers) -->
            <div *ngIf="selectedPayment === 'Vales'" class="payment-form-group">
              <div class="form-row-2col">
                <div class="form-subcol">
                  <label>Empresa Emisora:</label>
                  <mat-select class="form-control" [(ngModel)]="voucherCompany">
                    <mat-option value="Edenred">Edenred</mat-option>
                    <mat-option value="Sodexo">Sodexo</mat-option>
                    <mat-option value="Up Sí Vale">Up Sí Vale</mat-option>
                    <mat-option value="Toka">Toka</mat-option>
                    <mat-option value="Otra">Otra Empresa</mat-option>
                  </mat-select>
                </div>
                <div class="form-subcol">
                  <label>Número de Vale / Folio:</label>
                  <input matInput type="text" class="form-control" [(ngModel)]="voucherNumber" placeholder="Ej. V-772810" />
                </div>
              </div>
            </div>

            <!-- 5. Crédito (Credit) -->
            <div *ngIf="selectedPayment === 'Crédito'" class="payment-form-group">
              <div class="form-row">
                <label>Días de Crédito Autorizados:</label>
                <mat-select class="form-control" [(ngModel)]="creditDays">
                  <mat-option [value]="15">15 Días</mat-option>
                  <mat-option [value]="30">30 Días</mat-option>
                  <mat-option [value]="60">60 Días</mat-option>
                  <mat-option [value]="90">90 Días</mat-option>
                </mat-select>
              </div>
              <div class="form-row">
                <label>Observaciones de Crédito:</label>
                <input matInput type="text" class="form-control" [(ngModel)]="creditNotes" placeholder="Ej. Autorizado por Gerencia" />
              </div>
            </div>
          </div>
        </div>

        <!-- Quote Info Box (Shown in Quote Mode) -->
        <div class="sidebar-section card-premium quote-info-card" *ngIf="operationType === 'Cotización'">
          <div class="quote-info-header">
            <i class="fa-solid fa-info-circle text-info"></i>
            <h4>Modo Cotización Activo</h4>
          </div>
          <p>
            Al generar una cotización no se solicita información de pago. La cotización quedará vigencia por 15 días y se guardará automáticamente en el historial.
          </p>
        </div>

        <!-- Summary Totals Section -->
        <div class="sidebar-section card-premium summary-totals">
          <h3>Resumen {{ operationType === 'Cotización' ? 'de Cotización' : 'de Cobro' }}</h3>
          <div class="totals-list">
            <div class="total-item">
              <span>Subtotal:</span>
              <span>\${{ totals.subtotal | number:'1.2-2' }}</span>
            </div>
            <div class="total-item text-danger-color" *ngIf="totals.discount > 0">
              <span>Descuentos (Catálogo):</span>
              <span>-\${{ totals.discount | number:'1.2-2' }}</span>
            </div>
            <div class="total-item">
              <span>IVA (16%):</span>
              <span>\${{ totals.tax | number:'1.2-2' }}</span>
            </div>
            <div class="divider-thin"></div>
            <div class="total-item grand-total font-bold">
              <span>TOTAL:</span>
              <span class="text-accent">\${{ totals.total | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Action Button (Venta or Cotización) -->
        <button 
          class="btn-premium checkout-btn font-bold" 
          [class.btn-success]="operationType === 'Venta'"
          [class.btn-primary]="operationType === 'Cotización'"
          [disabled]="cartItems.length === 0 || isProcessing"
          (click)="onProcessSubmit(activeUser.name)"
        >
          <span *ngIf="!isProcessing && operationType === 'Venta'">
            <i class="fa-solid fa-cash-register"></i> CERRAR VENTA (COBRAR)
          </span>
          <span *ngIf="!isProcessing && operationType === 'Cotización'">
            <i class="fa-solid fa-file-signature"></i> GENERAR COTIZACIÓN
          </span>
          <span *ngIf="isProcessing">
            <i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO...
          </span>
        </button>
      </div>

      <!-- Sale / Quote Ticket Modal -->
      <app-ticket 
        *ngIf="showTicket$ | async" 
        [sale]="ticketSaleData" 
        (closeTicket)="closeTicket()"
      ></app-ticket>

      <!-- Client Creation Modal Overlay -->
      <div class="modal-overlay" *ngIf="showAddClientModal">
        <div class="modal-card card-premium">
          <div class="modal-head">
            <h3>Registrar Nuevo Cliente</h3>
            <button class="close-modal-btn" (click)="closeAddClientModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="c-name">Nombre / Razón Social *</label>
              <input matInput type="text" id="c-name" class="form-control" [(ngModel)]="newClient.name" placeholder="Ej. Juan Pérez u Operadora S.A." />
            </div>
            <div class="form-group">
              <label for="c-rfc">RFC *</label>
              <input matInput type="text" id="c-rfc" class="form-control" [(ngModel)]="newClient.rfc" placeholder="Ej. PERJ850228K89" />
            </div>
            <div class="form-group">
              <label for="c-email">Correo Electrónico *</label>
              <input matInput type="email" id="c-email" class="form-control" [(ngModel)]="newClient.email" placeholder="Ej. cliente@example.com" />
            </div>
            <div class="form-group">
              <label for="c-phone">Teléfono</label>
              <input matInput type="text" id="c-phone" class="form-control" [(ngModel)]="newClient.phone" placeholder="Ej. 555-123-4567" />
            </div>
            <div class="form-group">
              <label for="c-addr">Dirección Fiscal</label>
              <input matInput type="text" id="c-addr" class="form-control" [(ngModel)]="newClient.address" placeholder="Calle, Número, Colonia, CP" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-secondary" (click)="closeAddClientModal()">Cancelar</button>
            <button class="btn-premium btn-accent" (click)="saveNewClient()">Guardar y Seleccionar</button>
          </div>
        </div>
      </div>

      <!-- Discount Catalog Rules Modal Overlay -->
      <div class="modal-overlay" *ngIf="showDiscountRulesModal">
        <div class="modal-card card-premium discount-modal">
          <div class="modal-head">
            <h3><i class="fa-solid fa-tags text-accent"></i> Catálogo de Descuentos Activo</h3>
            <button class="close-modal-btn" (click)="closeDiscountRulesModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-intro">
              Los descuentos se aplican automáticamente según el rango de precio unitario del producto o regla asignada. No se permite edición manual.
            </p>
            <div class="discount-rules-table">
              <div class="rule-header">
                <span>Rango de Precio Unitario</span>
                <span>Descuento %</span>
              </div>
              <div class="rule-row" *ngFor="let rule of discountRules">
                <span>{{ rule.description }}</span>
                <span class="font-bold text-accent">{{ rule.discountPercentage }}%</span>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-primary" (click)="closeDiscountRulesModal()">Entendido</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pdv-layout {
      display: grid;
      grid-template-columns: 2.2fr 1fr;
      gap: 24px;
      height: calc(100vh - var(--navbar-height) - 48px);
    }

    .pdv-main {
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }

    /* Station Header */
    .station-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px !important;
      flex-wrap: wrap;
      gap: 12px;
    }

    .station-meta {
      display: flex;
      gap: 12px;
    }

    .station-badge {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      background-color: var(--bg-color);
      padding: 4px 10px;
      border-radius: var(--border-radius-sm);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Operation mode toggle (Venta vs Cotización) */
    .op-mode-toggle {
      display: flex;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      padding: 3px;
      gap: 4px;
    }

    .mode-btn {
      background: none;
      border: none;
      padding: 6px 14px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;

      &:hover {
        color: var(--text-primary);
      }
    }

    .active-venta {
      background-color: var(--success-color) !important;
      color: #ffffff !important;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .active-cotizacion {
      background-color: var(--primary-color) !important;
      color: #ffffff !important;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }

    .station-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--danger-color);
      &.online {
        background-color: var(--success-color);
      }
    }

    /* Cart Header */
    .cart-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .cart-header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .op-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      background-color: var(--success-light);
      color: var(--success-color);
      border-radius: var(--border-radius-sm);
      text-transform: uppercase;

      &.badge-quote {
        background-color: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }
    }

    .cart-header-actions {
      display: flex;
      gap: 12px;
    }

    /* Discount Badge */
    .discount-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 4px 8px;
      background-color: var(--bg-color);
      color: var(--text-secondary);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);

      &.has-discount {
        background-color: var(--danger-light);
        color: var(--danger-color);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }

    /* Quantity Picker */
    .quantity-picker {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      overflow: hidden;
      background-color: var(--bg-color);

      button {
        background: none;
        border: none;
        width: 32px;
        height: 32px;
        font-size: 1.1rem;
        cursor: pointer;
        color: var(--text-primary);
        &:hover {
          background-color: var(--border-color);
        }
      }

      input {
        width: 48px;
        height: 32px;
        text-align: center;
        border: none;
        border-left: 1px solid var(--border-color);
        border-right: 1px solid var(--border-color);
        background-color: var(--panel-bg);
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.88rem;
        font-weight: 600;
        outline: none;
        -moz-appearance: textfield;
        &::-webkit-outer-spin-button, &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }
    }

    .delete-row-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 6px;
      border-radius: var(--border-radius-sm);
      transition: background-color 0.2s, color 0.2s;
      &:hover {
        background-color: var(--danger-light);
        color: var(--danger-color);
      }
    }

    .empty-cart-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      height: 240px;
      color: var(--text-secondary);
      text-align: center;
      padding: 0 40px;

      i {
        font-size: 3rem;
        opacity: 0.25;
      }

      p {
        font-size: 0.95rem;
        max-width: 440px;
      }
    }

    /* Sidebar controls */
    .pdv-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }

    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 18px !important;

      h3 {
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { font-size: 0.95rem; }
    }

    /* Client Searchable Widget */
    .client-section-wrapper {
      position: relative;
    }

    .client-search-wrapper {
      position: relative;
      width: 100%;
    }

    .input-with-icon {
      position: relative;
      width: 100%;
    }

    .search-client-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 0.88rem;
    }

    .client-search-input {
      padding-left: 36px !important;
      padding-right: 30px !important;
      height: 42px;
      font-size: 0.85rem;
    }

    .clear-search-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 1.2rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .client-dropdown-overlay {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 100%;
      background-color: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      max-height: 240px;
      overflow-y: auto;
    }

    .client-suggestion-item {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.15s;

      &:last-child { border-bottom: none; }
      &:hover { background-color: var(--bg-color); }
      &.selected-item { background-color: var(--info-light); border-left: 3px solid var(--primary-color); }
    }

    .client-item-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .client-item-name {
      font-size: 0.88rem;
      color: var(--text-primary);
    }

    .client-item-sub {
      display: flex;
      gap: 6px;
      color: var(--text-secondary);
    }

    .client-details-card {
      padding: 12px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.8rem;

      .header-client-name {
        color: var(--accent-color);
        font-size: 0.9rem;
        margin-bottom: 4px;
      }

      .badge-public {
        font-size: 0.7rem;
        background: var(--info-light);
        color: var(--primary-color);
        padding: 2px 6px;
        border-radius: 4px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        .label { color: var(--text-secondary); }
        .val { color: var(--text-primary); }
      }
    }

    /* Payment grid */
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .payment-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 6px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      color: var(--text-secondary);
      font-family: inherit;
      transition: all 0.2s ease;

      i { font-size: 1.1rem; }
      span { font-size: 0.78rem; font-weight: 600; }

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background-color: var(--info-light);
      }
    }

    .active-payment {
      border-color: var(--primary-color) !important;
      color: #ffffff !important;
      background-color: var(--primary-color) !important;
    }

    /* Dynamic Payment Form */
    .dynamic-payment-form {
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      padding: 14px;
      margin-top: 10px;
    }

    .payment-form-group {
      display: flex;
      flex-direction: column;
      gap: 10px;

      label {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 2px;
      }
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .form-subcol {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-money-wrap {
      position: relative;
      display: flex;
      align-items: center;

      .currency-symbol {
        position: absolute;
        left: 12px;
        font-weight: bold;
        color: var(--text-primary);
      }

      .money-input {
        padding-left: 28px !important;
        font-size: 1.1rem;
        font-weight: 700;
        height: 44px;
      }
    }

    .change-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background-color: var(--panel-bg);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      margin-top: 4px;

      .change-label { font-size: 0.85rem; color: var(--text-secondary); }
      .change-val { font-size: 1.15rem; color: var(--text-primary); }

      &.has-enough {
        border-color: rgba(16, 185, 129, 0.4);
        background-color: var(--success-light);
        .change-val { color: var(--success-color); }
      }

      &.not-enough {
        border-color: rgba(239, 68, 68, 0.4);
        background-color: var(--danger-light);
        .change-val { color: var(--danger-color); }
      }
    }

    .warning-text {
      font-size: 0.75rem;
      color: var(--danger-color);
      margin-top: 2px;
    }

    .quote-info-card {
      background-color: rgba(59, 130, 246, 0.08) !important;
      border-color: rgba(59, 130, 246, 0.25) !important;
      
      .quote-info-header {
        display: flex;
        align-items: center;
        gap: 8px;
        h4 { font-size: 0.92rem; color: var(--primary-color); }
      }

      p {
        font-size: 0.8rem;
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }

    /* Summary Totals */
    .summary-totals {
      .totals-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .total-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.88rem;
        color: var(--text-secondary);
      }

      .grand-total {
        font-size: 1.1rem;
        color: var(--text-primary);
      }

      .text-danger-color {
        color: var(--danger-color);
      }
    }

    .checkout-btn {
      width: 100%;
      height: 52px;
      border-radius: var(--border-radius-sm);
      font-size: 1rem;
    }

    /* Modals */
    .discount-modal {
      max-width: 500px;
    }

    .modal-intro {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 14px;
      line-height: 1.4;
    }

    .discount-rules-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      overflow: hidden;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      background-color: var(--bg-color);
      font-weight: 700;
      font-size: 0.82rem;
      border-bottom: 1px solid var(--border-color);
    }

    .rule-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.85rem;

      &:last-child { border-bottom: none; }
    }
  `]
})
export class PdvComponent implements OnInit {
  currentUser$!: Observable<any>;
  
  cartItems: any[] = [];
  clientList: Client[] = [];
  selectedClient!: Client;
  selectedPayment: PaymentMethod = 'Efectivo';
  operationType: 'Venta' | 'Cotización' = 'Venta';
  isProcessing = false;

  // Searchable Client Dropdown State
  clientSearchQuery = '';
  filteredClients: Client[] = [];
  showClientSuggestions = false;

  // Dynamic Payment Method State
  cashReceived: number | null = null;
  cardHolderName = '';
  cardLast4 = '';
  cardBank = 'BBVA';
  cardType: 'Débito' | 'Crédito' = 'Débito';
  authorizationCode = '';
  transferBank = 'BBVA';
  transferReference = '';
  transferFolio = '';
  voucherCompany = 'Edenred';
  voucherNumber = '';
  creditDays = 30;
  creditNotes = '';

  // Modals state
  showAddClientModal = false;
  showDiscountRulesModal = false;
  discountRules: DiscountRule[] = [];

  newClient: Omit<Client, 'id'> = {
    name: '',
    rfc: '',
    email: '',
    phone: '',
    address: ''
  };

  paymentMethods = [
    { id: 'Efectivo' as PaymentMethod, label: 'Efectivo', icon: 'fa-solid fa-money-bill-wave' },
    { id: 'Tarjeta' as PaymentMethod, label: 'Tarjeta', icon: 'fa-solid fa-credit-card' },
    { id: 'Transferencia' as PaymentMethod, label: 'Transferencia', icon: 'fa-solid fa-building-columns' },
    { id: 'Vales' as PaymentMethod, label: 'Vales', icon: 'fa-solid fa-ticket' },
    { id: 'Crédito' as PaymentMethod, label: 'Crédito', icon: 'fa-solid fa-calendar-plus' }
  ];

  completedSale$!: Observable<any>;
  showTicket$!: Observable<boolean>;
  ticketSaleData!: Venta;

  constructor(
    private ventaService: VentaService,
    private clienteService: ClienteService,
    private cotizacionService: CotizacionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private descuentoService: DescuentoService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.discountRules = this.descuentoService.DISCOUNT_RULES;
    
    this.ventaService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });

    this.ventaService.selectedClient$.subscribe(client => {
      this.selectedClient = client;
    });

    this.ventaService.selectedPayment$.subscribe(payment => {
      this.selectedPayment = payment;
    });

    this.clienteService.clients$.subscribe(clients => {
      this.clientList = clients;
      if (clients.length > 0 && (!this.selectedClient || this.selectedClient.id === 'c1')) {
        this.selectedClient = clients[0]; // Default to "Público General"
      }
    });

    this.showTicket$ = this.ventaService.showTicket$;
    this.completedSale$.subscribe();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const clientWrapper = this.elementRef.nativeElement.querySelector('.client-search-wrapper');
    if (clientWrapper && !clientWrapper.contains(event.target)) {
      this.showClientSuggestions = false;
    }
  }

  get totals() {
    return this.ventaService.getTotals();
  }

  get calculatedChange(): number {
    if (this.cashReceived === null || this.cashReceived === undefined) return 0;
    return this.cashReceived - this.totals.total;
  }

  setOperationType(type: 'Venta' | 'Cotización'): void {
    this.operationType = type;
    this.notificationService.info(`Modo cambiado a: ${type}`);
  }

  // Client Search & Selection
  onClientSearchInput(): void {
    const rawTerm = (this.clientSearchQuery || '').toLowerCase().trim();
    if (!rawTerm) {
      this.filteredClients = this.clientList;
    } else {
      this.filteredClients = this.clientList.filter(c => 
        c.name.toLowerCase().includes(rawTerm) ||
        c.rfc.toLowerCase().includes(rawTerm) ||
        c.email.toLowerCase().includes(rawTerm) ||
        (c.phone && c.phone.includes(rawTerm))
      );
    }
    this.showClientSuggestions = true;
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.ventaService.setSelectedClient(client);
    this.clientSearchQuery = '';
    this.showClientSuggestions = false;
    this.notificationService.info(`Cliente seleccionado: ${client.name}`);
  }

  clearClientSearch(): void {
    this.clientSearchQuery = '';
    this.onClientSearchInput();
  }

  // Cart operations
  onProductSelected(product: Product): void {
    this.ventaService.addToCart(product);
  }

  increaseQty(sku: string, currentQty: number): void {
    this.ventaService.updateQuantity(sku, currentQty + 1);
  }

  decreaseQty(sku: string, currentQty: number): void {
    this.ventaService.updateQuantity(sku, currentQty - 1);
  }

  onQtyChange(sku: string, newQty: any): void {
    const qty = parseInt(newQty, 10);
    if (!isNaN(qty)) {
      this.ventaService.updateQuantity(sku, qty);
    }
  }

  removeItem(sku: string): void {
    this.ventaService.removeFromCart(sku);
  }

  clearCart(): void {
    this.ventaService.clearCart();
    this.notificationService.success('Carrito vaciado.');
  }

  onPaymentChange(method: PaymentMethod): void {
    this.selectedPayment = method;
    this.ventaService.setSelectedPayment(method);
    
    // Generate sample authorization code for card payment
    if (method === 'Tarjeta' && !this.authorizationCode) {
      this.authorizationCode = 'AUTH-' + Math.floor(100000 + Math.random() * 900000);
    }
  }

  // Submission handling (Venta vs Cotización)
  onProcessSubmit(cashierName: string): void {
    if (this.cartItems.length === 0) {
      this.notificationService.warning('El carrito está vacío');
      return;
    }

    if (this.operationType === 'Cotización') {
      this.processQuote();
    } else {
      this.processSale(cashierName);
    }
  }

  private processSale(cashierName: string): void {
    // Validate cash received if payment is Efectivo
    if (this.selectedPayment === 'Efectivo') {
      if (this.cashReceived === null || this.cashReceived < this.totals.total) {
        this.notificationService.warning('Ingrese una cantidad recibida igual o mayor al total.');
        return;
      }
    }

    const paymentDetails: PaymentDetails = {
      cashReceived: this.selectedPayment === 'Efectivo' ? (this.cashReceived || 0) : undefined,
      changeGiven: this.selectedPayment === 'Efectivo' ? Math.max(0, this.calculatedChange) : undefined,
      cardHolderName: this.selectedPayment === 'Tarjeta' ? (this.cardHolderName || 'Cliente de Mostrador') : undefined,
      cardLast4: this.selectedPayment === 'Tarjeta' ? (this.cardLast4 || '4321') : undefined,
      cardBank: this.selectedPayment === 'Tarjeta' ? this.cardBank : undefined,
      cardType: this.selectedPayment === 'Tarjeta' ? this.cardType : undefined,
      authorizationCode: this.selectedPayment === 'Tarjeta' ? this.authorizationCode : undefined,
      transferBank: this.selectedPayment === 'Transferencia' ? this.transferBank : undefined,
      transferReference: this.selectedPayment === 'Transferencia' ? (this.transferReference || 'REF-88910') : undefined,
      transferFolio: this.selectedPayment === 'Transferencia' ? (this.transferFolio || 'SPEI-' + Math.floor(100000 + Math.random() * 900000)) : undefined,
      voucherCompany: this.selectedPayment === 'Vales' ? this.voucherCompany : undefined,
      voucherNumber: this.selectedPayment === 'Vales' ? (this.voucherNumber || 'VALE-' + Math.floor(10000 + Math.random() * 90000)) : undefined,
      creditDays: this.selectedPayment === 'Crédito' ? this.creditDays : undefined,
      creditNotes: this.selectedPayment === 'Crédito' ? this.creditNotes : undefined
    };

    this.isProcessing = true;
    setTimeout(() => {
      this.ventaService.checkout(cashierName, '', paymentDetails).subscribe({
        next: (sale) => {
          this.isProcessing = false;
          this.ticketSaleData = sale;
          this.resetPaymentForm();
        },
        error: (err) => {
          this.isProcessing = false;
          this.notificationService.error(err.message || 'Error al completar la venta');
        }
      });
    }, 700);
  }

  private processQuote(): void {
    this.isProcessing = true;
    const totals = this.totals;
    const now = new Date();
    const exp = new Date();
    exp.setDate(exp.getDate() + 15);

    const quoteData = {
      date: now.toISOString().split('T')[0],
      expirationDate: exp.toISOString().split('T')[0],
      client: this.selectedClient,
      items: [...this.cartItems],
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      status: 'Vigente' as const
    };

    this.cotizacionService.addQuote(quoteData).subscribe({
      next: (createdQuote) => {
        this.isProcessing = false;
        
        // Build ticket data for quote preview
        this.ticketSaleData = {
          id: createdQuote.id,
          folio: createdQuote.folio,
          date: createdQuote.date,
          time: now.toTimeString().split(' ')[0].substring(0, 5),
          client: createdQuote.client,
          items: createdQuote.items,
          subtotal: createdQuote.subtotal,
          tax: createdQuote.tax,
          discount: createdQuote.discount,
          total: createdQuote.total,
          paymentMethod: 'Efectivo',
          operationType: 'Cotización',
          status: 'Pagada',
          cashier: 'Carlos Cajero',
          numProducts: createdQuote.items.reduce((acc, curr) => acc + curr.quantity, 0),
          observation: 'Cotización emitida con vigencia de 15 días'
        };

        this.ventaService.clearCart();
        this.notificationService.success(`Cotización ${createdQuote.folio} registrada en el historial.`);
        (this.ventaService as any).showTicketSubject.next(true);
      },
      error: () => {
        this.isProcessing = false;
        this.notificationService.error('Error al generar la cotización');
      }
    });
  }

  private resetPaymentForm(): void {
    this.cashReceived = null;
    this.cardHolderName = '';
    this.cardLast4 = '';
    this.authorizationCode = '';
    this.transferReference = '';
    this.transferFolio = '';
    this.voucherNumber = '';
    this.creditNotes = '';
  }

  closeTicket(): void {
    this.ventaService.closeTicket();
  }

  // Modals
  openDiscountRulesModal(): void {
    this.showDiscountRulesModal = true;
  }

  closeDiscountRulesModal(): void {
    this.showDiscountRulesModal = false;
  }

  openAddClientModal(): void {
    this.newClient = { name: '', rfc: '', email: '', phone: '', address: '' };
    this.showAddClientModal = true;
  }

  closeAddClientModal(): void {
    this.showAddClientModal = false;
  }

  saveNewClient(): void {
    if (!this.newClient.name || !this.newClient.rfc || !this.newClient.email) {
      this.notificationService.warning('Por favor llene todos los campos requeridos (*).');
      return;
    }

    this.clienteService.addClient(this.newClient).subscribe(client => {
      this.selectClient(client);
      this.showAddClientModal = false;
      this.notificationService.success(`Cliente ${client.name} registrado y seleccionado.`);
    });
  }
}
