import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateTransaction,
  LedgerTransaction,
  Loan,
} from '../models/ledger.models';
import { LedgerRepository } from './ledger.repository';

@Injectable()
export class HttpLedgerRepository extends LedgerRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/ledger';

  private readonly categoryState = signal<readonly Category[]>([]);
  private readonly transactionState = signal<readonly LedgerTransaction[]>([]);
  private readonly loanState = signal<readonly Loan[]>([]);

  override readonly categories: Signal<readonly Category[]> = this.categoryState.asReadonly();
  override readonly transactions: Signal<readonly LedgerTransaction[]> = this.transactionState.asReadonly();
  override readonly loans: Signal<readonly Loan[]> = this.loanState.asReadonly();

  load(): void {
    this.http.get<readonly Category[]>(`${this.apiUrl}/categories`).subscribe((categories) => {
      this.categoryState.set(categories);
    });

    this.http.get<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions`).subscribe((transactions) => {
      this.transactionState.set(transactions);
    });

    this.http.get<readonly Loan[]>(`${this.apiUrl}/loans`).subscribe((loans) => {
      this.loanState.set(loans);
    });
  }

  override addTransaction(transaction: CreateTransaction): void {
    this.http.post<LedgerTransaction>(`${this.apiUrl}/transactions`, transaction).subscribe((created) => {
      this.transactionState.update((transactions) => [created, ...transactions]);
    });
  }

  override addTransactions(transactions: readonly CreateTransaction[]): void {
    this.http
      .post<readonly LedgerTransaction[]>(`${this.apiUrl}/transactions/batch`, { transactions })
      .subscribe((created) => {
        this.transactionState.update((current) => [...created, ...current]);
      });
  }

  override addLoan(loan: CreateLoan): void {
    this.http.post<Loan>(`${this.apiUrl}/loans`, loan).subscribe((created) => {
      this.loanState.update((loans) => [created, ...loans]);
    });
  }

  override addCategory(category: CreateCategory): void {
    this.http.post<Category>(`${this.apiUrl}/categories`, category).subscribe((created) => {
      this.categoryState.update((categories) => [...categories, created]);
    });
  }

  override removeCategory(categoryId: string): void {
    this.http.delete<void>(`${this.apiUrl}/categories/${categoryId}`).subscribe(() => {
      this.categoryState.update((categories) => categories.filter((category) => category.id !== categoryId));
    });
  }
}
