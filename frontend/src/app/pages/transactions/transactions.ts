import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { TransactionListFilters, TransactionType } from '../../core/models/ledger.models';
import { TransactionDialog } from '../../shared/transaction-dialog/transaction-dialog';
import { TransactionGroups } from '../../shared/transaction-groups/transaction-groups';

type TransactionTypeFilter = TransactionType | 'all';

@Component({
  selector: 'app-transactions',
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TransactionGroups,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transactions {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loadMoreAnchor = viewChild<ElementRef<HTMLElement>>('loadMoreAnchor');

  readonly searchQuery = signal('');
  readonly typeFilter = signal<TransactionTypeFilter>('all');
  readonly categoryFilter = signal('all');
  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly filterCategories = computed(() => {
    const type = this.typeFilter();
    return this.ledger.categories().filter((category) => type === 'all' || category.type === type);
  });

  readonly filters = computed<TransactionListFilters>(() => {
    const type = this.typeFilter();
    return {
      type: type === 'all' ? undefined : type,
      categoryId: this.categoryFilter() === 'all' ? undefined : this.categoryFilter(),
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      search: this.searchQuery().trim() || undefined,
    };
  });

  readonly visibleTransactions = computed(() => this.ledger.transactions());
  readonly visibleGroups = computed(() => this.ledger.allTransactionGroups());
  readonly startDateValue = computed(() => parseInputDate(this.startDate()));
  readonly endDateValue = computed(() => parseInputDate(this.endDate()));
  readonly hasMore = computed(() => this.ledger.transactionList().hasMore);
  readonly isPageLoading = computed(() => this.ledger.transactionList().isLoading);
  readonly activeFilterCount = computed(() => {
    let count = 0;

    if (this.searchQuery().trim()) {
      count += 1;
    }

    if (this.typeFilter() !== 'all') {
      count += 1;
    }

    if (this.categoryFilter() !== 'all') {
      count += 1;
    }

    if (this.startDate()) {
      count += 1;
    }

    if (this.endDate()) {
      count += 1;
    }

    return count;
  });

  constructor() {
    effect(() => {
      const filters = this.filters();
      untracked(() => this.ledger.loadTransactionsPage(filters, true));
    });

    effect((onCleanup) => {
      const anchor = this.loadMoreAnchor();

      if (!anchor || !this.hasMore() || !isPlatformBrowser(this.platformId)) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            this.loadMore();
          }
        },
        { rootMargin: '240px 0px' },
      );

      observer.observe(anchor.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialog, {
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
      data: {
        mode: 'all',
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

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.resetPage();
  }

  setTypeFilter(event: MatSelectChange): void {
    const type = parseTypeFilter(event.value);
    this.typeFilter.set(type);

    if (
      this.categoryFilter() !== 'all' &&
      this.ledger.categoryById(this.categoryFilter()).type !== type &&
      type !== 'all'
    ) {
      this.categoryFilter.set('all');
    }

    this.resetPage();
  }

  setCategoryFilter(event: MatSelectChange): void {
    this.categoryFilter.set(typeof event.value === 'string' ? event.value : 'all');
    this.resetPage();
  }

  setStartDate(event: MatDatepickerInputEvent<Date>): void {
    this.startDate.set(event.value ? toInputDate(event.value) : '');
    this.resetPage();
  }

  setEndDate(event: MatDatepickerInputEvent<Date>): void {
    this.endDate.set(event.value ? toInputDate(event.value) : '');
    this.resetPage();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('all');
    this.categoryFilter.set('all');
    this.startDate.set('');
    this.endDate.set('');
    this.resetPage();
  }

  loadMore(): void {
    if (this.hasMore() && !this.isPageLoading()) {
      this.ledger.loadTransactionsPage(this.filters(), false);
    }
  }

  private resetPage(): void {
    return;
  }
}

function parseTypeFilter(value: unknown): TransactionTypeFilter {
  return value === 'income' || value === 'expense' ? value : 'all';
}

function parseInputDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
