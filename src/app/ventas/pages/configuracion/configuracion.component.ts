import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User, UserRole } from '../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule],
  template: `
    <div class="config-page animate-fade-in" *ngIf="currentUser$ | async as user">
      
      <div class="config-grid">
        
        <!-- Left Side: Cashier Profile Configuration -->
        <div class="card-premium config-card">
          <div class="card-title-row">
            <i class="fa-solid fa-user-gear text-accent"></i>
            <h3>Simulación de Sesión</h3>
          </div>
          <p class="text-secondary text-xs">Configure los datos de empleado para las transacciones generadas en la terminal de cobro (PDV).</p>

          <div class="form-group mt-3">
            <label for="emp-name">Nombre de Empleado</label>
            <input matInput type="text" id="emp-name" class="form-control" [(ngModel)]="user.name" />
          </div>

          <div class="form-group">
            <label for="emp-id">Identificador ID de Empleado</label>
            <input matInput type="text" id="emp-id" class="form-control" [(ngModel)]="user.employeeId" />
          </div>

          <div class="form-group">
            <label for="emp-role">Rol Asignado</label>
            <mat-select id="emp-role" class="form-control" [ngModel]="user.role" (ngModelChange)="onRoleSelect($event)">
              <mat-option value="Cajero">Cajero (Caja 01)</mat-option>
              <mat-option value="Supervisor">Supervisor (Caja / Almacén)</mat-option>
              <mat-option value="Admin">Administrador (Acceso Completo)</mat-option>
            </mat-select>
          </div>

          <div class="form-group">
            <label>Estado de la Caja</label>
            <div class="toggle-status-bar" (click)="toggleOnline()">
              <span [class]="'indicator-dot ' + (user.status === 'Online' ? 'online' : 'offline')"></span>
              <span class="font-semibold">{{ user.status === 'Online' ? 'En Línea (Conectado a Red)' : 'Fuera de Línea (Local)' }}</span>
              <button class="btn-premium btn-text font-bold">Cambiar</button>
            </div>
          </div>

          <button class="btn-premium btn-accent save-btn" (click)="saveSessionConfig()">
            Guardar Configuración
          </button>
        </div>

        <!-- Right Side: Preferences Configuration -->
        <div class="card-premium config-card">
          <div class="card-title-row">
            <i class="fa-solid fa-sliders text-accent"></i>
            <h3>Preferencias Visuales</h3>
          </div>
          <p class="text-secondary text-xs">Ajuste la apariencia del sistema para optimizar la visualización en pantallas de caja.</p>

          <div class="pref-item">
            <div class="pref-txt">
              <span class="pref-title font-semibold">Impresión Automática</span>
              <span class="pref-sub text-secondary">Disparar la cola de impresión térmica de tickets al cerrar cobro en POS.</span>
            </div>
            <div class="pref-action">
              <button class="btn-premium btn-accent" (click)="togglePref('print')">
                {{ printAuto ? 'Habilitado' : 'Deshabilitado' }}
              </button>
            </div>
          </div>

          <div class="pref-item mt-3">
            <div class="pref-txt">
              <span class="pref-title font-semibold">Descarga Automática de PDF</span>
              <span class="pref-sub text-secondary">Generar y descargar el comprobante digital fiscal en PDF de forma automática.</span>
            </div>
            <div class="pref-action">
              <button class="btn-premium btn-secondary" (click)="togglePref('pdf')">
                {{ pdfAuto ? 'Deshabilitado' : 'Habilitado' }}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .config-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .config-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px !important;
    }

    .card-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      
      i { font-size: 1.25rem; }
      h3 { font-size: 1.1rem; }
    }

    .toggle-status-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      font-size: 0.85rem;
      position: relative;

      .indicator-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--danger-color);
        &.online { background-color: var(--success-color); box-shadow: 0 0 6px var(--success-color); }
      }

      button {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        padding: 4px 10px;
      }
    }

    .save-btn {
      margin-top: 8px;
      height: 44px;
    }

    /* Preferences */
    .pref-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
    }

    .pref-txt {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      padding-right: 16px;
    }

    .pref-title {
      font-size: 0.88rem;
      color: var(--text-primary);
    }

    .pref-sub {
      font-size: 0.72rem;
      line-height: 1.3;
    }

    .pref-action {
      flex-shrink: 0;
      button {
        padding: 6px 14px;
        font-size: 0.82rem;
      }
    }

    .mt-3 { margin-top: 12px; }
  `]
})
export class ConfiguracionComponent implements OnInit {
  currentUser$!: Observable<User>;
  
  printAuto = true;
  pdfAuto = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    document.body.classList.remove('dark-theme');
    localStorage.removeItem('theme');
    this.currentUser$ = this.authService.currentUser$;
  }

  onRoleSelect(role: UserRole): void {
    this.authService.switchRole(role);
    this.notificationService.success(`Rol cambiado a: ${role}`);
  }

  toggleOnline(): void {
    this.authService.toggleOnlineStatus();
    const user = this.authService.getCurrentUser();
    this.notificationService.info(`Sesión de Caja: ${user.status}`);
  }

  togglePref(type: string): void {
    if (type === 'print') {
      this.printAuto = !this.printAuto;
    } else if (type === 'pdf') {
      this.pdfAuto = !this.pdfAuto;
    }
    this.notificationService.success('Preferencias actualizadas.');
  }

  saveSessionConfig(): void {
    const user = this.authService.getCurrentUser();
    this.notificationService.success(`Parámetros de cajero guardados en sesión: ${user.name}`);
  }
}
