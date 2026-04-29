import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AppLanguageService } from '../i18n/app-language.service';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateObligation,
  CreateTransaction,
  DashboardSummary,
  LedgerTransaction,
  Loan,
  Obligation,
  PagedListState,
  PagedResponse,
  StatisticsSummary,
  TransactionListFilters,
  UpdateLoan,
  UpdateObligation,
  emptyPagedListState,
} from '../models/ledger.models';
import { AppNotificationService } from '../notifications/app-notification.service';
import { LedgerRepository } from './ledger.repository';

type TransactionFeed = 'all' | 'income' | 'expense';

const pageSize = 30;

@Injectable()
export class HttpLedgerRepository extends LedgerRepository {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(AppLanguageService);
  private readonly notifications = inject(AppNotificationService);
  private readonly apiUrl = '/api/ledger';

  private readonly categoryState = signal<PagedListState<Category>>(emptyPagedListState());
  private readonly transactionState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly incomeTransactionState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly expenseTransactionState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly loanState = signal<PagedListState<Loan>>(emptyPagedListState());
  private readonly obligationState = signal<PagedListState<Obligation>>(emptyPagedListState());
  private readonly dashboardSummaryState = signal<DashboardSummary | null>(null);
  private readonly statisticsSummaryState = signal<StatisticsSummary | null>(null);
  private readonly hasLoadedState = signal(false);
  private readonly transactionFilters = signal<TransactionListFilters>({});
  private loadRequestId = 0;

  override readonly categoryList: Signal<PagedListState<Category>> = this.categoryState.asReadonly();
  override readonly transactionList: Signal<PagedListState<LedgerTransaction>> = this.transactionState.asReadonly();
  override readonly incomeTransactionList: Signal<PagedListState<LedgerTransaction>> = this.incomeTransactionState.asReadonly();
  override readonly expenseTransactionList: Signal<PagedListState<LedgerTransaction>> = this.expenseTransactionState.asReadonly();
  override readonly loanList: Signal<PagedListState<Loan>> = this.loanState.asReadonly();
  override readonly obligationList: Signal<PagedListState<Obligation>> = this.obligationState.asReadonly();
  override readonly dashboardSummary: Signal<DashboardSummary | null> = this.dashboardSummaryState.asReadonly();
  override readonly statisticsSummary: Signal<StatisticsSummary | null> = this.statisticsSummaryState.asReadonly();
  override readonly isLoading: Signal<boolean> = computed(
    () =>
      this.categoryState().isLoading ||
      this.transactionState().isLoading ||
      this.loanState().isLoading ||
      this.obligationState().isLoading,
  );
  override readonly hasLoaded: Signal<boolean> = this.hasLoadedState.asReadonly();

  override load(): void {
    const headers = this.authHeaders();
    const requestId = this.loadRequestId + 1;
    this.loadRequestId = requestId;

    if (!headers) {
      this.clear();
      return;
    }

    this.loadCategoriesPage(true);
    this.loadTransactionsPage({}, true);
    this.loadLoansPage(true);
    this.loadObligationsPage(true);
    this.refreshDashboardSummary();

    queueMicrotask(() => {
      if (requestId === this.loadRequestId) {
        this.hasLoadedState.set(true);
      }
    });
  }

  override loadCategoriesPage(reset = false): void {
    this.loadPaged(this.categoryState, `${this.apiUrl}/categories`, {}, reset);
  }

  override loadTransactionsPage(filters: TransactionListFilters, reset = false): void {
    this.transactionFilters.set(filters);
    this.loadTransactionFeed('all', filters, reset);
  }

  override loadIncomeTransactionsPage(reset = false): void {
    this.loadTransactionFeed('income', { type: 'income' }, reset);
  }

  override loadExpenseTransactionsPage(reset = false): void {
    this.loadTransactionFeed('expense', { type: 'expense' }, reset);
  }

  override loadLoansPage(reset = false): void {
    this.loadPaged(this.loanState, `${this.apiUrl}/loans`, {}, reset);
  }

  override loadObligationsPage(reset = false): void {
    this.loadPaged(this.obligationState, `${this.apiUrl}/obligations`, {}, reset);
  }

  override refreshDashboardSummary(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.dashboardSummaryState.set(null);
      return;
    }

