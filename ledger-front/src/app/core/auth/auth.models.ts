export type UserRole = 'user' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
