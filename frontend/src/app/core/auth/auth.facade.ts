import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUser, LoginCredentials, UpdatePassword, UpdateProfile } from './auth.models';
import { AuthRepository } from './auth.repository';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly repository = inject(AuthRepository);

  readonly currentUser = this.repository.currentUser;
  readonly userList = this.repository.userList;
  readonly users = computed(() => this.userList().items);
  readonly usersLoading = this.repository.usersLoading;
  readonly usersLoaded = this.repository.usersLoaded;
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  loadCurrentUser(): void {
    this.repository.loadCurrentUser();
  }

  loadUsers(reset = false): void {
    this.repository.loadUsers(reset);
  }

  login(credentials: LoginCredentials): Observable<boolean> {
    return this.repository.login(credentials);
  }

  logout(): void {
    this.repository.logout();
  }

  updateProfile(profile: UpdateProfile): Observable<boolean> {
    return this.repository.updateProfile(profile);
  }

  updatePassword(password: UpdatePassword): Observable<boolean> {
    return this.repository.updatePassword(password);
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
