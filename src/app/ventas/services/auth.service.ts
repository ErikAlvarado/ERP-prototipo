import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { MOCK_USERS } from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User>(MOCK_USERS[0]); // Default: Cajero
  public currentUser$: Observable<User> = this.currentUserSubject.asObservable();

  constructor() {}

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
}
