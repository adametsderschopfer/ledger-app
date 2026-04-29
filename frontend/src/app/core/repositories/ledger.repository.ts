import { Signal } from '@angular/core';
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

export abstract class LedgerRepository {
  abstract readonly isLoading: Signal<boolean>;
  abstract readonly hasLoaded: Signal<boolean>;
  abstract readonly categories: Signal<readonly Category[]>;
  abstract readonly transactions: Signal<readonly LedgerTransaction[]>;
  abstract readonly loans: Signal<readonly Loan[]>;
  abstract readonly obligations: Signal<readonly Obligation[]>;

  abstract load(): void;
  abstract addTransaction(transaction: CreateTransaction): void;
  abstract addTransactions(transactions: readonly CreateTransaction[]): void;
  abstract addLoan(loan: CreateLoan): void;
  abstract updateLoan(loan: UpdateLoan): void;
  abstract removeLoan(loanId: string): void;
  abstract addObligation(obligation: CreateObligation): void;
  abstract updateObligation(obligation: UpdateObligation): void;
  abstract removeObligation(obligationId: string): void;
  abstract addCategory(category: CreateCategory): void;
  abstract removeCategory(categoryId: string): void;
}
