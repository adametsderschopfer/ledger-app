import { Injectable, computed, inject } from '@angular/core';
import { AppLanguageService } from './i18n/app-language.service';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateObligation,
  CreateTransaction,
  DailyExpenseDraft,
  LedgerTransaction,
  Loan,
  Obligation,
  TransactionListFilters,
  UpdateLoan,
  UpdateObligation,
  UpcomingObligation,
} from './models/ledger.models';
import { LedgerRepository } from './repositories/ledger.repository';

const loanPaymentCategoryId = 'credit-payments';

export type { UpcomingObligation } from './models/ledger.models';

export interface TransactionDayGroup {
  date: string;
  income: number;
  expense: number;
  transactions: readonly LedgerTransaction[];
}

@Injectable({ providedIn: 'root' })
export class LedgerFacade {
  private readonly repository = inject(LedgerRepository);
  private readonly i18n = inject(AppLanguageService);

  readonly categoryList = this.repository.categoryList;
  readonly transactionList = this.repository.transactionList;
  readonly incomeTransactionList = this.repository.incomeTransactionList;
  readonly expenseTransactionList = this.repository.expenseTransactionList;
  readonly loanList = this.repository.loanList;
  readonly obligationList = this.repository.obligationList;
  readonly dashboardSummary = this.repository.dashboardSummary;
  readonly statisticsSummary = this.repository.statisticsSummary;
  readonly isLoading = this.repository.isLoading;
  readonly hasLoaded = this.repository.hasLoaded;

  readonly categories = computed(() => this.categoryList().items);
  readonly transactions = computed(() => this.transactionList().items);
  readonly incomeTransactions = computed(() => this.incomeTransactionList().items);
  readonly expenseTransactions = computed(() => this.expenseTransactionList().items);
  readonly loans = computed(() => this.loanList().items);
  readonly obligations = computed(() => this.obligationList().items);

  readonly incomeCategories = computed(() =>
    this.categories().filter((category) => category.type === 'income'),
  );
  readonly expenseCategories = computed(() =>
    this.categories().filter((category) => category.type === 'expense'),
  );

  readonly monthlyIncome = computed(() => this.dashboardSummary()?.monthIncome ?? 0);
  readonly monthlyExpense = computed(() => this.dashboardSummary()?.monthExpense ?? 0);
  readonly monthlyBalance = computed(() => this.dashboardSummary()?.monthBalance ?? 0);
  readonly totalLoanDebt = computed(() => this.dashboardSummary()?.loanDebt ?? 0);
  readonly activeLoans = computed(() => this.dashboardSummary()?.activeLoans ?? this.loans().filter((loan) => loan.remainingAmount > 0));
  readonly upcomingLoanPayments = computed(() =>
    [...this.activeLoans()].sort((first, second) => first.dueDay - second.dueDay),
  );
  readonly upcomingObligations = computed(() => this.dashboardSummary()?.upcomingObligations ?? []);
  readonly recentTransactions = computed(() => this.dashboardSummary()?.recentTransactions ?? []);
  readonly expenseBreakdown = computed(() => this.dashboardSummary()?.expenseBreakdown ?? []);
  readonly allTransactionGroups = computed(() => groupTransactionsByDay(this.transactions()));
  readonly incomeTransactionGroups = computed(() => groupTransactionsByDay(this.incomeTransactions()));
  readonly expenseTransactionGroups = computed(() => groupTransactionsByDay(this.expenseTransactions()));

  load(): void {
    this.repository.load();
  }

  loadCategoriesPage(reset = false): void {
    this.repository.loadCategoriesPage(reset);
  }

  loadTransactionsPage(filters: TransactionListFilters, reset = false): void {
    this.repository.loadTransactionsPage(filters, reset);
  }

  loadIncomeTransactionsPage(reset = false): void {
    this.repository.loadIncomeTransactionsPage(reset);
  }

  loadExpenseTransactionsPage(reset = false): void {
    this.repository.loadExpenseTransactionsPage(reset);
  }

  loadLoansPage(reset = false): void {
    this.repository.loadLoansPage(reset);
  }

  loadObligationsPage(reset = false): void {
    this.repository.loadObligationsPage(reset);
  }

