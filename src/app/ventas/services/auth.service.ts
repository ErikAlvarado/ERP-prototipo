import { effect, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { MOCK_USERS } from './mock-data';
import { Autenticacion } from '../../shared/services/autenticacion';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly autenticacion = inject(Autenticacion);
  private readonly currentUserSubject = new BehaviorSubject<User>(this.usuarioSesion());
  readonly currentUser$: Observable<User> = this.currentUserSubject.asObservable();

  constructor() {
    effect(() => {
      this.autenticacion.sesion();
      this.currentUserSubject.next(this.usuarioSesion());
    });
  }

  getCurrentUser(): User {
    return this.currentUserSubject.value;
  }

  switchRole(role: UserRole): void {
    const matchedUser = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
    this.currentUserSubject.next({ ...matchedUser, status: 'Online' });
  }

  toggleOnlineStatus(): void {
    const user = this.currentUserSubject.value;
    const newStatus = user.status === 'Online' ? 'Offline' : 'Online';
    this.currentUserSubject.next({ ...user, status: newStatus });
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const user = this.currentUserSubject.value;
    return user.status === 'Online' && allowedRoles.includes(user.role);
  }

  private usuarioSesion(): User {
    const sesion = this.autenticacion.sesion();
    if (!sesion) return { ...MOCK_USERS[0], status: 'Offline' };
    const role: UserRole = this.autenticacion.esAdministrador() || this.autenticacion.puedeVerVentas()
      ? 'Admin'
      : 'Cajero';
    return {
      id: sesion.id,
      employeeId: `EMP-${sesion.id}`,
      name: sesion.nombre,
      role,
      status: 'Online',
    };
  }
}
