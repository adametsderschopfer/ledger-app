import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedListState } from '../models/ledger.models';
import {
  AppUser,
  CreateUser,
  LoginCredentials,
  UpdatePassword,
  UpdateProfile,
} from './auth.models';

export abstract class AuthRepository {
  abstract readonly currentUser: Signal<AppUser | null>;
  abstract readonly userList: Signal<PagedListState<AppUser>>;
  abstract readonly usersLoading: Signal<boolean>;
  abstract readonly usersLoaded: Signal<boolean>;

  abstract loadCurrentUser(): void;
  abstract loadUsers(reset?: boolean): void;
  abstract login(credentials: LoginCredentials): Observable<boolean>;
  abstract logout(): void;
  abstract updateProfile(profile: UpdateProfile): Observable<boolean>;
  abstract updatePassword(password: UpdatePassword): Observable<boolean>;
  abstract addUser(user: CreateUser): void;
  abstract removeUser(userId: string): void;
  abstract toggleUser(userId: string): void;
}
