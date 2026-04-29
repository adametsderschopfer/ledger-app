import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { TransactionDialog } from '../../shared/transaction-dialog/transaction-dialog';
import { TransactionGroups } from '../../shared/transaction-groups/transaction-groups';

@Component({
  selector: 'app-incomes',
  imports: [MatButtonModule, MatIconModule, TransactionGroups],
  templateUrl: './incomes.html',
  styleUrl: './incomes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Incomes {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  private readonly dialog = inject(MatDialog);

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialog, {
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        mode: 'income',
        categories: this.ledger.categories(),
        loans: this.ledger.loans(),
      },
    });

    dialogRef.afterClosed().subscribe((transaction) => {
      if (transaction) {
        this.ledger.addTransaction(transaction);
      }
    });
  }
}
