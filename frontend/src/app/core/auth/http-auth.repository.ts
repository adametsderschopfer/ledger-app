import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AppLanguageService } from '../i18n/app-language.service';
import { PagedListState, PagedResponse, emptyPagedListState } from '../models/ledger.models';
import { AppNotificationService } from '../notifications/app-notification.service';
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
  private readonly i18n = inject(AppLanguageService);
  private readonly notifications = inject(AppNotificationService);
  private readonly apiUrl = '/api/auth';
  private readonly tokenKey = 'ledger-auth-token';
  private readonly userKey = 'ledger-current-user';

  private readonly currentUserState = signal<AppUser | null>(this.restoreUser());
  private readonly usersState = signal<PagedListState<AppUser>>(emptyPagedListState());

  override readonly currentUser: Signal<AppUser | null> = this.currentUserState.asReadonly();
  override readonly userList: Signal<PagedListState<AppUser>> = this.usersState.asReadonly();
  override readonly usersLoading: Signal<boolean> = computed(() => this.usersState().isLoading);
  override readonly usersLoaded: Signal<boolean> = computed(() => this.usersState().hasLoaded);

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

  override loadUsers(reset = false): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.usersState.set(emptyPagedListState());
      return;
    }

    const current = this.usersState();
    if (!reset && (!current.hasMore || current.isLoading) && current.hasLoaded) {
      return;
    }

    const cursor = reset ? '' : current.nextCursor;
    this.usersState.set({
      ...(reset ? emptyPagedListState<AppUser>() : current),
      isLoading: true,
      error: false,
    });

    this.http
      .get<PagedResponse<AppUser>>('/api/server/users', {
        headers,
        params: listParams(cursor),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (!page) {
          this.usersState.update((latest) => ({ ...latest, isLoading: false, hasLoaded: true, error: true }));
          this.notifyLoadFailed();
          return;
        }

        this.usersState.update((latest) => ({
          items: reset ? page.items : dedupeById([...latest.items, ...page.items]),
          nextCursor: page.nextCursor ?? '',
          hasMore: page.hasMore,
          isLoading: false,
          hasLoaded: true,
          error: false,
        }));
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
      this.http.post<void>(`${this.apiUrl}/logout`, {}, { headers }).pipe(catchError(() => of(undefined))).subscribe();
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
        this.usersState.update((state) => ({
          ...state,
          items: state.items.map((item) => (item.id === user.id ? user : item)),
        })),
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

    this.http.post<AppUser>('/api/server/users', user, { headers }).subscribe({
      next: (created) => {
        this.usersState.update((state) => ({ ...state, items: [...state.items, created] }));
      },
      error: () => this.notifySaveFailed(),
    });
  }

  override removeUser(userId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.delete<void>(`/api/server/users/${userId}`, { headers }).subscribe({
      next: () => {
        this.usersState.update((state) => ({ ...state, items: state.items.filter((user) => user.id !== userId) }));
      },
      error: () => this.notifySaveFailed(),
    });
  }

  override toggleUser(userId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .patch<AppUser>(`/api/server/users/${userId}/status`, {}, { headers })
      .subscribe({
        next: (updated) => {
          this.usersState.update((users) =>
            ({
              ...users,
              items: users.items.map((user) => (user.id === userId ? updated : user)),
            }),
          );
        },
        error: () => this.notifySaveFailed(),
      });
  }

  private notifyLoadFailed(): void {
    this.notifications.error(this.i18n.t('notification.loadFailed'));
  }

  private notifySaveFailed(): void {
    this.notifications.error(this.i18n.t('notification.saveFailed'));
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
    this.usersState.set(emptyPagedListState());
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

function listParams(cursor: string): HttpParams {
  let params = new HttpParams().set('limit', 30);
  if (cursor) {
    params = params.set('cursor', cursor);
  }
  return params;
}

function dedupeById(items: readonly AppUser[]): readonly AppUser[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
