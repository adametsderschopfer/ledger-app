import { Signal } from '@angular/core';
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
  StatisticsSummary,
  TransactionListFilters,
  UpdateLoan,
  UpdateObligation,
} from '../models/ledger.models';

export abstract class LedgerRepository {
  abstract readonly categoryList: Signal<PagedListState<Category>>;
  abstract readonly transactionList: Signal<PagedListState<LedgerTransaction>>;
  abstract readonly incomeTransactionList: Signal<PagedListState<LedgerTransaction>>;
  abstract readonly expenseTransactionList: Signal<PagedListState<LedgerTransaction>>;
  abstract readonly loanList: Signal<PagedListState<Loan>>;
  abstract readonly obligationList: Signal<PagedListState<Obligation>>;
  abstract readonly dashboardSummary: Signal<DashboardSummary | null>;
  abstract readonly statisticsSummary: Signal<StatisticsSummary | null>;
  abstract readonly isLoading: Signal<boolean>;
  abstract readonly hasLoaded: Signal<boolean>;

  abstract load(): void;
  abstract loadCategoriesPage(reset?: boolean): void;
  abstract loadTransactionsPage(filters: TransactionListFilters, reset?: boolean): void;
  abstract loadIncomeTransactionsPage(reset?: boolean): void;
  abstract loadExpenseTransactionsPage(reset?: boolean): void;
  abstract loadLoansPage(reset?: boolean): void;
  abstract loadObligationsPage(reset?: boolean): void;
  abstract refreshDashboardSummary(): void;
  abstract refreshStatisticsSummary(): void;
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
