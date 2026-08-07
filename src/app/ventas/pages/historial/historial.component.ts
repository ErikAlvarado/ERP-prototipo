import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HistorialService } from '../../services/historial.service';
import { NotificationService } from '../../services/notification.service';
import { Venta, VentaStatus, PaymentMethod } from '../../models/venta.model';
import { TicketComponent } from '../../components/ticket/ticket.component';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule, TicketComponent],
  template: `
    <div class="history-page animate-fade-in">
      <!-- Advanced Filters Panel -->
      <div class="filters-panel card-premium">
        <h3 class="filters-title"><i class="fa-solid fa-filter text-accent"></i> Filtros de Búsqueda</h3>
        
        <div class="filters-grid">
          <!-- Date Start -->
          <div class="form-group">
            <label for="f-start">Fecha Inicio</label>
            <input matInput type="date" id="f-start" class="form-control" [(ngModel)]="filters.startDate" (change)="onFilterChange()" />
          </div>

          <!-- Date End -->
          <div class="form-group">
            <label for="f-end">Fecha Fin</label>
            <input matInput type="date" id="f-end" class="form-control" [(ngModel)]="filters.endDate" (change)="onFilterChange()" />
          </div>

          <!-- Client -->
          <div class="form-group">
            <label for="f-client">Cliente</label>
            <input matInput type="text" id="f-client" class="form-control" placeholder="Buscar cliente..." [(ngModel)]="filters.clientName" (input)="onFilterChange()" />
          </div>

          <!-- Cashier -->
          <div class="form-group">
            <label for="f-cashier">Cajero</label>
            <input matInput type="text" id="f-cashier" class="form-control" placeholder="Nombre de cajero..." [(ngModel)]="filters.cashier" (input)="onFilterChange()" />
          </div>

          <!-- Status -->
          <div class="form-group">
            <label for="f-status">Estado</label>
            <mat-select id="f-status" class="form-control" [(ngModel)]="filters.status" (selectionChange)="onFilterChange()">
              <mat-option [value]="undefined">Todos los estados</mat-option>
              <mat-option *ngFor="let st of statusOptions" [value]="st">{{ st }}</mat-option>
            </mat-select>
          </div>

          <!-- Payment -->
          <div class="form-group">
            <label for="f-payment">Método de Pago</label>
            <mat-select id="f-payment" class="form-control" [(ngModel)]="filters.paymentMethod" (selectionChange)="onFilterChange()">
              <mat-option [value]="undefined">Todos los métodos</mat-option>
              <mat-option value="Efectivo">Efectivo</mat-option>
              <mat-option value="Tarjeta">Tarjeta</mat-option>
              <mat-option value="Transferencia">Transferencia</mat-option>
              <mat-option value="Crédito">Crédito</mat-option>
            </mat-select>
          </div>
        </div>

        <!-- Export Buttons -->
        <div class="filters-actions">
          <button class="btn-premium btn-secondary" (click)="resetFilters()">
            Limpiar Filtros
          </button>
          <div class="export-btn-group">
            <button class="btn-premium btn-secondary" (click)="exportExcel()">
              <i class="fa-regular fa-file-excel text-success"></i> Exportar Excel
            </button>
            <button class="btn-premium btn-secondary" (click)="exportPdf()">
              <i class="fa-regular fa-file-pdf text-danger"></i> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <!-- Sales Grid Table -->
      <div class="table-container card-premium">
        <table class="history-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha/Hora</th>
              <th>Cliente</th>
              <th>Cajero</th>
              <th class="text-center">Artículos</th>
              <th class="text-right">Total</th>
              <th class="text-center">Pago</th>
              <th class="text-center">Estado</th>
              <th>Observación / Detalle</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sale of filteredSales">
              <td class="font-bold folio-cell" (click)="reprintTicket(sale)" title="Ver Ticket">{{ sale.folio }}</td>
              <td>
                <div class="datetime-wrap">
                  <span class="date">{{ sale.date }}</span>
                  <span class="time text-secondary">{{ sale.time }}</span>
                </div>
              </td>
              <td>{{ sale.client.name }}</td>
              <td>{{ sale.cashier }}</td>
              <td class="text-center font-semibold">{{ sale.numProducts }}</td>
              <td class="text-right font-bold">\${{ sale.total | number:'1.2-2' }}</td>
              <td class="text-center">
                <span class="payment-method-tag">{{ sale.paymentMethod }}</span>
              </td>
              <td class="text-center">
                <span [class]="'badge-custom ' + getStatusClass(sale.status)">
                  {{ sale.status }}
                </span>
              </td>
              <td>
                <span class="obs-text" [title]="sale.observation">{{ sale.observation || 'Ninguna' }}</span>
              </td>
              <td class="text-right actions-cell">
                <button class="action-icon-btn" (click)="openDetailModal(sale)" title="Ver Detalle">
                  <i class="fa-regular fa-eye text-accent"></i>
                </button>
                <button class="action-icon-btn" (click)="reprintTicket(sale)" title="Reimprimir Ticket">
                  <i class="fa-solid fa-print"></i>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredSales.length === 0">
              <td colspan="10" class="no-records-cell">
                No se encontraron ventas registradas que coincidan con los filtros.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sale Ticket Overlay for reprint -->
      <app-ticket 
        *ngIf="selectedTicketSale" 
        [sale]="selectedTicketSale" 
        (closeTicket)="selectedTicketSale = null"
      ></app-ticket>

      <!-- Sale Details Drawer Modal Overlay -->
      <div class="modal-overlay" *ngIf="selectedDetailSale">
        <div class="modal-card card-premium detail-modal">
          <div class="modal-head">
            <h3>Detalle de Venta {{ selectedDetailSale.folio }}</h3>
            <button class="close-modal-btn" (click)="closeDetailModal()">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Summary Info -->
            <div class="summary-top-grid">
              <div class="sum-box">
                <span class="lbl">Cliente:</span>
                <span class="val font-semibold">{{ selectedDetailSale.client.name }}</span>
              </div>
              <div class="sum-box">
                <span class="lbl">RFC:</span>
                <span class="val">{{ selectedDetailSale.client.rfc }}</span>
              </div>
              <div class="sum-box">
                <span class="lbl">Cajero:</span>
                <span class="val">{{ selectedDetailSale.cashier }}</span>
              </div>
              <div class="sum-box">
                <span class="lbl">Fecha y Hora:</span>
                <span class="val">{{ selectedDetailSale.date }} {{ selectedDetailSale.time }}</span>
              </div>
              <div class="sum-box">
                <span class="lbl">Método de Pago:</span>
                <span class="val font-semibold">{{ selectedDetailSale.paymentMethod }}</span>
              </div>
              <div class="sum-box">
                <span class="lbl">Estado:</span>
                <span [class]="'badge-custom ' + getStatusClass(selectedDetailSale.status)">{{ selectedDetailSale.status }}</span>
              </div>
            </div>

            <!-- Items list -->
            <h4 class="section-title">Productos Vendidos</h4>
            <div class="details-table-wrap">
              <table class="details-items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th class="text-center">Cantidad</th>
                    <th class="text-right">Precio Unitario</th>
                    <th class="text-center">Descuento</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of selectedDetailSale.items">
                    <td class="font-semibold">{{ item.product.name }}</td>
                    <td>{{ item.product.sku }}</td>
                    <td class="text-center">{{ item.quantity }}</td>
                    <td class="text-right">\${{ item.product.price | number:'1.2-2' }}</td>
                    <td class="text-center">{{ item.discount }}%</td>
                    <td class="text-right font-bold">\${{ item.subtotal | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Observations -->
            <div class="obs-panel">
              <span class="lbl">Observaciones de la Transacción:</span>
              <p class="obs-body">{{ selectedDetailSale.observation || 'Sin observaciones registradas.' }}</p>
            </div>

            <!-- Summary Total -->
            <div class="totals-summary-drawer">
              <div class="tot-row">
                <span>Subtotal:</span>
                <span>\${{ selectedDetailSale.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="tot-row text-danger" *ngIf="selectedDetailSale.discount > 0">
                <span>Descuento aplicado:</span>
                <span>-\${{ selectedDetailSale.discount | number:'1.2-2' }}</span>
              </div>
              <div class="tot-row">
                <span>IVA (16%):</span>
                <span>\${{ selectedDetailSale.tax | number:'1.2-2' }}</span>
              </div>
              <div class="divider-thin"></div>
              <div class="tot-row grand-total font-bold">
                <span>TOTAL NETO:</span>
                <span class="text-accent">\${{ selectedDetailSale.total | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-secondary" (click)="reprintTicket(selectedDetailSale)">
              <i class="fa-solid fa-print"></i> Ticket Fiscal
            </button>
            <button class="btn-premium btn-accent" (click)="closeDetailModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .filters-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filters-title {
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;

      .form-group {
        margin-bottom: 0;
      }
    }

    .filters-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      margin-top: 4px;
    }

    .export-btn-group {
      display: flex;
      gap: 12px;
    }

    /* Table Container */
    .table-container {
      padding: 0 !important;
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;

      th {
        padding: 14px 16px;
        color: var(--text-secondary);
        font-weight: 600;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
      }

      td {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color);
        vertical-align: middle;
      }
    }

    .folio-cell {
      color: var(--accent-color);
      cursor: pointer;
      &:hover {
        text-decoration: underline;
      }
    }

    .datetime-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      .date { font-weight: 500; }
      .time { font-size: 0.74rem; }
    }

    .payment-method-tag {
      font-size: 0.76rem;
      font-weight: 600;
      padding: 3px 8px;
      background-color: var(--bg-color);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .obs-text {
      display: block;
      max-width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.8rem;
      color: var(--text-secondary);
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
      gap: 6px;
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

      &:hover {
        background-color: var(--bg-color);
        color: var(--text-primary);
      }
    }

    /* 12 Colored Status Badges Mapping */
    .badge-pagada, .badge-entregada { background-color: var(--success-light); color: var(--success-color); }
    .badge-cancelada { background-color: var(--danger-light); color: var(--danger-color); }
    .badge-devuelta { background-color: rgba(6, 182, 212, 0.1); color: var(--info-color); }
    .badge-pago-parcial { background-color: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
    .badge-en-espera-de-inventario { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
    .badge-producto-reservado { background-color: rgba(59, 130, 246, 0.1); color: var(--accent-color); }
    .badge-producto-sin-existencia { background-color: rgba(220, 38, 38, 0.15); color: #dc2626; }
    .badge-producto-surtido-parcialmente { background-color: rgba(217, 119, 6, 0.15); color: #d97706; }
    .badge-en-proceso-de-entrega { background-color: rgba(6, 182, 212, 0.1); color: var(--info-color); }
    .badge-crédito-pendiente { background-color: rgba(124, 58, 237, 0.1); color: #7c3aed; }
    .badge-cambio-solicitado { background-color: rgba(249, 115, 22, 0.1); color: #f97316; }

    /* Modal Details Drawer */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card.detail-modal {
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      padding: 24px !important;
      display: flex;
      flex-direction: column;
      animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      h3 { font-size: 1.15rem; }
      .close-modal-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-secondary);
        cursor: pointer;
        &:hover { color: var(--text-primary); }
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .summary-top-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background-color: var(--bg-color);
      padding: 14px;
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
    }

    .sum-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8rem;
      .lbl { color: var(--text-secondary); }
      .val { color: var(--text-primary); }
    }

    .section-title {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 8px;
    }

    .details-table-wrap {
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      overflow-x: auto;
    }

    .details-items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;

      th {
        padding: 8px 12px;
        background-color: var(--bg-color);
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-color);
        text-align: left;
      }

      td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
      }
    }

    .obs-panel {
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      .lbl { color: var(--text-secondary); font-weight: 500; }
      .obs-body {
        padding: 10px;
        background-color: var(--bg-color);
        border-radius: 4px;
        border-left: 3px solid var(--accent-color);
      }
    }

    .totals-summary-drawer {
      background-color: var(--bg-color);
      padding: 12px 16px;
      border-radius: var(--border-radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      margin-top: 10px;

      .tot-row {
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

    .modal-foot {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    @keyframes zoomIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class HistorialComponent implements OnInit {
  sales: Venta[] = [];
  filteredSales: Venta[] = [];

  // Filter bindings
  filters: {
    startDate?: string;
    endDate?: string;
    clientName?: string;
    status?: VentaStatus;
    paymentMethod?: PaymentMethod;
    cashier?: string;
  } = {};

  statusOptions: VentaStatus[] = [
    'Pagada',
    'Cancelada',
    'Devuelta',
    'Pago parcial',
    'En espera de inventario',
    'Producto reservado',
    'Producto sin existencia',
    'Producto surtido parcialmente',
    'En proceso de entrega',
    'Entregada',
    'Crédito pendiente',
    'Cambio solicitado'
  ];

  selectedTicketSale: Venta | null = null;
  selectedDetailSale: Venta | null = null;

  constructor(
    private historialService: HistorialService,
    private notificationService: NotificationService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.historialService.getSales().subscribe(sales => {
      this.sales = sales;
      this.filteredSales = sales;
      this.changeDetector.markForCheck();
    });
  }

  onFilterChange(): void {
    this.historialService.getFilteredSales(this.filters).subscribe(res => {
      this.filteredSales = res;
      this.changeDetector.markForCheck();
    });
  }

  resetFilters(): void {
    this.filters = {};
    this.filteredSales = this.sales;
    this.notificationService.info('Filtros reiniciados.');
  }

  getStatusClass(status: VentaStatus): string {
    const slug = status.toLowerCase()
      .replace(/ /g, '-')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u');
    return `badge-${slug}`;
  }

  // Actions
  openDetailModal(sale: Venta): void {
    this.selectedDetailSale = sale;
  }

  closeDetailModal(): void {
    this.selectedDetailSale = null;
  }

  reprintTicket(sale: Venta): void {
    this.selectedTicketSale = sale;
  }

  exportExcel(): void {
    this.notificationService.success('Preparando datos para Excel...');
    
    // Generate CSV data from sales
    setTimeout(() => {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Folio,Fecha,Hora,Cliente,Cajero,NumProductos,Total,MetodoPago,Estado,Observaciones\n';
      
      this.filteredSales.forEach(s => {
        csvContent += `"${s.folio}","${s.date}","${s.time}","${s.client.name}","${s.cashier}",${s.numProducts},${s.total},"${s.paymentMethod}","${s.status}","${s.observation || ''}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'historial_ventas.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notificationService.success('Archivo Excel (CSV) descargado con éxito.');
    }, 800);
  }

  exportPdf(): void {
    this.notificationService.success('Preparando exportación a PDF...');
    
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Simulated PDF Export of Sales Log: ' + this.filteredSales.length + ' records.');
      link.setAttribute('download', 'historial_ventas.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.notificationService.success('Documento PDF descargado con éxito.');
    }, 1000);
  }
}
