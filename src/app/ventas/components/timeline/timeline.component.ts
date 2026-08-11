import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Devolucion, DevolucionStatus } from '../../models/devolucion.model';

interface TimelineStepUI {
  id: number;
  label: string;
  icon: string;
  matchingStatuses: DevolucionStatus[];
  completed: boolean;
  active: boolean;
  failed: boolean;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      <div class="timeline-steps">
        <div 
          *ngFor="let step of steps; let i = index" 
          [class]="'step-node ' + (step.completed ? 'completed ' : '') + (step.active ? 'active ' : '') + (step.failed ? 'failed ' : '')"
        >
          <!-- Line connector -->
          <div class="step-connector" *ngIf="i > 0"></div>

          <!-- Icon node -->
          <div class="step-icon-circle" [title]="step.label">
            <i [class]="step.icon"></i>
            <div class="pulse-ring" *ngIf="step.active && !step.failed"></div>
          </div>

          <!-- Label -->
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      width: 100%;
      padding: 30px 10px 15px 10px;
      overflow-x: auto;
    }

    .timeline-steps {
      display: flex;
      justify-content: space-between;
      min-width: 600px;
      position: relative;
    }

    .step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
      z-index: 1;

      /* Line connector */
      .step-connector {
        position: absolute;
        top: 20px;
        left: -50%;
        width: 100%;
        height: 4px;
        background-color: var(--border-color);
        z-index: -1;
        transition: background-color 0.4s ease;
      }

      &.completed .step-connector {
        background-color: var(--success-color);
      }

      &.failed .step-connector {
        background-color: var(--danger-color);
      }

      /* Circle indicator */
      .step-icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background-color: var(--bg-color);
        border: 3px solid var(--border-color);
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        cursor: default;
        position: relative;
        transition: all 0.3s ease;
      }

      /* State Styling */
      &.completed {
        .step-icon-circle {
          background-color: var(--success-color);
          border-color: var(--success-color);
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
        }
      }

      &.active {
        .step-icon-circle {
          background-color: var(--panel-bg);
          border-color: var(--accent-color);
          color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }
      }

      &.failed {
        .step-icon-circle {
          background-color: var(--danger-color);
          border-color: var(--danger-color);
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.25);
        }
      }

      /* Labels */
      .step-label {
        margin-top: 10px;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-align: center;
        max-width: 110px;
        transition: color 0.3s ease;
      }

      &.active .step-label {
        color: var(--accent-color);
        font-weight: 600;
      }

      &.completed .step-label {
        color: var(--text-primary);
      }

      &.failed .step-label {
        color: var(--danger-color);
      }
    }

    /* Pulse effect for active */
    .pulse-ring {
      position: absolute;
      top: -3px;
      left: -3px;
      width: 44px;
      height: 44px;
      border: 3px solid var(--accent-color);
      border-radius: 50%;
      animation: pulse 1.6s infinite ease-in-out;
      opacity: 0;
      pointer-events: none;
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.3); opacity: 0; }
    }
  `]
})
export class TimelineComponent implements OnChanges {
  @Input() returnData!: Devolucion;

  steps: TimelineStepUI[] = [
    { 
      id: 1, 
      label: 'Solicitud creada', 
      icon: 'fa-solid fa-file-invoice', 
      matchingStatuses: ['Solicitud creada'],
      completed: false, active: false, failed: false 
    },
    { 
      id: 2, 
      label: 'Supervisor revisó', 
      icon: 'fa-solid fa-user-shield', 
      matchingStatuses: ['Pendiente de revisión'],
      completed: false, active: false, failed: false 
    },
    { 
      id: 3, 
      label: 'Inventario validó', 
      icon: 'fa-solid fa-boxes-stacked', 
      matchingStatuses: ['Esperando respuesta de Inventario', 'Inventario validando existencia'],
      completed: false, active: false, failed: false 
    },
    { 
      id: 4, 
      label: 'Producto recibido', 
      icon: 'fa-solid fa-circle-down', 
      matchingStatuses: ['Inventario aprobó ingreso', 'Inventario rechazó ingreso'],
      completed: false, active: false, failed: false 
    },
    { 
      id: 5, 
      label: 'Reembolso autorizado', 
      icon: 'fa-solid fa-hand-holding-dollar', 
      matchingStatuses: ['Devolución autorizada', 'Devolución rechazada', 'Reembolso pendiente'],
      completed: false, active: false, failed: false 
    },
    { 
      id: 6, 
      label: 'Proceso terminado', 
      icon: 'fa-solid fa-flag-checkered', 
      matchingStatuses: ['Reembolso realizado', 'Proceso finalizado'],
      completed: false, active: false, failed: false 
    }
  ];

  ngOnChanges(): void {
    if (this.returnData) {
      this.calculateTimeline();
    }
  }

  private calculateTimeline(): void {
    const currentStatus = this.returnData.status;
    const isRejected = currentStatus === 'Devolución rechazada' || currentStatus === 'Inventario rechazó ingreso';

    // Find the index of the step matching the current status
    let currentStepIndex = -1;
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].matchingStatuses.includes(currentStatus)) {
        currentStepIndex = i;
        break;
      }
    }

    // Special fallback in case status isn't matched exactly
    if (currentStepIndex === -1) {
      if (currentStatus === 'Proceso finalizado') {
        currentStepIndex = 5;
      } else {
        currentStepIndex = 1;
      }
    }

    this.steps.forEach((step, idx) => {
      // 1. Completed
      step.completed = idx < currentStepIndex;
      
      // 2. Active
      step.active = idx === currentStepIndex;
      
      // 3. Failed
      if (isRejected && idx === currentStepIndex) {
        step.failed = true;
      } else {
        step.failed = false;
      }

      // If a previous step was failed, make this one failed as well
      if (isRejected && idx > currentStepIndex) {
        step.completed = false;
        step.active = false;
        step.failed = false; // keep it greyed out/unused
      }
    });

    // Special Case: if process is finalized, make last step completed
    if (currentStatus === 'Proceso finalizado' || currentStatus === 'Reembolso realizado') {
      this.steps[5].completed = true;
      this.steps[5].active = false;
    }
  }
}
