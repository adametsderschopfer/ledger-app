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
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { AuthFacade } from '../../core/auth/auth.facade';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { UserDialog } from '../../shared/user-dialog/user-dialog';

@Component({
  selector: 'app-server-admin',
  imports: [EmptyState, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTableModule],
  templateUrl: './server-admin.html',
  styleUrl: './server-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerAdmin {
  readonly auth = inject(AuthFacade);
  readonly i18n = inject(AppLanguageService);
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loadMoreAnchor = viewChild<ElementRef<HTMLElement>>('loadMoreAnchor');
  readonly columns = ['name', 'email', 'role', 'status', 'actions'];
  readonly hasMore = computed(() => this.auth.userList().hasMore);

  constructor() {
    this.auth.loadUsers(true);

    effect((onCleanup) => {
      const anchor = this.loadMoreAnchor();
      if (!anchor || !this.hasMore() || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.loadMore();
        }
      }, { rootMargin: '240px 0px' });
      observer.observe(anchor.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  openCreateDialog(): void {
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

  loadMore(): void {
    this.auth.loadUsers(false);
  }
}
