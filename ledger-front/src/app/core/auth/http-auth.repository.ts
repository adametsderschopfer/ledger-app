import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { AppUser, CreateUser, LoginCredentials } from './auth.models';
import { AuthRepository } from './auth.repository';

@Injectable()
export class HttpAuthRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';

  private readonly currentUserState = signal<AppUser | null>(null);
  private readonly usersState = signal<readonly AppUser[]>([]);

  override readonly currentUser: Signal<AppUser | null> = this.currentUserState.asReadonly();
  override readonly users: Signal<readonly AppUser[]> = this.usersState.asReadonly();

  loadUsers(): void {
    this.http.get<readonly AppUser[]>('/api/server/users').subscribe((users) => {
      this.usersState.set(users);
    });
  }

  override login(credentials: LoginCredentials): boolean {
    this.http.post<AppUser>(`${this.apiUrl}/login`, credentials).subscribe((user) => {
      this.currentUserState.set(user);
    });

    return true;
  }

  override logout(): void {
    this.http.post<void>(`${this.apiUrl}/logout`, {}).subscribe(() => {
      this.currentUserState.set(null);
    });
  }

  override addUser(user: CreateUser): void {
    this.http.post<AppUser>('/api/server/users', user).subscribe((created) => {
      this.usersState.update((users) => [...users, created]);
    });
  }

  override removeUser(userId: string): void {
    this.http.delete<void>(`/api/server/users/${userId}`).subscribe(() => {
      this.usersState.update((users) => users.filter((user) => user.id !== userId));
    });
  }

  override toggleUser(userId: string): void {
    this.http.patch<AppUser>(`/api/server/users/${userId}/status`, {}).subscribe((updated) => {
      this.usersState.update((users) => users.map((user) => (user.id === userId ? updated : user)));
    });
  }
}
