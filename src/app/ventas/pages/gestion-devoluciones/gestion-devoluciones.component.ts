import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DevolucionService } from '../../services/devolucion.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Devolucion, DevolucionStatus, DevolucionPriority } from '../../models/devolucion.model';
import { TimelineComponent } from '../../components/timeline/timeline.component';

@Component({
  selector: 'app-gestion-devoluciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule, TimelineComponent],
  template: `
    <div class="returns-admin-page animate-fade-in">
      <!-- Title Header -->
      <div class="admin-header card-premium">
        <div class="head-left">
          <h3>Cola de Devoluciones</h3>
          <p class="text-secondary text-xs">Módulo exclusivo de auditoría, conciliación e ingreso físico al almacén.</p>
        </div>
        <div class="filter-row">
          <label for="priority-f font-semibold">Prioridad:</label>
          <mat-select id="priority-f" class="form-control mini-sel" [(ngModel)]="priorityFilter" (selectionChange)="applyFilters()">
            <mat-option value="Todas">Todas</mat-option>
            <mat-option value="Alta">Alta</mat-option>
            <mat-option value="Media">Media</mat-option>
            <mat-option value="Baja">Baja</mat-option>
          </mat-select>
        </div>
      </div>

      <!-- Main Returns Queue Grid Table -->
      <div class="table-container card-premium">
        <table class="returns-table">
          <thead>
            <tr>
              <th>Folio Dev</th>
              <th>Folio Venta</th>
              <th>Cliente</th>
              <th>Fecha Solicitud</th>
              <th>Producto</th>
              <th class="text-center">Cant</th>
              <th>Motivo</th>
              <th class="text-center">Prioridad</th>
              <th class="text-center">Estado</th>
              <th>Responsable</th>
              <th class="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ret of filteredReturns">
              <td class="font-bold dev-number" (click)="openDetailDrawer(ret)">{{ ret.returnNumber }}</td>
              <td class="font-semibold">{{ ret.saleFolio }}</td>
              <td>{{ ret.client.name }}</td>
              <td>{{ ret.date }}</td>
              <td>
                <span class="prod-text-sm" [title]="ret.items[0]?.product.name">
                  {{ ret.items[0]?.product.name }}
                </span>
              </td>
              <td class="text-center font-semibold">{{ ret.items[0]?.quantity }}</td>
              <td><span class="reason-tag">{{ ret.reason }}</span></td>
              <td class="text-center">
                <span [class]="'badge-custom ' + getPriorityClass(ret.priority)">
                  {{ ret.priority }}
                </span>
              </td>
              <td class="text-center">
                <span [class]="'badge-custom ' + getStatusClass(ret.status)">
                  {{ ret.status }}
                </span>
              </td>
              <td>{{ ret.responsibleEmployee }}</td>
              <td class="text-right">
                <button class="btn-premium btn-secondary btn-mini" (click)="openDetailDrawer(ret)">
                  Gestionar
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredReturns.length === 0">
              <td colspan="11" class="no-records-cell">
                No hay solicitudes de devolución registradas en esta prioridad.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail Drawer Modal Overlay (Slide-In Right or Centered overlay) -->
      <div class="modal-overlay" *ngIf="selectedReturn">
        <div class="drawer-card card-premium">
          <div class="drawer-head">
            <div class="head-title">
              <h3>Gestión de Solicitud {{ selectedReturn.returnNumber }}</h3>
              <span class="sub">Venta Vinculada: {{ selectedReturn.saleFolio }}</span>
            </div>
            <button class="close-drawer-btn" (click)="closeDetailDrawer()">&times;</button>
          </div>

          <div class="drawer-body">
            
            <!-- STEPPER TIMELINE COMPONENT -->
            <div class="timeline-wrapper-card">
              <h4>Línea de Tiempo del Proceso</h4>
              <app-timeline [returnData]="selectedReturn"></app-timeline>
            </div>

            <!-- Content Grid Info -->
            <div class="details-split-grid">
              
              <!-- Customer and sale info -->
              <div class="info-block">
                <h4>Información de la Venta</h4>
                <div class="info-details">
                  <p><strong>Cliente:</strong> {{ selectedReturn.client.name }}</p>
                  <p><strong>RFC Cte:</strong> {{ selectedReturn.client.rfc }}</p>
                  <p><strong>Fecha Registro:</strong> {{ selectedReturn.date }}</p>
                  <p><strong>Responsable:</strong> {{ selectedReturn.responsibleEmployee }}</p>
                </div>
              </div>

              <!-- Product info with picture placeholder -->
              <div class="info-block">
                <h4>Artículo Solicitado</h4>
                <div class="product-detail-card" *ngIf="selectedReturn.items[0] as item">
                  <div class="product-photo-placeholder">
                    <i class="fa-solid fa-box-open"></i>
                    <span>Foto de Inspección</span>
                  </div>
                  <div class="product-txt">
                    <span class="p-name font-bold">{{ item.product.name }}</span>
                    <span class="p-sku">SKU: {{ item.product.sku }}</span>
                    <span class="p-qty-desc">Cantidad devuelta: <strong>{{ item.quantity }} {{ item.product.unit }}</strong></span>
                    <span class="p-reason font-semibold">Motivo: {{ selectedReturn.reason }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Notes & Initial Comment -->
            <div class="comment-inspector-box" *ngIf="selectedReturn.comment">
              <span class="title-lbl">Diagnóstico de Reporte:</span>
              <p class="comment-body">{{ selectedReturn.comment }}</p>
            </div>

            <!-- Inventory Response Section (If it went to inventory) -->
            <div class="inventory-status-card" *ngIf="selectedReturn.inventoryResponse as inv">
              <div class="inv-card-head" [class.inv-approved]="inv.approved" [class.inv-rejected]="!inv.approved">
                <i [class]="inv.approved ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                <span>Respuesta del Almacén (Inventario)</span>
              </div>
              <div class="inv-card-body">
                <p><strong>Estatus Validación:</strong> {{ inv.approved ? 'Validado con éxito' : 'Rechazado en inspección física' }}</p>
                <p><strong>Lote Asignado:</strong> {{ inv.batch }}</p>
                <p><strong>Número de Serie:</strong> {{ inv.serialNumber }}</p>
                <p><strong>Casillero / Ubicación:</strong> {{ inv.warehouseLocation }}</p>
                <p class="text-secondary text-xs mt-2"><em>Fecha Validación: {{ inv.timestamp }}</em></p>
                <p class="details-msg mt-1 font-semibold">Detalle: {{ inv.details }}</p>
              </div>
            </div>

            <!-- Timeline history list logs -->
            <div class="history-logs-section">
              <h4>Registro de Movimientos</h4>
              <div class="logs-list">
                <div class="log-node" *ngFor="let step of selectedReturn.timeline">
                  <span class="log-dot" [class.completed]="step.completed"></span>
                  <div class="log-info">
                    <span class="log-status font-semibold">{{ step.status }}</span>
                    <span class="log-meta">Usuario: {{ step.user }} | {{ step.date }}</span>
                    <p class="log-comment" *ngIf="step.comment">"{{ step.comment }}"</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Actions inside drawer -->
          <div class="drawer-foot">
            <!-- Loading state indicator -->
            <div class="processing-bar" *ngIf="isLoadingAction">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Procesando llamada con Inventario (Simulando API)...</span>
            </div>

            <div class="actions-row" *ngIf="!isLoadingAction">
              <!-- Supervisor Review Stage -->
              <button 
                *ngIf="selectedReturn.status === 'Solicitud creada'" 
                class="btn-premium btn-accent" 
                (click)="supervisorReview()"
              >
                <i class="fa-solid fa-user-shield"></i> Revisar y Aprobar Inicial
              </button>

              <!-- Send to inventory stage -->
              <button 
                *ngIf="selectedReturn.status === 'Pendiente de revisión' || selectedReturn.status === 'Inventario rechazó ingreso'" 
                class="btn-premium btn-primary" 
                (click)="sendToInventory()"
              >
                <i class="fa-solid fa-truck-ramp-box"></i> Enviar a Almacén / Validar Inventario
              </button>

              <!-- Authorize Refund Stage -->
              <button 
                *ngIf="selectedReturn.status === 'Inventario aprobó ingreso'" 
                class="btn-premium btn-success" 
                (click)="approveRefund()"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i> Autorizar Reembolso
              </button>

              <!-- Reject return (available during early stages) -->
              <button 
                *ngIf="selectedReturn.status !== 'Proceso finalizado' && selectedReturn.status !== 'Reembolso realizado' && selectedReturn.status !== 'Devolución rechazada' && selectedReturn.status !== 'Reembolso pendiente' && selectedReturn.status !== 'Devolución autorizada'" 
                class="btn-premium btn-danger" 
                (click)="openRejectionDialog()"
              >
                <i class="fa-solid fa-ban"></i> Rechazar Devolución
              </button>

              <!-- Close process -->
              <button 
                *ngIf="selectedReturn.status === 'Devolución rechazada' || selectedReturn.status === 'Reembolso realizado'"
                class="btn-premium btn-primary"
                (click)="closeProcess()"
              >
                Finalizar Proceso
              </button>

              <button class="btn-premium btn-secondary" (click)="closeDetailDrawer()">Cerrar Panel</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rejection Textbox Modal overlay -->
      <div class="modal-overlay" *ngIf="showRejectionModal" style="z-index: 1100;">
        <div class="modal-card card-premium" style="max-width: 440px;">
          <div class="modal-head">
            <h3>Motivo del Rechazo</h3>
            <button class="close-modal-btn" (click)="showRejectionModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="rej-comment">Escriba el motivo técnico del rechazo *</label>
              <textarea matInput id="rej-comment" class="form-control" rows="3" [(ngModel)]="rejectionComment" placeholder="Ej. El empaque presenta golpes ajenos al transporte..."></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-premium btn-secondary" (click)="showRejectionModal = false">Cancelar</button>
            <button class="btn-premium btn-danger" (click)="submitRejection()">Confirmar Rechazo</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .returns-admin-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px !important;
    }

    .head-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mini-sel {
      width: 120px;
      height: 36px;
      padding: 4px 8px;
    }

    /* Table container */
    .table-container {
      padding: 0 !important;
      overflow-x: auto;
    }

    .returns-table {
      th {
        padding: 14px 16px;
      }

      td {
        padding: 14px 16px;
      }
    }

    .dev-number {
      color: var(--accent-color);
      cursor: pointer;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-weight: 700;
      &:hover { text-decoration: underline; }
    }

    .prod-text-sm {
      display: block;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .reason-tag {
      font-size: 0.76rem;
      background-color: var(--bg-color);
      padding: 3px 8px;
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }

    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .no-records-cell {
      text-align: center;
      padding: 40px !important;
      color: var(--text-secondary);
    }

    .btn-mini {
      padding: 4px 10px;
      font-size: 0.78rem;
    }

    /* Priority classes */
    .badge-alta { background-color: var(--danger-light); color: var(--danger-color); }
    .badge-media { background-color: var(--warning-light); color: var(--warning-color); }
    .badge-baja { background-color: var(--accent-light); color: var(--accent-color); }

    /* Return statuses classes */
    .badge-solicitud-creada, .badge-pendiente-de-revision { background-color: var(--warning-light); color: var(--warning-color); }
    .badge-esperando-respuesta-de-inventario, .badge-inventario-validando-existencia { background-color: rgba(124, 58, 237, 0.1); color: #7c3aed; }
    .badge-inventario-aprobo-ingreso, .badge-devolucion-autorizada { background-color: #e6f4ea; color: #1e8e3e; }
    .badge-inventario-rechazo-ingreso, .badge-devolucion-rechazada { background-color: var(--danger-light); color: var(--danger-color); }
    .badge-reembolso-pendiente, .badge-reembolso-realizado { background-color: #e6f4ea; color: #1e8e3e; }
    .badge-proceso-finalizado { background-color: #e6f4ea; color: #1e8e3e; }

    /* Drawer Modal Slide-In Layout */
    .drawer-card {
      max-width: 780px;
      width: 100%;
      height: 95vh;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .drawer-head {
      .head-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        h3 { font-size: 1.2rem; }
        .sub { font-size: 0.78rem; color: var(--text-secondary); }
      }
    }

    .timeline-wrapper-card {
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: 16px;
      h4 { font-size: 0.9rem; margin-bottom: -10px; }
    }

    /* Details Grid */
    .details-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .info-block {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      h4 {
        font-size: 0.92rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 6px;
      }
    }

    .info-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--text-primary);
    }

    /* Product layout card */
    .product-detail-card {
      display: flex;
      gap: 14px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      padding: 10px;
    }

    .product-photo-placeholder {
      width: 72px;
      height: 72px;
      border-radius: var(--border-radius-sm);
      background-color: var(--panel-bg);
      border: 1px dashed var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--text-secondary);
      opacity: 0.6;
      flex-shrink: 0;
      
      i { font-size: 1.15rem; }
      span { font-size: 0.62rem; text-align: center; }
    }

    .product-txt {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.78rem;
      .p-name { font-size: 0.84rem; color: var(--text-primary); }
      .p-sku { color: var(--text-secondary); }
      .p-reason { color: var(--danger-color); margin-top: 2px; }
    }

    /* Comment inspector */
    .comment-inspector-box {
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      .title-lbl { color: var(--text-secondary); font-weight: 500; }
      .comment-body {
        padding: 12px;
        background-color: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        line-height: 1.4;
      }
    }

    /* Inventory response card */
    .inventory-status-card {
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      overflow: hidden;

      .inv-card-head {
        padding: 10px 14px;
        color: #ffffff;
        font-weight: 600;
        font-size: 0.84rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .inv-approved { background-color: var(--success-color); }
      .inv-rejected { background-color: var(--danger-color); }

      .inv-card-body {
        padding: 14px;
        font-size: 0.8rem;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    }

    /* Logs list */
    .history-logs-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      h4 { font-size: 0.92rem; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
    }

    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 8px;
    }

    .log-node {
      display: flex;
      gap: 14px;
      position: relative;
      
      .log-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--border-color);
        margin-top: 4px;
        flex-shrink: 0;
        z-index: 2;

        &.completed {
          background-color: var(--accent-color);
        }
      }

      .log-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.78rem;
      }

      .log-status { color: var(--text-primary); }
      .log-meta { color: var(--text-secondary); font-size: 0.72rem; }
      .log-comment { color: var(--text-secondary); font-style: italic; margin-top: 2px; }
    }

    /* Drawer Footer options */
    .drawer-foot {
      border-top: 1px solid var(--border-color);
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .processing-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 0.85rem;
      color: var(--accent-color);
      padding: 10px;
      background-color: var(--accent-light);
      border-radius: var(--border-radius-sm);
    }

    .actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mt-2 { margin-top: 8px; }
    .mt-1 { margin-top: 4px; }

    @keyframes slideIn {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class GestionDevolucionesComponent implements OnInit {
  returnsList: Devolucion[] = [];
  filteredReturns: Devolucion[] = [];

  priorityFilter = 'Todas';
  selectedReturn: Devolucion | null = null;
  isLoadingAction = false;

  // Rejection modal state
  showRejectionModal = false;
  rejectionComment = '';

  constructor(
    private devolucionService: DevolucionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReturns();
  }

  loadReturns(): void {
    this.devolucionService.getReturns().subscribe(list => {
      this.returnsList = list;
      this.applyFilters();
      
      // Update selectedReturn in-place if drawer is open to keep UI fresh
      if (this.selectedReturn) {
        const fresh = list.find(r => r.id === this.selectedReturn!.id);
        if (fresh) this.selectedReturn = fresh;
      }
      this.changeDetector.markForCheck();
    });
  }

  applyFilters(): void {
    if (this.priorityFilter === 'Todas') {
      this.filteredReturns = this.returnsList;
    } else {
      this.filteredReturns = this.returnsList.filter(r => r.priority === this.priorityFilter);
    }
  }

  getPriorityClass(priority: DevolucionPriority): string {
    return `badge-${priority.toLowerCase()}`;
  }

  getStatusClass(status: DevolucionStatus): string {
    const slug = status.toLowerCase()
      .replace(/ /g, '-')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u');
    return `badge-${slug}`;
  }

  openDetailDrawer(ret: Devolucion): void {
    this.selectedReturn = ret;
  }

  closeDetailDrawer(): void {
    this.selectedReturn = null;
  }

  // Workflows
  supervisorReview(): void {
    const user = this.authService.getCurrentUser();
    this.devolucionService.updateReturnStatus(
      this.selectedReturn!.id, 
      'Pendiente de revisión', 
      user.name, 
      'Supervisor autoriza revisión física e instruye envío a inventario.'
    ).subscribe(() => {
      this.loadReturns();
    });
  }

  sendToInventory(): void {
    const user = this.authService.getCurrentUser();
    this.isLoadingAction = true;

    // Call service (which simulates delayed InventoryService checks)
    this.devolucionService.sendToInventory(this.selectedReturn!.id, user.name).subscribe({
      next: (success) => {
        this.isLoadingAction = false;
        this.loadReturns();
        if (success) {
          this.notificationService.success('Inventario validado exitosamente en el almacén.');
        } else {
          this.notificationService.error('Inventario rechazó el ingreso del artículo.');
        }
      },
      error: () => {
        this.isLoadingAction = false;
      }
    });
  }

  approveRefund(): void {
    const user = this.authService.getCurrentUser();
    this.isLoadingAction = true;

    this.devolucionService.approveRefund(this.selectedReturn!.id, user.name).subscribe(() => {
      this.isLoadingAction = false;
      this.loadReturns();
      this.notificationService.success('Reembolso procesado y devolución finalizada con éxito.');
    });
  }

  openRejectionDialog(): void {
    this.rejectionComment = '';
    this.showRejectionModal = true;
  }

  submitRejection(): void {
    if (!this.rejectionComment.trim()) {
      this.notificationService.warning('Escriba una justificación para el rechazo.');
      return;
    }

    const user = this.authService.getCurrentUser();
    this.showRejectionModal = false;
    this.isLoadingAction = true;

    this.devolucionService.rejectReturn(
      this.selectedReturn!.id, 
      user.name, 
      `Rechazado por Supervisor: ${this.rejectionComment}`
    ).subscribe(() => {
      this.isLoadingAction = false;
      this.loadReturns();
    });
  }

  closeProcess(): void {
    const user = this.authService.getCurrentUser();
    this.devolucionService.updateReturnStatus(
      this.selectedReturn!.id,
      'Proceso finalizado',
      user.name,
      'Solicitud archivada.'
    ).subscribe(() => {
      this.loadReturns();
      this.closeDetailDrawer();
    });
  }
}
