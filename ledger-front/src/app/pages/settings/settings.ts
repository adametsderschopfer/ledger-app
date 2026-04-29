import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { AppThemeService } from '../../core/theme/app-theme.service';
import { CategoryDialog } from '../../shared/category-dialog/category-dialog';

@Component({
  selector: 'app-settings',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  readonly theme = inject(AppThemeService);
  private readonly dialog = inject(MatDialog);

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
}
