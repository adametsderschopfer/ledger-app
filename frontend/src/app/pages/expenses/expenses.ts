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
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { TransactionDialog } from '../../shared/transaction-dialog/transaction-dialog';
import { TransactionGroups } from '../../shared/transaction-groups/transaction-groups';

@Component({
  selector: 'app-expenses',
  imports: [MatButtonModule, MatIconModule, TransactionGroups],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Expenses {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loadMoreAnchor = viewChild<ElementRef<HTMLElement>>('loadMoreAnchor');
  readonly hasMore = computed(() => this.ledger.expenseTransactionList().hasMore);
  readonly isPageLoading = computed(() => this.ledger.expenseTransactionList().isLoading);

  constructor() {
    this.ledger.loadExpenseTransactionsPage(true);

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
    const dialogRef = this.dialog.open(TransactionDialog, {
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        mode: 'expense',
        categories: this.ledger.categories(),
        loans: this.ledger.activeLoans(),
      },
    });

    dialogRef.afterClosed().subscribe((transaction) => {
      if (transaction) {
        this.ledger.addTransaction(transaction);
      }
    });
  }

  loadMore(): void {
    if (this.hasMore() && !this.isPageLoading()) {
      this.ledger.loadExpenseTransactionsPage(false);
    }
  }
}
