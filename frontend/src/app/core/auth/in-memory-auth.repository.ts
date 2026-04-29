import { Injectable, computed, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { emptyPagedListState, PagedListState } from '../models/ledger.models';
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
  private readonly userListState = signal<PagedListState<AppUser>>(emptyPagedListState());

  override readonly currentUser = this.currentUserState.asReadonly();
  override readonly userList = this.userListState.asReadonly();
  override readonly usersLoading = computed(() => this.userListState().isLoading);
  override readonly usersLoaded = computed(() => this.userListState().hasLoaded);
  readonly users = this.usersState.asReadonly();

  override loadCurrentUser(): void {
    return;
  }

  override loadUsers(reset = false): void {
    const current = this.userListState();
    const offset = reset ? 0 : Number(current.nextCursor || 0);
    const pageSize = 30;
    const items = this.usersState().slice(offset, offset + pageSize);
    const nextOffset = offset + items.length;
    this.userListState.set({
      items: reset ? items : [...current.items, ...items],
      nextCursor: nextOffset < this.usersState().length ? String(nextOffset) : '',
      hasMore: nextOffset < this.usersState().length,
      isLoading: false,
      hasLoaded: true,
      error: false,
    });
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
    this.loadUsers(true);
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
    this.loadUsers(true);
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
    this.loadUsers(true);
    this.currentUserState.set(updated);
    return of(true);
  }

  override removeUser(userId: string): void {
    this.usersState.update((users) => users.filter((user) => user.id !== userId));
    this.loadUsers(true);

    if (this.currentUserState()?.id === userId) {
      this.currentUserState.set(null);
      sessionStorage.removeItem(this.sessionKey);
    }
  }

  override toggleUser(userId: string): void {
    this.usersState.update((users) =>
      users.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)),
    );
    this.loadUsers(true);

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
