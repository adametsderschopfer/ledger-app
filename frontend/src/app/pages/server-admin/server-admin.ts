import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  readonly columns = ['name', 'email', 'role', 'status', 'actions'];

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
}
