import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { Observable } from 'rxjs';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar-wrapper" *ngIf="currentUser$ | async as user">
      <!-- Top Logo Zyroit Branding -->
      <div class="sidebar-header">
        <div class="brand-container">
          <div class="brand-logo-img">
            <img src="/logo.png" alt="Zyroit logo" />
          </div>
          <span class="brand-name">ZYROIT</span>
          <span class="brand-badge">VENTAS</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <ul>
          <li *ngFor="let item of menuItems">
            <a 
              *ngIf="canAccess(item, user)"
              [routerLink]="item.path" 
              routerLinkActive="active-link" 
              [routerLinkActiveOptions]="{exact: item.path === '/'}"
              class="nav-anchor"
            >
              <i [class]="item.icon + ' nav-icon'"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- Bottom Status & Theme Selector -->
      <div class="sidebar-footer">
        <div class="status-wrap" (click)="toggleStatus()">
          <span [class]="'status-indicator ' + (user.status === 'Online' ? 'status-online' : 'status-offline')"></span>
          <span class="status-label">{{ user.status }}</span>
        </div>
        <button class="theme-toggle" (click)="toggleTheme()" title="Cambiar tema">
          <i [class]="isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-wrapper {
      background-color: #f8fafc;
      color: #475569;
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .sidebar-header {
      height: var(--navbar-height);
      background-color: #005bb5;
      padding: 0 16px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
    }

    .brand-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-logo-img {
      width: 32px;
      height: 32px;
      background-color: #ffffff; 
      border-radius: 6px;        
      padding: 3px;              
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }

    .brand-logo-img img {
      height: 100%;
      width: 100%;
      object-fit: contain;
    }

    .brand-name {
      font-weight: 700;
      font-size: 17px;
      letter-spacing: 0.8px;
      color: #ffffff;
    }

    .brand-badge {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 14px;
      overflow-y: auto;

      ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }

    .nav-anchor {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      color: #475569;
      text-decoration: none;
      border-radius: var(--border-radius-sm);
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        color: #0284c7;
        background-color: #f0f9ff;
        
        .nav-icon {
          color: #0284c7;
        }
      }
    }

    .active-link {
      color: #ffffff !important;
      background-color: #0284c7 !important;
      font-weight: 600;
      box-shadow: none;

      .nav-icon {
        color: #ffffff !important;
      }
    }

    .nav-icon {
      font-size: 1.1rem;
      width: 20px;
      text-align: center;
      color: #64748b;
      transition: color 0.2s ease;
    }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid #e2e8f0;
      background-color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      width: fit-content;
      &:hover {
        opacity: 0.8;
      }
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-online { background-color: var(--success-color); }
    .status-offline { background-color: var(--danger-color); }

    .status-label {
      font-size: 0.78rem;
      font-weight: 500;
      color: #475467;
    }

    .theme-toggle {
      background: none;
      border: none;
      color: #475569;
      cursor: pointer;
      font-size: 1.05rem;
      padding: 6px;
      border-radius: var(--border-radius-sm);
      transition: background-color 0.2s, color 0.2s;

      &:hover {
        color: #1f2937;
        background-color: #e2e8f0;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  currentUser$!: Observable<User>;
  isDarkMode = false;

  menuItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-chart-line', roles: ['Admin'] },
    { label: 'Punto de Venta', path: '/pdv', icon: 'fa-solid fa-cash-register', roles: ['Cajero', 'Supervisor', 'Admin'] },
    { label: 'Cotizaciones', path: '/cotizaciones', icon: 'fa-solid fa-file-invoice-dollar', roles: ['Cajero', 'Supervisor', 'Admin'] },
    { label: 'Historial de Ventas', path: '/historial', icon: 'fa-solid fa-clock-rotate-left', roles: ['Supervisor', 'Admin'] },
    { label: 'Devoluciones', path: '/devoluciones', icon: 'fa-solid fa-rotate-left', roles: ['Cajero', 'Supervisor', 'Admin'] },
    { label: 'Gestión de Devoluciones', path: '/gestion-devoluciones', icon: 'fa-solid fa-arrows-spin', roles: ['Supervisor', 'Admin'] },
    { label: 'Configuración', path: '/configuracion', icon: 'fa-solid fa-gears', roles: ['Cajero', 'Supervisor', 'Admin'] }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    
    // Check local storage for theme setting
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.body.classList.add('dark-theme');
    }
  }

  canAccess(item: NavItem, user: User): boolean {
    return user.status === 'Online' && item.roles.includes(user.role);
  }

  toggleStatus(): void {
    this.authService.toggleOnlineStatus();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }
}
