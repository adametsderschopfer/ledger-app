import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade, UpcomingObligation } from '../../core/ledger.facade';
import { EveningExpensesDialog } from '../../shared/evening-expenses-dialog/evening-expenses-dialog';
import { ObligationDialog } from '../../shared/obligation-dialog/obligation-dialog';
import { EmptyState } from '../../shared/empty-state/empty-state';

@Component({
  selector: 'app-dashboard',
  imports: [
    EmptyState,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
  ],
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
    if (this.i18n.language() === 'EN') {
      return `${count} ${one}${count === 1 ? '' : 's'}`;
    }

    const mod10 = count % 10;
    const mod100 = count % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? one
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? few
          : many;
    return `${count} ${word}`;
  }

  openDailyExpenses(): void {
    const dialogRef = this.dialog.open(EveningExpensesDialog, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        categories: this.ledger.expenseCategories(),
        loans: this.ledger.activeLoans(),
      },
    });

    dialogRef.afterClosed().subscribe((expenses) => {
      if (expenses?.length) {
        this.ledger.addDailyExpenses(expenses);
      }
    });
  }

  openCreateObligationDialog(): void {
    const dialogRef = this.dialog.open(ObligationDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        categories: this.ledger.expenseCategories(),
      },
    });

    dialogRef.afterClosed().subscribe((obligation) => {
      if (obligation) {
        this.ledger.addObligation(obligation);
      }
    });
  }

  openEditObligationDialog(obligation: UpcomingObligation): void {
    const customObligation =
      this.ledger.obligationById(obligation.id) ??
      (obligation.categoryId
        ? {
            id: obligation.id,
            name: obligation.name,
            amount: obligation.amount,
            dueDay: obligation.dueDay,
            categoryId: obligation.categoryId,
          }
        : undefined);
    if (!customObligation) {
      return;
    }

    const dialogRef = this.dialog.open(ObligationDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        categories: this.ledger.expenseCategories(),
        obligation: customObligation,
      },
    });

    dialogRef.afterClosed().subscribe((updatedObligation) => {
      if (updatedObligation) {
        this.ledger.updateObligation(updatedObligation);
      }
    });
  }

  recordObligationPayment(obligation: UpcomingObligation): void {
    this.ledger.recordObligationPayment(obligation);
  }

  removeObligation(obligation: UpcomingObligation): void {
    if (
      obligation.source === 'custom' &&
      globalThis.confirm(this.i18n.t('obligation.confirmDelete'))
    ) {
      this.ledger.removeObligation(obligation.id);
    }
  }
}
