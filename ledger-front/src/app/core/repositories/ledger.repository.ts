import { Signal } from '@angular/core';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateTransaction,
  LedgerTransaction,
  Loan,
} from '../models/ledger.models';

export abstract class LedgerRepository {
  abstract readonly categories: Signal<readonly Category[]>;
  abstract readonly transactions: Signal<readonly LedgerTransaction[]>;
  abstract readonly loans: Signal<readonly Loan[]>;

  abstract addTransaction(transaction: CreateTransaction): void;
  abstract addTransactions(transactions: readonly CreateTransaction[]): void;
  abstract addLoan(loan: CreateLoan): void;
  abstract addCategory(category: CreateCategory): void;
  abstract removeCategory(categoryId: string): void;
}
