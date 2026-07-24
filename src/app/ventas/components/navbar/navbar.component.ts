import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar-wrapper" *ngIf="currentUser$ | async as user">
      <!-- Título de Página del Prototipo -->
      <div class="page-title-wrap">
        <span class="page-title-text">{{ currentTitle }}</span>
      </div>

      <!-- Right Hand Controls -->
      <div class="nav-controls">
        <!-- Global Search Bar -->
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" placeholder="Buscador global..." class="search-input" />
        </div>

        <!-- Role Quick Switcher -->
        <div class="role-selector-container">
          <label class="role-select-label" for="role-select">Simular Rol:</label>
          <select id="role-select" class="role-select" [value]="user.role" (change)="onRoleChange($event)">
            <option value="Cajero">Cajero (Caja 01)</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Admin">Administrador</option>
          </select>
        </div>

        <!-- Notifications Panel Trigger -->
        <div class="notification-trigger" (click)="toggleNotifications()" title="Ver notificaciones">
          <i class="fa-regular fa-bell"></i>
          <span class="badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          
          <!-- Dropdown -->
          <div class="notifications-dropdown" *ngIf="showNotifications">
            <div class="dropdown-header">
              <h3>Notificaciones</h3>
              <button (click)="clearNotifications($event)">Limpiar</button>
            </div>
            <div class="dropdown-body">
              <div class="notification-item" *ngFor="let note of notifications">
                <span class="note-dot"></span>
                <div class="note-content">
                  <p class="note-text">{{ note.text }}</p>
                  <span class="note-time">{{ note.time }}</span>
                </div>
              </div>
              <div class="no-notifications" *ngIf="notifications.length === 0">
                <i class="fa-regular fa-folder-open"></i>
                <p>Sin alertas pendientes</p>
              </div>
            </div>
          </div>
        </div>

        <!-- User Profile mimicking prototype -->
        <div class="user-profile">
          <div class="user-avatar">{{ user.name.slice(0, 2).toUpperCase() }}</div>
          <div class="user-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role">{{ user.role }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      height: var(--navbar-height);
      background-color: #005bb5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      transition: background-color var(--transition-speed) ease;
    }

    .page-title-wrap {
      display: flex;
      align-items: center;
    }

    .page-title-text {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.5px;
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .search-box {
      position: relative;
      width: 200px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 34px;
      font-family: inherit;
      font-size: 0.88rem;
      background-color: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-sm);
      color: #ffffff;
      outline: none;
      transition: border-color 0.2s, background-color 0.2s;

      &::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      &:focus {
        border-color: #ffffff;
        background-color: #ffffff;
        color: #1f2937;
      }
    }

    .role-selector-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-select-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .role-select {
      padding: 6px 12px;
      font-family: inherit;
      font-size: 0.85rem;
      background-color: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-sm);
      color: #ffffff;
      outline: none;
      cursor: pointer;
      
      option {
        color: #1f2937;
        background-color: #ffffff;
      }

      &:focus {
        border-color: #ffffff;
      }
    }

    .notification-trigger {
      position: relative;
      cursor: pointer;
      color: #ffffff;
      font-size: 1.25rem;
      width: 38px;
      height: 38px;
      border-radius: var(--border-radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgba(255, 255, 255, 0.12);
      }

      .badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background-color: #ef4444;
        color: #ffffff;
        font-size: 0.65rem;
        font-weight: 700;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #005bb5;
      }
    }

    .notifications-dropdown {
      position: absolute;
      top: 48px;
      right: 0;
      width: 320px;
      background-color: var(--panel-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-premium);
      z-index: 150;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.2s ease;
      cursor: default;
    }

    .dropdown-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 {
        font-size: 0.95rem;
        font-weight: 600;
      }

      button {
        background: none;
        border: none;
        color: var(--accent-color);
        font-size: 0.78rem;
        font-weight: 500;
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .dropdown-body {
      max-height: 280px;
      overflow-y: auto;
      padding: 8px 0;
    }

    .notification-item {
      padding: 10px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: background-color 0.2s;
      cursor: pointer;

      &:hover {
        background-color: var(--bg-color);
      }
    }

    .note-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-color);
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }

    .note-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .note-text {
      font-size: 0.82rem;
      color: var(--text-primary);
    }

    .note-time {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .no-notifications {
      padding: 30px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      i {
        font-size: 1.8rem;
        opacity: 0.4;
      }

      p {
        font-size: 0.82rem;
      }
    }

    /* Perfil de Usuario */
    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .user-profile:hover {
      background-color: rgba(255, 255, 255, 0.12);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #ffffff;
      color: #005bb5;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.2;
    }

    .user-role {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
    }

    @media (max-width: 600px) {
      .user-info {
        display: none;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  currentUser$!: Observable<User>;
  currentTitle = 'Dashboard';
  showNotifications = false;

  notifications = [
    { text: 'Solicitud de devolución DEV-30001 creada.', time: 'Hace 5 min' },
    { text: 'Alerta: Smart TV UHD 55" tiene pocas existencias (15 pzas).', time: 'Hace 1 hora' },
    { text: 'Cotización COT-20003 convertida a venta.', time: 'Hace 3 horas' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    
    // Listen for route changes to update breadcrumb title
    this.updateTitle(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitle(event.urlAfterRedirects);
    });
  }

  get unreadCount(): number {
    return this.notifications.length;
  }

  onRoleChange(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.authService.switchRole(role);
    
    // Redirect to POS if the user switched to cashier and is on a forbidden page
    const user = this.authService.getCurrentUser();
    if (user.role === 'Cajero' && (this.router.url.includes('dashboard') || this.router.url.includes('historial') || this.router.url.includes('gestion-devoluciones'))) {
      this.router.navigate(['/pdv']);
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  clearNotifications(event: Event): void {
    event.stopPropagation();
    this.notifications = [];
  }

  private updateTitle(url: string): void {
    if (url.includes('pdv')) {
      this.currentTitle = 'Punto de Venta (PDV)';
    } else if (url.includes('cotizaciones')) {
      this.currentTitle = 'Gestión de Cotizaciones';
    } else if (url.includes('historial')) {
      this.currentTitle = 'Historial de Ventas';
    } else if (url.includes('devoluciones')) {
      this.currentTitle = 'Iniciar Devolución';
    } else if (url.includes('gestion-devoluciones')) {
      this.currentTitle = 'Gestión de Devoluciones (Admin)';
    } else if (url.includes('configuracion')) {
      this.currentTitle = 'Configuración del Sistema';
    } else {
      this.currentTitle = 'Dashboard Operativo';
    }
  }
}
