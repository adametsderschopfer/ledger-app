export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  isSystem?: boolean;
  linksToLoan?: boolean;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  date: string;
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}

export interface Loan {
  id: string;
  name: string;
  originalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  dueDay: number;
}

export interface Obligation {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  categoryId: string;
}

export interface CreateTransaction {
  type: TransactionType;
  date: string;
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}

export interface CreateLoan {
  name: string;
  originalAmount: number;
  remainingAmount?: number;
  monthlyPayment: number;
  dueDay: number;
}

export interface CreateObligation {
  name: string;
  amount: number;
  dueDay: number;
  categoryId: string;
}

export interface UpdateObligation extends CreateObligation {
  id: string;
}

export interface UpdateLoan extends CreateLoan {
  id: string;
}

export interface CreateCategory {
  name: string;
  type: TransactionType;
  color: string;
  linksToLoan?: boolean;
}

export interface DailyExpenseDraft {
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}

export interface PagedResponse<T> {
  items: readonly T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PagedListState<T> {
  items: readonly T[];
  nextCursor: string;
  hasMore: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  error: boolean;
}

export interface TransactionListFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CategoryBreakdown {
  category: Category;
  amount: number;
  share: number;
  transactions: number;
}

export interface UpcomingObligation {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  source: 'loan' | 'custom';
  categoryId?: string;
}

export interface DashboardSummary {
  month: string;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  loanDebt: number;
  expenseBreakdown: readonly CategoryBreakdown[];
  activeLoans: readonly Loan[];
  upcomingObligations: readonly UpcomingObligation[];
  recentTransactions: readonly LedgerTransaction[];
}

export interface MonthStat {
  key: string;
  income: number;
  expense: number;
  balance: number;
}

export interface WeekdayStat {
  weekday: number;
  amount: number;
  count: number;
}

export interface LoanStat {
  loan: Loan;
  paid: number;
  paidShare: number;
  pressureShare: number;
}

export interface TopTransaction {
  transaction: LedgerTransaction;
  categoryName: string;
  categoryColor: string;
}

export interface StatisticsSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  firstTransactionDate: string;
  activeDays: number;
  averageDailyExpense: number;
  averageTransaction: number;
  monthlyDebtPressure: number;
  loanPayoffShare: number;
  monthStats: readonly MonthStat[];
  expenseCategories: readonly CategoryBreakdown[];
  incomeCategories: readonly CategoryBreakdown[];
  weekdays: readonly WeekdayStat[];
  loanStats: readonly LoanStat[];
  topExpenses: readonly TopTransaction[];
}

export function emptyPagedListState<T>(): PagedListState<T> {
  return {
    items: [],
    nextCursor: '',
    hasMore: false,
    isLoading: false,
    hasLoaded: false,
    error: false,
  };
}
