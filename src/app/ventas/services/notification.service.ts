import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  text: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  constructor() {}

  show(text: string, type: ToastMessage['type'] = 'info', title?: string, duration: number = 3000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, text, title, duration };
    
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);
    this.snackBar.open(title ? `${title}: ${text}` : text, 'Cerrar', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`ventas-aviso-${type}`],
    });

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(text: string, title: string = 'Éxito'): void {
    this.show(text, 'success', title);
  }

  error(text: string, title: string = 'Error'): void {
    this.show(text, 'danger', title);
  }

  warning(text: string, title: string = 'Advertencia'): void {
    this.show(text, 'warning', title);
  }

  info(text: string, title: string = 'Información'): void {
    this.show(text, 'info', title);
  }

  remove(id: string): void {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }
}