    const month = currentMonthKey();
    this.http
      .get<DashboardSummary>(`${this.apiUrl}/dashboard-summary`, {
        headers,
        params: new HttpParams().set('month', month),
      })
      .subscribe({
        next: (summary) => this.dashboardSummaryState.set(summary),
        error: () => this.notifyLoadFailed(),
      });
  }

  override refreshStatisticsSummary(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.statisticsSummaryState.set(null);
      return;
    }

    this.http
      .get<StatisticsSummary>(`${this.apiUrl}/statistics-summary`, {
        headers,
        params: new HttpParams().set('months', 12),
      })
      .subscribe({
        next: (summary) => this.statisticsSummaryState.set(summary),
        error: () => this.notifyLoadFailed(),
      });
  }

  override addTransaction(transaction: CreateTransaction): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.post<LedgerTransaction>(`${this.apiUrl}/transactions`, transaction, { headers }));
  }

  override addTransactions(transactions: readonly CreateTransaction[]): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .post<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions/batch`, { transactions }, { headers })
      .subscribe({
        next: () => this.reloadLoadedData(),
        error: () => this.notifySaveFailed(),
      });
  }

  override addLoan(loan: CreateLoan): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.post<Loan>(`${this.apiUrl}/loans`, loan, { headers }));
  }

  override updateLoan(loan: UpdateLoan): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.put<Loan>(`${this.apiUrl}/loans/${loan.id}`, loan, { headers }));
  }

  override removeLoan(loanId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.delete<void>(`${this.apiUrl}/loans/${loanId}`, { headers }));
  }

  override addObligation(obligation: CreateObligation): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.post<Obligation>(`${this.apiUrl}/obligations`, obligation, { headers }));
  }

  override updateObligation(obligation: UpdateObligation): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .put<Obligation>(`${this.apiUrl}/obligations/${obligation.id}`, obligation, { headers })
      .subscribe({
        next: () => this.reloadLoadedData(),
        error: () => this.notifySaveFailed(),
      });
  }

  override removeObligation(obligationId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.delete<void>(`${this.apiUrl}/obligations/${obligationId}`, { headers }));
  }

  override addCategory(category: CreateCategory): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.post<Category>(`${this.apiUrl}/categories`, category, { headers }));
  }

  override removeCategory(categoryId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.commitMutation(this.http.delete<void>(`${this.apiUrl}/categories/${categoryId}`, { headers }));
  }

  private loadTransactionFeed(feed: TransactionFeed, filters: TransactionListFilters, reset: boolean): void {
    const state =
      feed === 'income'
        ? this.incomeTransactionState
        : feed === 'expense'
          ? this.expenseTransactionState
          : this.transactionState;
    this.loadPaged(state, `${this.apiUrl}/transactions`, filters, reset);
  }

  private loadPaged<T>(
    state: ReturnType<typeof signal<PagedListState<T>>>,
    url: string,
    query: TransactionListFilters,
    reset: boolean,
  ): void {
    const headers = this.authHeaders();
    if (!headers) {
      state.set(emptyPagedListState());
      return;
    }

    const current = state();
    if (!reset && (!current.hasMore || current.isLoading)) {
      return;
    }

    const nextCursor = reset ? '' : current.nextCursor;
    state.set({
      ...(reset ? emptyPagedListState<T>() : current),
      isLoading: true,
      error: false,
    });

    this.http
      .get<PagedResponse<T>>(url, {
        headers,
        params: this.listParams(query, nextCursor),
      })
      .subscribe({
        next: (page) => {
          state.update((latest) => ({
            items: reset ? page.items : dedupeById([...latest.items, ...page.items]),
            nextCursor: page.nextCursor ?? '',
            hasMore: page.hasMore,
            isLoading: false,
            hasLoaded: true,
            error: false,
          }));
        },
        error: () => {
          state.update((latest) => ({
            ...latest,
            isLoading: false,
            hasLoaded: true,
            error: true,
          }));
          this.notifyLoadFailed();
        },
      });
  }

  private listParams(query: TransactionListFilters, cursor: string): HttpParams {
    let params = new HttpParams().set('limit', pageSize);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return params;
  }

  private reloadLoadedData(): void {
    this.loadCategoriesPage(true);
    this.loadTransactionsPage(this.transactionFilters(), true);
    if (this.incomeTransactionState().hasLoaded) {
      this.loadIncomeTransactionsPage(true);
    }
    if (this.expenseTransactionState().hasLoaded) {
      this.loadExpenseTransactionsPage(true);
    }
    this.loadLoansPage(true);
    this.loadObligationsPage(true);
    this.refreshDashboardSummary();
  }

  private commitMutation<T>(request: Observable<T>): void {
    request.subscribe({
      next: () => this.reloadLoadedData(),
      error: () => this.notifySaveFailed(),
    });
  }

  private notifyLoadFailed(): void {
    this.notifications.error(this.i18n.t('notification.loadFailed'));
  }

  private notifySaveFailed(): void {
    this.notifications.error(this.i18n.t('notification.saveFailed'));
  }

  private clear(): void {
    this.categoryState.set(emptyPagedListState());
    this.transactionState.set(emptyPagedListState());
    this.incomeTransactionState.set(emptyPagedListState());
    this.expenseTransactionState.set(emptyPagedListState());
    this.loanState.set(emptyPagedListState());
    this.obligationState.set(emptyPagedListState());
    this.dashboardSummaryState.set(null);
    this.statisticsSummaryState.set(null);
    this.hasLoadedState.set(false);
  }

  private authHeaders(): HttpHeaders | undefined {
    if (typeof sessionStorage === 'undefined') {
      return undefined;
    }

    const token = sessionStorage.getItem('ledger-auth-token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }
}

function dedupeById<T>(items: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = typeof item === 'object' && item !== null && 'id' in item ? String(item.id) : '';
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}
