export type UserRole = 'Admin' | 'Supervisor' | 'Cajero';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  status: 'Online' | 'Offline';
}
