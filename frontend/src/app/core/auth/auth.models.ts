export type UserRole = 'user' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  password?: string;
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

export interface UpdateProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface UpdatePassword {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
}
