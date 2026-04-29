import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { EveningExpensesDialog } from '../../shared/evening-expenses-dialog/evening-expenses-dialog';
import { EmptyState } from '../../shared/empty-state/empty-state';

@Component({
  selector: 'app-dashboard',
  imports: [EmptyState, MatButtonModule, MatIconModule, MatProgressBarModule, MatTableModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly i18n = inject(AppLanguageService);
  readonly ledger = inject(LedgerFacade);
  private readonly dialog = inject(MatDialog);
  readonly columns = ['date', 'title', 'category', 'amount'];
  readonly loanDebtValue = computed(() => {
    const debt = this.ledger.totalLoanDebt();
    return debt > 0 ? `-${this.ledger.money(debt)}` : this.ledger.money(0);
  });

  countLabel(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
    return `${count} ${word}`;
  }

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