  refreshDashboardSummary(): void {
    this.repository.refreshDashboardSummary();
  }

  refreshStatisticsSummary(): void {
    this.repository.refreshStatisticsSummary();
  }

  addTransaction(transaction: CreateTransaction): void {
    this.repository.addTransaction(transaction);
  }

  addDailyExpenses(expenses: readonly DailyExpenseDraft[]): void {
    const today = toInputDate(new Date());
    this.repository.addTransactions(
      expenses.map((expense) => ({
        ...expense,
        date: today,
        type: 'expense',
        title: expense.title || this.categoryById(expense.categoryId).name,
      })),
    );
  }

  addLoan(loan: CreateLoan): void {
    this.repository.addLoan(loan);
  }

  updateLoan(loan: UpdateLoan): void {
    this.repository.updateLoan(loan);
  }

  removeLoan(loanId: string): void {
    this.repository.removeLoan(loanId);
  }

  addObligation(obligation: CreateObligation): void {
    this.repository.addObligation(obligation);
  }

  updateObligation(obligation: UpdateObligation): void {
    this.repository.updateObligation(obligation);
  }

  removeObligation(obligationId: string): void {
    this.repository.removeObligation(obligationId);
  }

  recordLoanPayment(loanId: string): void {
    const loan = this.loanById(loanId) ?? this.activeLoans().find((item) => item.id === loanId);

    if (!loan || loan.remainingAmount <= 0) {
      return;
    }

    this.repository.addTransaction({
      type: 'expense',
      date: toInputDate(new Date()),
      categoryId: loanPaymentCategoryId,
      title: `${this.i18n.t('loan.paymentTitle')}: ${loan.name}`,
      amount: Math.min(loan.monthlyPayment, loan.remainingAmount),
      loanId: loan.id,
    });
  }

  recordObligationPayment(obligation: UpcomingObligation): void {
    if (obligation.source === 'loan') {
      this.recordLoanPayment(obligation.id);
      return;
    }

    if (!obligation.categoryId || obligation.amount <= 0) {
      return;
    }

    this.repository.addTransaction({
      type: 'expense',
      date: toInputDate(new Date()),
      categoryId: obligation.categoryId,
      title: `${this.i18n.t('obligation.paymentTitle')}: ${obligation.name}`,
      amount: obligation.amount,
    });
  }

  addCategory(category: CreateCategory): void {
    this.repository.addCategory(category);
  }

  removeCategory(categoryId: string): void {
    this.repository.removeCategory(categoryId);
  }

  categoryById(categoryId: string): Category {
    return (
      this.categories().find((category) => category.id === categoryId) ?? {
        id: 'unknown',
        name: this.i18n.t('category.unknown'),
        type: 'expense',
        color: '#5f6368',
      }
    );
  }

  loanById(loanId: string | undefined): Loan | undefined {
    return this.loans().find((loan) => loan.id === loanId) ?? this.activeLoans().find((loan) => loan.id === loanId);
  }

  obligationById(obligationId: string | undefined): Obligation | undefined {
    return this.obligations().find((obligation) => obligation.id === obligationId);
  }

  categoryLinksToLoan(categoryId: string): boolean {
    return this.categoryById(categoryId).linksToLoan === true;
  }

  transactionGroups(transactions: readonly LedgerTransaction[]): readonly TransactionDayGroup[] {
    return groupTransactionsByDay(transactions);
  }

  money(value: number): string {
    return new Intl.NumberFormat(this.i18n.locale(), {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sumTransactions(
  transactions: readonly LedgerTransaction[],
  type: 'income' | 'expense',
): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function groupTransactionsByDay(
  transactions: readonly LedgerTransaction[],
): readonly TransactionDayGroup[] {
  const groups = new Map<string, LedgerTransaction[]>();

  [...transactions]
    .sort((first, second) => second.date.localeCompare(first.date))
    .forEach((transaction) => {
      groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
    });

  return [...groups.entries()].map(([date, dayTransactions]) => ({
    date,
    income: sumTransactions(dayTransactions, 'income'),
    expense: sumTransactions(dayTransactions, 'expense'),
    transactions: dayTransactions,
  }));
}
