import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AppUser, CreateUser, LoginCredentials } from './auth.models';

export abstract class AuthRepository {
  abstract readonly currentUser: Signal<AppUser | null>;
  abstract readonly users: Signal<readonly AppUser[]>;

  abstract loadCurrentUser(): void;
  abstract loadUsers(): void;
  abstract login(credentials: LoginCredentials): Observable<boolean>;
  abstract logout(): void;
  abstract addUser(user: CreateUser): void;
  abstract removeUser(userId: string): void;
  abstract toggleUser(userId: string): void;
}
