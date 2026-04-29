import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUser, LoginCredentials } from './auth.models';
import { AuthRepository } from './auth.repository';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly repository = inject(AuthRepository);

  readonly currentUser = this.repository.currentUser;
  readonly users = this.repository.users;
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  loadCurrentUser(): void {
    this.repository.loadCurrentUser();
  }

  loadUsers(): void {
    this.repository.loadUsers();
  }

  login(credentials: LoginCredentials): Observable<boolean> {
    return this.repository.login(credentials);
  }

  logout(): void {
    this.repository.logout();
  }

  addUser(user: CreateUser): void {
    this.repository.addUser(user);
  }

  removeUser(userId: string): void {
    this.repository.removeUser(userId);
  }

  toggleUser(userId: string): void {
    this.repository.toggleUser(userId);
  }
}
