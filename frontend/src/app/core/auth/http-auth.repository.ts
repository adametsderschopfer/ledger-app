import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import {
  AppUser,
  AuthSession,
  CreateUser,
  LoginCredentials,
  UpdatePassword,
  UpdateProfile,
} from './auth.models';
import { AuthRepository } from './auth.repository';

@Injectable()
export class HttpAuthRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';
  private readonly tokenKey = 'ledger-auth-token';
  private readonly userKey = 'ledger-current-user';

  private readonly currentUserState = signal<AppUser | null>(this.restoreUser());
  private readonly usersState = signal<readonly AppUser[]>([]);
  private readonly usersLoadingState = signal(false);
  private readonly usersLoadedState = signal(false);

  override readonly currentUser: Signal<AppUser | null> = this.currentUserState.asReadonly();
  override readonly users: Signal<readonly AppUser[]> = this.usersState.asReadonly();
  override readonly usersLoading: Signal<boolean> = this.usersLoadingState.asReadonly();
  override readonly usersLoaded: Signal<boolean> = this.usersLoadedState.asReadonly();

  constructor() {
    super();

    if (this.token()) {
      this.loadCurrentUser();
    }
  }

  override loadCurrentUser(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.currentUserState.set(null);
      return;
    }

    this.http
      .get<AppUser>(`${this.apiUrl}/me`, { headers })
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (user) {
          this.setSession(user, this.token() ?? '');
          return;
        }

        this.clearSession();
      });
  }

  override loadUsers(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.usersState.set([]);
      this.usersLoadedState.set(false);
      this.usersLoadingState.set(false);
      return;
    }

    this.usersLoadingState.set(true);
    this.http
      .get<readonly AppUser[]>('/api/server/users', { headers })
      .pipe(catchError(() => of([])))
      .subscribe((users) => {
        this.usersState.set(users ?? []);
        this.usersLoadedState.set(true);
        this.usersLoadingState.set(false);
      });
  }

  override login(credentials: LoginCredentials): Observable<boolean> {
    return this.http.post<AuthSession>(`${this.apiUrl}/login`, credentials).pipe(
      tap((session) => this.setSession(session.user, session.token)),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  override logout(): void {
    const headers = this.authHeaders();
    this.clearSession();

    if (headers) {
      this.http.post<void>(`${this.apiUrl}/logout`, {}, { headers }).subscribe();
    }
  }

  override updateProfile(profile: UpdateProfile): Observable<boolean> {
    const headers = this.authHeaders();
    if (!headers) {
      return of(false);
    }

    return this.http.patch<AppUser>(`${this.apiUrl}/profile`, profile, { headers }).pipe(
      tap((user) => this.setSession(user, this.token() ?? '')),
      tap((user) =>
        this.usersState.update((users) => users.map((item) => (item.id === user.id ? user : item))),
      ),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  override updatePassword(password: UpdatePassword): Observable<boolean> {
    const headers = this.authHeaders();
    if (!headers) {
      return of(false);
    }

    return this.http.patch<void>(`${this.apiUrl}/password`, password, { headers }).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  override addUser(user: CreateUser): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.post<AppUser>('/api/server/users', user, { headers }).subscribe((created) => {
      this.usersState.update((users) => [...users, created]);
    });
  }

  override removeUser(userId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.delete<void>(`/api/server/users/${userId}`, { headers }).subscribe(() => {
      this.usersState.update((users) => users.filter((user) => user.id !== userId));
    });
  }

  override toggleUser(userId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .patch<AppUser>(`/api/server/users/${userId}/status`, {}, { headers })
      .subscribe((updated) => {
        this.usersState.update((users) =>
          users.map((user) => (user.id === userId ? updated : user)),
        );
      });
  }

  private authHeaders(): HttpHeaders | undefined {
    const token = this.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private token(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(this.tokenKey);
  }

  private setSession(user: AppUser, token: string): void {
    this.currentUserState.set(user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.userKey, JSON.stringify(user));
      sessionStorage.setItem(this.tokenKey, token);
    }
  }

  private clearSession(): void {
    this.currentUserState.set(null);
    this.usersState.set([]);
    this.usersLoadedState.set(false);
    this.usersLoadingState.set(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.userKey);
      sessionStorage.removeItem(this.tokenKey);
    }
  }

  private restoreUser(): AppUser | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const rawUser = sessionStorage.getItem(this.userKey);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AppUser;
    } catch {
      sessionStorage.removeItem(this.userKey);
      return null;
    }
  }
}
