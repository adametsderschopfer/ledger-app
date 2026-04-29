import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { LedgerFacade } from '../../core/ledger.facade';
import { LoanDialog } from '../../shared/loan-dialog/loan-dialog';

@Component({
  selector: 'app-loans',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatTableModule],
  templateUrl: './loans.html',
  styleUrl: './loans.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loans {
  readonly ledger = inject(LedgerFacade);
  private readonly dialog = inject(MatDialog);
  readonly columns = ['name', 'payment', 'dueDay', 'remaining', 'progress'];

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

  paidShare(originalAmount: number, remainingAmount: number): number {
    return Math.round(((originalAmount - remainingAmount) / originalAmount) * 100);
  }
}
