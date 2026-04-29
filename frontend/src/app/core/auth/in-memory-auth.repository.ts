import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  AppUser,
  CreateUser,
  LoginCredentials,
  UpdatePassword,
  UpdateProfile,
} from './auth.models';
import { AuthRepository } from './auth.repository';

@Injectable()
export class InMemoryAuthRepository extends AuthRepository {
  private readonly sessionKey = 'ledger-current-user-id';
  private readonly usersState = signal<readonly AppUser[]>([
    {
      id: 'admin-user',
      name: 'Администратор',
      email: 'admin@ledger.local',
      password: 'admin',
      role: 'admin',
      isActive: true,
    },
  ]);
  private readonly currentUserState = signal<AppUser | null>(this.restoreCurrentUser());
  private readonly usersLoadingState = signal(false);
  private readonly usersLoadedState = signal(true);

  override readonly currentUser = this.currentUserState.asReadonly();
  override readonly users = this.usersState.asReadonly();
  override readonly usersLoading = this.usersLoadingState.asReadonly();
  override readonly usersLoaded = this.usersLoadedState.asReadonly();

  override loadCurrentUser(): void {
    return;
  }

  override loadUsers(): void {
    return;
  }

  override login(credentials: LoginCredentials): Observable<boolean> {
    const user = this.usersState().find(
      (item) =>
        item.email.toLowerCase() === credentials.email.toLowerCase() &&
        item.password === credentials.password &&
        item.isActive,
    );

    if (!user) {
      return of(false);
    }

    this.currentUserState.set(user);
    sessionStorage.setItem(this.sessionKey, user.id);
    return of(true);
  }

  override logout(): void {
    this.currentUserState.set(null);
    sessionStorage.removeItem(this.sessionKey);
  }

  override addUser(user: CreateUser): void {
    this.usersState.update((users) => [
      ...users,
      {
        ...user,
        id: createId('user'),
        isActive: true,
      },
    ]);
  }

  override updateProfile(profile: UpdateProfile): Observable<boolean> {
    const currentUser = this.currentUserState();
    if (!currentUser) {
      return of(false);
    }

    const email = profile.email.trim().toLowerCase();
    const isEmailUsed = this.usersState().some(
      (user) => user.id !== currentUser.id && user.email.toLowerCase() === email,
    );
    if (!profile.name.trim() || !email || isEmailUsed) {
      return of(false);
    }

    const updated = {
      ...currentUser,
      name: profile.name.trim(),
      email,
      avatarUrl: profile.avatarUrl.trim(),
    };
    this.usersState.update((users) =>
      users.map((user) => (user.id === currentUser.id ? updated : user)),
    );
    this.currentUserState.set(updated);
    return of(true);
  }

  override updatePassword(password: UpdatePassword): Observable<boolean> {
    const currentUser = this.currentUserState();
    if (
      !currentUser ||
      currentUser.password !== password.currentPassword ||
      password.newPassword.length < 4
    ) {
      return of(false);
    }

    const updated = { ...currentUser, password: password.newPassword };
    this.usersState.update((users) =>
      users.map((user) => (user.id === currentUser.id ? updated : user)),
    );
    this.currentUserState.set(updated);
    return of(true);
  }

  override removeUser(userId: string): void {
    this.usersState.update((users) => users.filter((user) => user.id !== userId));

    if (this.currentUserState()?.id === userId) {
      this.currentUserState.set(null);
      sessionStorage.removeItem(this.sessionKey);
    }
  }

  override toggleUser(userId: string): void {
    this.usersState.update((users) =>
      users.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)),
    );

    if (
      this.currentUserState()?.id === userId &&
      !this.usersState().find((user) => user.id === userId)?.isActive
    ) {
      this.logout();
    }
  }

  private restoreCurrentUser(): AppUser | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const userId = sessionStorage.getItem(this.sessionKey);
    return this.usersState().find((user) => user.id === userId && user.isActive) ?? null;
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
