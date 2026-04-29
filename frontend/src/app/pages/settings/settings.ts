import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { AuthFacade } from '../../core/auth/auth.facade';
import { AppLanguage, AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { AppThemeService } from '../../core/theme/app-theme.service';
import { CategoryDialog } from '../../shared/category-dialog/category-dialog';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PasswordDialog } from '../../shared/password-dialog/password-dialog';
import { ProfileDialog } from '../../shared/profile-dialog/profile-dialog';
import { UserDialog } from '../../shared/user-dialog/user-dialog';

@Component({
  selector: 'app-settings',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTableModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly auth = inject(AuthFacade);
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  readonly theme = inject(AppThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly categoryLoadMoreAnchor = viewChild<ElementRef<HTMLElement>>('categoryLoadMoreAnchor');
  private readonly userLoadMoreAnchor = viewChild<ElementRef<HTMLElement>>('userLoadMoreAnchor');
  readonly userColumns = ['name', 'email', 'role', 'status', 'actions'];
  readonly hasMoreCategories = computed(() => this.ledger.categoryList().hasMore);
  readonly hasMoreUsers = computed(() => this.auth.userList().hasMore);

  constructor() {
    effect((onCleanup) => {
      const anchor = this.categoryLoadMoreAnchor();
      if (!anchor || !this.hasMoreCategories() || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.ledger.loadCategoriesPage(false);
        }
      }, { rootMargin: '240px 0px' });
      observer.observe(anchor.nativeElement);
      onCleanup(() => observer.disconnect());
    });

    effect((onCleanup) => {
      const anchor = this.userLoadMoreAnchor();
      if (!anchor || !this.hasMoreUsers() || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.auth.loadUsers(false);
        }
      }, { rootMargin: '240px 0px' });
      observer.observe(anchor.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  openCategoryDialog(): void {
    const dialogRef = this.dialog.open(CategoryDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
    });

    dialogRef.afterClosed().subscribe((category) => {
      if (category) {
        this.ledger.addCategory(category);
      }
    });
  }

  setDarkTheme(event: MatSlideToggleChange): void {
    this.theme.setTheme(event.checked ? 'dark' : 'light');
  }

  setLanguage(event: MatSelectChange): void {
    this.i18n.setLanguage(event.value as AppLanguage);
  }

  openCreateUserDialog(): void {
    const dialogRef = this.dialog.open(UserDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
    });

    dialogRef.afterClosed().subscribe((user) => {
      if (user) {
        this.auth.addUser(user);
      }
    });
  }

  openProfileDialog(): void {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }

    const dialogRef = this.dialog.open(ProfileDialog, {
      width: '560px',
      maxWidth: 'calc(100vw - 24px)',
      data: user,
    });

    dialogRef.afterClosed().subscribe((profile) => {
      if (!profile) {
        return;
      }

      this.auth.updateProfile(profile).subscribe((updated) => {
        if (!updated) {
          this.snackBar.open(this.i18n.t('profile.updateFailed'), undefined, { duration: 3600 });
        }
      });
    });
  }

  openPasswordDialog(): void {
    const dialogRef = this.dialog.open(PasswordDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 24px)',
    });

    dialogRef.afterClosed().subscribe((password) => {
      if (!password) {
        return;
      }

      this.auth.updatePassword(password).subscribe((updated) => {
        if (!updated) {
          this.snackBar.open(this.i18n.t('profile.passwordUpdateFailed'), undefined, {
            duration: 3600,
          });
        }
      });
    });
  }

  loadMoreCategories(): void {
    this.ledger.loadCategoriesPage(false);
  }

  loadMoreUsers(): void {
    this.auth.loadUsers(false);
  }
}
