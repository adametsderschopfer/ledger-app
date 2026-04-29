import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { LedgerFacade } from '../../core/ledger.facade';
import { EveningExpensesDialog } from '../../shared/evening-expenses-dialog/evening-expenses-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatTableModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly ledger = inject(LedgerFacade);
  private readonly dialog = inject(MatDialog);
  readonly columns = ['date', 'title', 'category', 'amount'];

  openDailyExpenses(): void {
    const dialogRef = this.dialog.open(EveningExpensesDialog, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        categories: this.ledger.expenseCategories(),
        loans: this.ledger.loans(),
      },
    });

    dialogRef.afterClosed().subscribe((expenses) => {
      if (expenses?.length) {
        this.ledger.addDailyExpenses(expenses);
      }
    });
  }
}
