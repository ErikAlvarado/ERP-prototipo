import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastMessage } from '../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts$ | async" 
        [class]="'toast-item toast-' + toast.type"
        (click)="removeToast(toast.id)"
      >
        <div class="toast-icon">
          <i [class]="getIcon(toast.type)"></i>
        </div>
        <div class="toast-body">
          <h4 class="toast-title" *ngIf="toast.title">{{ toast.title }}</h4>
          <p class="toast-text">{{ toast.text }}</p>
        </div>
        <button class="toast-close">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 380px;
      width: 100%;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      background: var(--panel-bg);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-premium);
      border-left: 5px solid var(--accent-color);
      cursor: pointer;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: transform 0.2s, opacity 0.2s;

      &:hover {
        transform: translateY(-2px);
        opacity: 0.95;
      }
    }

    .toast-success { border-left-color: var(--success-color); }
    .toast-danger { border-left-color: var(--danger-color); }
    .toast-warning { border-left-color: var(--warning-color); }
    .toast-info { border-left-color: var(--info-color); }

    .toast-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .toast-success .toast-icon { color: var(--success-color); }
    .toast-danger .toast-icon { color: var(--danger-color); }
    .toast-warning .toast-icon { color: var(--warning-color); }
    .toast-info .toast-icon { color: var(--info-color); }

    .toast-body {
      flex: 1;
    }

    .toast-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .toast-text {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 0.5;
      &:hover {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastComponent implements OnInit {
  toasts$!: Observable<ToastMessage[]>;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.toasts$ = this.notificationService.toasts$;
  }

  removeToast(id: string): void {
    this.notificationService.remove(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'fa-solid fa-circle-check';
      case 'danger': return 'fa-solid fa-circle-xmark';
      case 'warning': return 'fa-solid fa-triangle-exclamation';
      default: return 'fa-solid fa-circle-info';
    }
  }
}
