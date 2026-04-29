import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateObligation,
  CreateTransaction,
  LedgerTransaction,
  Loan,
  Obligation,
  UpdateLoan,
  UpdateObligation,
} from '../models/ledger.models';
import { LedgerRepository } from './ledger.repository';

@Injectable()
export class HttpLedgerRepository extends LedgerRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/ledger';

  private readonly categoryState = signal<readonly Category[]>([]);
  private readonly transactionState = signal<readonly LedgerTransaction[]>([]);
  private readonly loanState = signal<readonly Loan[]>([]);
  private readonly obligationState = signal<readonly Obligation[]>([]);
  private readonly isLoadingState = signal(false);
  private readonly hasLoadedState = signal(false);
  private loadRequestId = 0;

  override readonly isLoading: Signal<boolean> = this.isLoadingState.asReadonly();
  override readonly hasLoaded: Signal<boolean> = this.hasLoadedState.asReadonly();
  override readonly categories: Signal<readonly Category[]> = this.categoryState.asReadonly();
  override readonly transactions: Signal<readonly LedgerTransaction[]> = this.transactionState.asReadonly();
  override readonly loans: Signal<readonly Loan[]> = this.loanState.asReadonly();
  override readonly obligations: Signal<readonly Obligation[]> = this.obligationState.asReadonly();

  override load(): void {
    const headers = this.authHeaders();
    const requestId = this.loadRequestId + 1;
    this.loadRequestId = requestId;

    if (!headers) {
      this.categoryState.set([]);
      this.transactionState.set([]);
      this.loanState.set([]);
      this.obligationState.set([]);
      this.hasLoadedState.set(false);
      this.isLoadingState.set(false);
      return;
    }

    this.isLoadingState.set(true);

    forkJoin({
      categories: this.http.get<readonly Category[]>(`${this.apiUrl}/categories`, { headers }),
      transactions: this.http.get<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions`, { headers }),
      loans: this.http.get<readonly Loan[]>(`${this.apiUrl}/loans`, { headers }),
      obligations: this.http.get<readonly Obligation[]>(`${this.apiUrl}/obligations`, { headers }),
    }).subscribe({
      next: ({ categories, transactions, loans, obligations }) => {
        if (requestId !== this.loadRequestId) {
          return;
        }

        this.categoryState.set(categories ?? []);
        this.transactionState.set(transactions ?? []);
        this.loanState.set(loans ?? []);
        this.obligationState.set(obligations ?? []);
        this.hasLoadedState.set(true);
      },
      error: () => {
        if (requestId === this.loadRequestId) {
          this.isLoadingState.set(false);
        }
      },
      complete: () => {
        if (requestId === this.loadRequestId) {
          this.isLoadingState.set(false);
        }
      },
    });
  }

  override addTransaction(transaction: CreateTransaction): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.post<LedgerTransaction>(`${this.apiUrl}/transactions`, transaction, { headers }).subscribe((created) => {
      this.transactionState.update((transactions) => [created, ...transactions]);
      if (created.loanId) {
        this.loadLoans();
      }
    });
  }

  override addTransactions(transactions: readonly CreateTransaction[]): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .post<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions/batch`, { transactions }, { headers })
      .subscribe((created) => {
        this.transactionState.update((current) => [...created, ...current]);
        if (created.some((transaction) => transaction.loanId)) {
          this.loadLoans();
        }
      });
  }

  override addLoan(loan: CreateLoan): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.post<Loan>(`${this.apiUrl}/loans`, loan, { headers }).subscribe((created) => {
      this.loanState.update((loans) => [created, ...loans]);
    });
  }

  override updateLoan(loan: UpdateLoan): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.put<Loan>(`${this.apiUrl}/loans/${loan.id}`, loan, { headers }).subscribe((updated) => {
      this.loanState.update((loans) => loans.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  override removeLoan(loanId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.delete<void>(`${this.apiUrl}/loans/${loanId}`, { headers }).subscribe(() => {
      this.loanState.update((loans) => loans.filter((loan) => loan.id !== loanId));
      this.transactionState.update((transactions) =>
        transactions.map((transaction) =>
          transaction.loanId === loanId ? { ...transaction, loanId: undefined } : transaction,
        ),
      );
    });
  }

  override addObligation(obligation: CreateObligation): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.post<Obligation>(`${this.apiUrl}/obligations`, obligation, { headers }).subscribe((created) => {
      this.obligationState.update((obligations) => [created, ...obligations]);
    });
  }

  override updateObligation(obligation: UpdateObligation): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http
      .put<Obligation>(`${this.apiUrl}/obligations/${obligation.id}`, obligation, { headers })
      .subscribe((updated) => {
        this.obligationState.update((obligations) =>
          obligations.map((item) => (item.id === updated.id ? updated : item)),
        );
      });
  }

  override removeObligation(obligationId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.delete<void>(`${this.apiUrl}/obligations/${obligationId}`, { headers }).subscribe(() => {
      this.obligationState.update((obligations) => obligations.filter((obligation) => obligation.id !== obligationId));
    });
  }

  override addCategory(category: CreateCategory): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.post<Category>(`${this.apiUrl}/categories`, category, { headers }).subscribe((created) => {
      this.categoryState.update((categories) => [...categories, created]);
    });
  }

  override removeCategory(categoryId: string): void {
    const headers = this.authHeaders();
    if (!headers) {
      return;
    }

    this.http.delete<void>(`${this.apiUrl}/categories/${categoryId}`, { headers }).subscribe(() => {
      this.categoryState.update((categories) => categories.filter((category) => category.id !== categoryId));
    });
  }

  private loadCategories(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.categoryState.set([]);
      return;
    }

    this.http.get<readonly Category[]>(`${this.apiUrl}/categories`, { headers }).subscribe((categories) => {
      this.categoryState.set(categories ?? []);
    });
  }

  private loadTransactions(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.transactionState.set([]);
      return;
    }

    this.http.get<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions`, { headers }).subscribe((transactions) => {
      this.transactionState.set(transactions ?? []);
    });
  }

  private loadObligations(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.obligationState.set([]);
      return;
    }

    this.http.get<readonly Obligation[]>(`${this.apiUrl}/obligations`, { headers }).subscribe((obligations) => {
      this.obligationState.set(obligations ?? []);
    });
  }

  private loadLoans(): void {
    const headers = this.authHeaders();
    if (!headers) {
      this.loanState.set([]);
      return;
    }

    this.http.get<readonly Loan[]>(`${this.apiUrl}/loans`, { headers }).subscribe((loans) => {
      this.loanState.set(loans ?? []);
    });
  }

  private authHeaders(): HttpHeaders | undefined {
    if (typeof sessionStorage === 'undefined') {
      return undefined;
    }

    const token = sessionStorage.getItem('ledger-auth-token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }
}
