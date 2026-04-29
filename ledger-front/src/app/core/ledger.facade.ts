import { Injectable, computed, inject } from '@angular/core';
import {
  Category,
  CreateCategory,
  CreateLoan,
  CreateTransaction,
  DailyExpenseDraft,
  LedgerTransaction,
  Loan,
} from './models/ledger.models';
import { LedgerRepository } from './repositories/ledger.repository';

export interface CategoryBreakdown {
  category: Category;
  amount: number;
  share: number;
}

export interface TransactionDayGroup {
  date: string;
  income: number;
  expense: number;
  transactions: readonly LedgerTransaction[];
}

@Injectable({ providedIn: 'root' })
export class LedgerFacade {
  private readonly repository = inject(LedgerRepository);

  readonly categories = this.repository.categories;
  readonly transactions = this.repository.transactions;
  readonly loans = this.repository.loans;

  readonly incomeCategories = computed(() => this.categories().filter((category) => category.type === 'income'));
  readonly expenseCategories = computed(() => this.categories().filter((category) => category.type === 'expense'));
  readonly currentMonthTransactions = computed(() => {
    const now = new Date();
    return this.transactions().filter((transaction) => {
      const date = new Date(`${transaction.date}T00:00:00`);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  });

  readonly monthlyIncome = computed(() => sumTransactions(this.currentMonthTransactions(), 'income'));
  readonly monthlyExpense = computed(() => sumTransactions(this.currentMonthTransactions(), 'expense'));
  readonly monthlyBalance = computed(() => this.monthlyIncome() - this.monthlyExpense());
  readonly totalLoanDebt = computed(() =>
    this.loans().reduce((total, loan) => total + loan.remainingAmount, 0),
  );
  readonly upcomingLoanPayments = computed(() =>
    [...this.loans()].sort((first, second) => first.dueDay - second.dueDay),
  );
  readonly recentTransactions = computed(() =>
    [...this.transactions()]
      .sort((first, second) => second.date.localeCompare(first.date))
      .slice(0, 6),
  );
  readonly allTransactionGroups = computed(() => groupTransactionsByDay(this.transactions()));
  readonly incomeTransactionGroups = computed(() =>
    groupTransactionsByDay(this.transactions().filter((transaction) => transaction.type === 'income')),
  );
  readonly expenseTransactionGroups = computed(() =>
    groupTransactionsByDay(this.transactions().filter((transaction) => transaction.type === 'expense')),
  );
  readonly expenseBreakdown = computed(() => {
    const expenses = this.currentMonthTransactions().filter((transaction) => transaction.type === 'expense');
    const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
    const byCategory = new Map<string, number>();

    expenses.forEach((transaction) => {
      byCategory.set(transaction.categoryId, (byCategory.get(transaction.categoryId) ?? 0) + transaction.amount);
    });

    return [...byCategory.entries()]
      .map(([categoryId, amount]): CategoryBreakdown => {
        const category = this.categoryById(categoryId);
        return {
          category,
          amount,
          share: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
      .sort((first, second) => second.amount - first.amount);
  });

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
        name: 'Без категории',
        type: 'expense',
        color: '#5f6368',
      }
    );
  }

  loanById(loanId: string | undefined): Loan | undefined {
    return this.loans().find((loan) => loan.id === loanId);
  }

  categoryLinksToLoan(categoryId: string): boolean {
    return this.categoryById(categoryId).linksToLoan === true;
  }

  transactionGroups(transactions: readonly LedgerTransaction[]): readonly TransactionDayGroup[] {
    return groupTransactionsByDay(transactions);
  }

  money(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
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

function sumTransactions(transactions: readonly LedgerTransaction[], type: 'income' | 'expense'): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function groupTransactionsByDay(transactions: readonly LedgerTransaction[]): readonly TransactionDayGroup[] {
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
