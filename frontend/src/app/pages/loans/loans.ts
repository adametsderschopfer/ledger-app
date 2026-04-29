import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { Loan, UpdateLoan } from '../../core/models/ledger.models';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { LoanDialog } from '../../shared/loan-dialog/loan-dialog';

@Component({
  selector: 'app-loans',
  imports: [EmptyState, MatButtonModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatTableModule],
  templateUrl: './loans.html',
  styleUrl: './loans.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loans {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  private readonly dialog = inject(MatDialog);
  readonly columns = ['name', 'payment', 'dueDay', 'remaining', 'progress', 'actions'];

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(LoanDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)',
    });

    dialogRef.afterClosed().subscribe((loan) => {
      if (loan) {
        this.ledger.addLoan(loan);
      }
    });
  }

  openEditDialog(loan: Loan): void {
    const dialogRef = this.dialog.open(LoanDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)',
      data: loan,
    });

    dialogRef.afterClosed().subscribe((updatedLoan: UpdateLoan | undefined) => {
      if (updatedLoan) {
        this.ledger.updateLoan(updatedLoan);
      }
    });
  }

  recordPayment(loan: Loan): void {
    this.ledger.recordLoanPayment(loan.id);
  }

  removeLoan(loan: Loan): void {
    if (globalThis.confirm(this.i18n.t('loan.confirmDelete'))) {
      this.ledger.removeLoan(loan.id);
    }
  }

  paidShare(originalAmount: number, remainingAmount: number): number {
    if (originalAmount <= 0) {
      return 0;
    }

    return Math.round(((originalAmount - remainingAmount) / originalAmount) * 100);
  }
}
