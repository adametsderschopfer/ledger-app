import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
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
  emptyPagedListState,
} from '../models/ledger.models';
import { LedgerRepository } from './ledger.repository';

const expenseLoanCategoryId = 'credit-payments';

@Injectable()
export class InMemoryLedgerRepository extends LedgerRepository {
  private readonly categorySource = signal<readonly Category[]>([
    { id: 'salary', name: 'Зарплата', type: 'income', color: '#1a73e8', isSystem: true },
    { id: 'freelance', name: 'Фриланс', type: 'income', color: '#34a853' },
    { id: 'interest', name: 'Проценты', type: 'income', color: '#fbbc04' },
    { id: 'bonus', name: 'Бонусы', type: 'income', color: '#188038' },
    { id: 'investments', name: 'Инвестиции', type: 'income', color: '#f9ab00' },
    { id: 'groceries', name: 'Продукты', type: 'expense', color: '#d93025', isSystem: true },
    { id: 'transport', name: 'Транспорт', type: 'expense', color: '#1a73e8' },
    { id: 'home', name: 'Дом', type: 'expense', color: '#188038' },
    { id: 'utilities', name: 'Коммунальные услуги', type: 'expense', color: '#f9ab00' },
    { id: 'health', name: 'Здоровье', type: 'expense', color: '#a142f4' },
    { id: 'education', name: 'Обучение', type: 'expense', color: '#1a73e8' },
    { id: 'entertainment', name: 'Досуг', type: 'expense', color: '#fa7b17' },
    {
      id: expenseLoanCategoryId,
      name: 'Платежи по кредитам',
      type: 'expense',
      color: '#a142f4',
      isSystem: true,
      linksToLoan: true,
    },
  ]);

  private readonly transactionSource = signal<readonly LedgerTransaction[]>(createMockTransactions());

  private readonly loanSource = signal<readonly Loan[]>([
    {
      id: 'car-loan',
      name: 'Автокредит',
      originalAmount: 900000,
      remainingAmount: 614000,
      monthlyPayment: 26000,
      dueDay: 10,
    },
    {
      id: 'phone-installment',
      name: 'Рассрочка телефона',
      originalAmount: 120000,
      remainingAmount: 72000,
      monthlyPayment: 12000,
      dueDay: 22,
    },
  ]);

  private readonly obligationSource = signal<readonly Obligation[]>([
    {
      id: 'internet',
      name: 'Домашний интернет',
      amount: 900,
      dueDay: 18,
      categoryId: 'utilities',
    },
    {
      id: 'mobile',
      name: 'Мобильная связь',
      amount: 1200,
      dueDay: 25,
      categoryId: 'utilities',
    },
  ]);

  private readonly isLoadingState = signal(false);
  private readonly hasLoadedState = signal(true);
  private readonly categoryPageState = signal<PagedListState<Category>>(emptyPagedListState());
  private readonly transactionPageState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly incomeTransactionPageState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly expenseTransactionPageState = signal<PagedListState<LedgerTransaction>>(emptyPagedListState());
  private readonly loanPageState = signal<PagedListState<Loan>>(emptyPagedListState());
  private readonly obligationPageState = signal<PagedListState<Obligation>>(emptyPagedListState());
  private readonly dashboardSummaryState = computed(() => buildDashboardSummary(this.categorySource(), this.transactionSource(), this.loanSource(), this.obligationSource()));
  private readonly statisticsSummaryState = computed(() => buildStatisticsSummary(this.categorySource(), this.transactionSource(), this.loanSource()));

  override readonly isLoading = this.isLoadingState.asReadonly();
  override readonly hasLoaded = this.hasLoadedState.asReadonly();
  override readonly categoryList: Signal<PagedListState<Category>> = this.categoryPageState.asReadonly();
  override readonly transactionList: Signal<PagedListState<LedgerTransaction>> = this.transactionPageState.asReadonly();
  override readonly incomeTransactionList: Signal<PagedListState<LedgerTransaction>> = this.incomeTransactionPageState.asReadonly();
  override readonly expenseTransactionList: Signal<PagedListState<LedgerTransaction>> = this.expenseTransactionPageState.asReadonly();
  override readonly loanList: Signal<PagedListState<Loan>> = this.loanPageState.asReadonly();
  override readonly obligationList: Signal<PagedListState<Obligation>> = this.obligationPageState.asReadonly();
  override readonly dashboardSummary: Signal<DashboardSummary | null> = this.dashboardSummaryState;
  override readonly statisticsSummary: Signal<StatisticsSummary | null> = this.statisticsSummaryState;
  readonly categories = this.categorySource.asReadonly();
  readonly transactions = this.transactionSource.asReadonly();
  readonly loans = this.loanSource.asReadonly();
  readonly obligations = this.obligationSource.asReadonly();

  constructor() {
    super();
    this.load();
    this.loadIncomeTransactionsPage(true);
    this.loadExpenseTransactionsPage(true);
  }

  override load(): void {
    this.loadCategoriesPage(true);
    this.loadTransactionsPage({}, true);
    this.loadLoansPage(true);
    this.loadObligationsPage(true);
  }

  override loadCategoriesPage(reset = false): void {
    this.loadLocalPage(this.categoryPageState, this.categorySource(), reset);
  }

  override loadTransactionsPage(filters: TransactionListFilters, reset = false): void {
    this.loadLocalPage(this.transactionPageState, filterTransactions(this.transactionSource(), filters), reset);
  }

  override loadIncomeTransactionsPage(reset = false): void {
    this.loadLocalPage(this.incomeTransactionPageState, filterTransactions(this.transactionSource(), { type: 'income' }), reset);
  }

  override loadExpenseTransactionsPage(reset = false): void {
    this.loadLocalPage(this.expenseTransactionPageState, filterTransactions(this.transactionSource(), { type: 'expense' }), reset);
  }

  override loadLoansPage(reset = false): void {
    this.loadLocalPage(this.loanPageState, this.loanSource(), reset);
  }

  override loadObligationsPage(reset = false): void {
    this.loadLocalPage(this.obligationPageState, this.obligationSource(), reset);
  }

  override refreshDashboardSummary(): void {
    return;
  }

  override refreshStatisticsSummary(): void {
    return;
  }

  override addTransaction(transaction: CreateTransaction): void {
    const created = { ...transaction, id: createId('tx') };
    this.transactionSource.update((transactions) => [created, ...transactions]);
    this.applyLoanPayment(created);
    this.reloadLoadedPages();
  }

  override addTransactions(transactions: readonly CreateTransaction[]): void {
    const createdTransactions = transactions.map((transaction) => ({
      ...transaction,
      id: createId('tx'),
    }));

    this.transactionSource.update((current) => [...createdTransactions, ...current]);
    createdTransactions.forEach((transaction) => this.applyLoanPayment(transaction));
    this.reloadLoadedPages();
  }

  override addLoan(loan: CreateLoan): void {
    this.loanSource.update((loans) => [
      {
        ...loan,
        id: createId('loan'),
        remainingAmount: loan.remainingAmount ?? loan.originalAmount,
      },
      ...loans,
    ]);
    this.reloadLoadedPages();
  }

  override updateLoan(updatedLoan: UpdateLoan): void {
    this.loanSource.update((loans) =>
      loans.map((loan) =>
        loan.id === updatedLoan.id
          ? {
              ...loan,
              ...updatedLoan,
              remainingAmount: Math.min(updatedLoan.remainingAmount ?? loan.remainingAmount, updatedLoan.originalAmount),
            }
          : loan,
      ),
    );
    this.reloadLoadedPages();
  }

  override removeLoan(loanId: string): void {
    this.loanSource.update((loans) => loans.filter((loan) => loan.id !== loanId));
    this.transactionSource.update((transactions) =>
      transactions.map((transaction) =>
        transaction.loanId === loanId ? { ...transaction, loanId: undefined } : transaction,
      ),
    );
    this.reloadLoadedPages();
  }

  override addObligation(obligation: CreateObligation): void {
    this.obligationSource.update((obligations) => [
      {
        ...obligation,
        id: createId('obligation'),
      },
      ...obligations,
    ]);
    this.reloadLoadedPages();
  }

  override updateObligation(updatedObligation: UpdateObligation): void {
    this.obligationSource.update((obligations) =>
      obligations.map((obligation) =>
        obligation.id === updatedObligation.id ? { ...obligation, ...updatedObligation } : obligation,
      ),
    );
    this.reloadLoadedPages();
  }

  override removeObligation(obligationId: string): void {
    this.obligationSource.update((obligations) => obligations.filter((obligation) => obligation.id !== obligationId));
    this.reloadLoadedPages();
  }

  override addCategory(category: CreateCategory): void {
    this.categorySource.update((categories) => [
      ...categories,
      {
        ...category,
        linksToLoan: category.type === 'expense' && category.linksToLoan,
        id: createId('cat'),
      },
    ]);
    this.reloadLoadedPages();
  }

  override removeCategory(categoryId: string): void {
    const category = this.categorySource().find((item) => item.id === categoryId);

    if (!category || category.isSystem) {
      return;
    }

    this.categorySource.update((categories) => categories.filter((item) => item.id !== categoryId));
    this.reloadLoadedPages();
  }

  private applyLoanPayment(transaction: LedgerTransaction): void {
    if (transaction.type !== 'expense' || !transaction.loanId) {
      return;
    }

    this.loanSource.update((loans) =>
      loans.map((loan) =>
        loan.id === transaction.loanId
          ? { ...loan, remainingAmount: Math.max(0, loan.remainingAmount - transaction.amount) }
          : loan,
      ),
    );
  }

  private loadLocalPage<T>(state: WritableSignal<PagedListState<T>>, source: readonly T[], reset: boolean): void {
    const current = state();
    const offset = reset ? 0 : Number(current.nextCursor || 0);
    const pageSize = 30;
    const items = source.slice(offset, offset + pageSize);
    const nextOffset = offset + items.length;

    state.set({
      items: reset ? items : [...current.items, ...items],
      nextCursor: nextOffset < source.length ? String(nextOffset) : '',
      hasMore: nextOffset < source.length,
      isLoading: false,
      hasLoaded: true,
      error: false,
    });
  }

  private reloadLoadedPages(): void {
    if (this.categoryPageState().hasLoaded) {
      this.loadCategoriesPage(true);
    }
    if (this.transactionPageState().hasLoaded) {
      this.loadTransactionsPage({}, true);
    }
    if (this.incomeTransactionPageState().hasLoaded) {
      this.loadIncomeTransactionsPage(true);
    }
    if (this.expenseTransactionPageState().hasLoaded) {
      this.loadExpenseTransactionsPage(true);
    }
    if (this.loanPageState().hasLoaded) {
      this.loadLoansPage(true);
    }
    if (this.obligationPageState().hasLoaded) {
      this.loadObligationsPage(true);
    }
  }
}

function filterTransactions(
  transactions: readonly LedgerTransaction[],
  filters: TransactionListFilters,
): readonly LedgerTransaction[] {
  const query = filters.search?.trim().toLowerCase() ?? '';
  return [...transactions]
    .filter(
      (transaction) =>
        (!filters.type || transaction.type === filters.type) &&
        (!filters.categoryId || transaction.categoryId === filters.categoryId) &&
        (!filters.startDate || transaction.date >= filters.startDate) &&
        (!filters.endDate || transaction.date <= filters.endDate) &&
        (!query || transaction.title.toLowerCase().includes(query)),
    )
    .sort((first, second) => second.date.localeCompare(first.date));
}

function buildDashboardSummary(
  categories: readonly Category[],
  transactions: readonly LedgerTransaction[],
  loans: readonly Loan[],
  obligations: readonly Obligation[],
): DashboardSummary {
  const month = currentMonthKey();
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(month));
  const monthIncome = sumTransactions(monthTransactions, 'income');
  const monthExpense = sumTransactions(monthTransactions, 'expense');
  const activeLoans = loans.filter((loan) => loan.remainingAmount > 0).sort((first, second) => first.dueDay - second.dueDay);

  return {
    month,
    monthIncome,
    monthExpense,
    monthBalance: monthIncome - monthExpense,
    loanDebt: loans.reduce((sum, loan) => sum + loan.remainingAmount, 0),
    expenseBreakdown: categoryBreakdown(monthTransactions, 'expense', categories),
    activeLoans,
    upcomingObligations: [
      ...activeLoans.map((loan) => ({
        id: loan.id,
        name: loan.name,
        amount: Math.min(loan.monthlyPayment, loan.remainingAmount),
        dueDay: loan.dueDay,
        source: 'loan' as const,
      })),
      ...obligations.map((obligation) => ({
        id: obligation.id,
        name: obligation.name,
        amount: obligation.amount,
        dueDay: obligation.dueDay,
        categoryId: obligation.categoryId,
        source: 'custom' as const,
      })),
    ].sort((first, second) => first.dueDay - second.dueDay || first.name.localeCompare(second.name)),
    recentTransactions: [...transactions].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 6),
  };
}

function buildStatisticsSummary(
  categories: readonly Category[],
  transactions: readonly LedgerTransaction[],
  loans: readonly Loan[],
): StatisticsSummary {
  const totalIncome = sumTransactions(transactions, 'income');
  const totalExpense = sumTransactions(transactions, 'expense');
  const netBalance = totalIncome - totalExpense;
  const firstTransactionDate = [...transactions].map((transaction) => transaction.date).sort()[0] ?? '';
  const activeDays = new Set(transactions.map((transaction) => transaction.date)).size;
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const originalDebt = loans.reduce((sum, loan) => sum + loan.originalAmount, 0);
  const remainingDebt = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  const maxPayment = Math.max(1, ...loans.map((loan) => loan.monthlyPayment));

  return {
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate: percentOf(netBalance, totalIncome),
    firstTransactionDate,
    activeDays,
    averageDailyExpense: totalExpense / Math.max(1, daysBetween(firstTransactionDate, toInputDate(new Date()))),
    averageTransaction: totalAmount / Math.max(1, transactions.length),
    monthlyDebtPressure: loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0),
    loanPayoffShare: percentOf(originalDebt - remainingDebt, originalDebt),
    monthStats: buildMonthStats(transactions),
    expenseCategories: categoryBreakdown(transactions, 'expense', categories),
    incomeCategories: categoryBreakdown(transactions, 'income', categories),
    weekdays: buildWeekdays(transactions),
    loanStats: loans.map((loan) => {
      const paid = Math.max(0, loan.originalAmount - loan.remainingAmount);
      return {
        loan,
        paid,
        paidShare: percentOf(paid, loan.originalAmount),
        pressureShare: percentOf(loan.monthlyPayment, maxPayment),
      };
    }),
    topExpenses: [...transactions]
      .filter((transaction) => transaction.type === 'expense')
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 6)
      .map((transaction) => {
        const category = categoryById(categories, transaction.categoryId);
        return { transaction, categoryName: category.name, categoryColor: category.color };
      }),
  };
}

function categoryBreakdown(
  transactions: readonly LedgerTransaction[],
  type: 'income' | 'expense',
  categories: readonly Category[],
) {
  const values = new Map<string, { category: Category; amount: number; transactions: number }>();
  let total = 0;
  for (const transaction of transactions) {
    if (transaction.type !== type) {
      continue;
    }
    const category = categoryById(categories, transaction.categoryId);
    const current = values.get(category.id) ?? { category, amount: 0, transactions: 0 };
    current.amount += transaction.amount;
    current.transactions += 1;
    total += transaction.amount;
    values.set(category.id, current);
  }
  return [...values.values()]
    .map((value) => ({ ...value, share: percentOf(value.amount, total) }))
    .sort((first, second) => second.amount - first.amount);
}

function buildMonthStats(transactions: readonly LedgerTransaction[]) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return { key: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`, income: 0, expense: 0, balance: 0 };
  });
  for (const transaction of transactions) {
    const month = months.find((item) => item.key === transaction.date.slice(0, 7));
    if (!month) {
      continue;
    }
    if (transaction.type === 'income') {
      month.income += transaction.amount;
    } else {
      month.expense += transaction.amount;
    }
    month.balance = month.income - month.expense;
  }
  return months;
}

function buildWeekdays(transactions: readonly LedgerTransaction[]) {
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ weekday, amount: 0, count: 0 }));
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }
    const day = normalizeWeekday(new Date(`${transaction.date}T00:00:00`).getDay());
    weekdays[day].amount += transaction.amount;
    weekdays[day].count += 1;
  }
  return weekdays;
}

function categoryById(categories: readonly Category[], categoryId: string): Category {
  return categories.find((category) => category.id === categoryId) ?? { id: 'unknown', name: 'Unknown', type: 'expense', color: '#5f6368' };
}

function sumTransactions(transactions: readonly LedgerTransaction[], type: 'income' | 'expense'): number {
  return transactions.filter((transaction) => transaction.type === type).reduce((sum, transaction) => sum + transaction.amount, 0);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function daysBetween(start: string, end: string): number {
  if (!start) {
    return 1;
  }
  return Math.max(1, Math.ceil((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) + 1);
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
}

function normalizeWeekday(day: number): number {
  return day === 0 ? 6 : day - 1;
}

function currentMonthDate(day: number): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${`${day}`.padStart(2, '0')}`;
}

function previousMonthDate(day: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, day);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function createMockTransactions(): readonly LedgerTransaction[] {
  return [
    {
      id: 'tx-1',
      type: 'income',
      date: currentMonthDate(2),
      categoryId: 'salary',
      title: 'Аванс',
      amount: 120000,
    },
    {
      id: 'tx-2',
      type: 'expense',
      date: currentMonthDate(3),
      categoryId: 'groceries',
      title: 'Супермаркет',
      amount: 7800,
    },
    {
      id: 'tx-3',
      type: 'expense',
      date: currentMonthDate(4),
      categoryId: 'utilities',
      title: 'Электричество и вода',
      amount: 6200,
    },
    {
      id: 'tx-4',
      type: 'expense',
      date: currentMonthDate(5),
      categoryId: 'transport',
      title: 'Пополнение проездного',
      amount: 2400,
    },
    {
      id: 'tx-5',
      type: 'expense',
      date: currentMonthDate(6),
      categoryId: 'transport',
      title: 'Такси и проезд',
      amount: 3200,
    },
    {
      id: 'tx-6',
      type: 'income',
      date: currentMonthDate(7),
      categoryId: 'bonus',
      title: 'Премия за квартал',
      amount: 35000,
    },
    {
      id: 'tx-7',
      type: 'expense',
      date: currentMonthDate(8),
      categoryId: 'health',
      title: 'Аптека',
      amount: 4100,
    },
    {
      id: 'tx-8',
      type: 'income',
      date: currentMonthDate(9),
      categoryId: 'freelance',
      title: 'Проект для клиента',
      amount: 45000,
    },
    {
      id: 'tx-9',
      type: 'expense',
      date: currentMonthDate(10),
      categoryId: expenseLoanCategoryId,
      title: 'Платеж по автокредиту',
      amount: 26000,
      loanId: 'car-loan',
    },
    {
      id: 'tx-10',
      type: 'expense',
      date: currentMonthDate(11),
      categoryId: 'groceries',
      title: 'Рынок и бытовые товары',
      amount: 9600,
    },
    {
      id: 'tx-11',
      type: 'expense',
      date: currentMonthDate(12),
      categoryId: 'entertainment',
      title: 'Кино и ужин',
      amount: 5200,
    },
    {
      id: 'tx-12',
      type: 'income',
      date: currentMonthDate(13),
      categoryId: 'interest',
      title: 'Проценты по накопительному счету',
      amount: 3100,
    },
    {
      id: 'tx-13',
      type: 'expense',
      date: currentMonthDate(14),
      categoryId: 'home',
      title: 'Хозтовары',
      amount: 2800,
    },
    {
      id: 'tx-14',
      type: 'expense',
      date: currentMonthDate(15),
      categoryId: 'education',
      title: 'Подписка на курс',
      amount: 14500,
    },
    {
      id: 'tx-15',
      type: 'expense',
      date: currentMonthDate(16),
      categoryId: 'groceries',
      title: 'Доставка продуктов',
      amount: 6700,
    },
    {
      id: 'tx-16',
      type: 'expense',
      date: currentMonthDate(16),
      categoryId: 'groceries',
      title: 'Магазин у дома',
      amount: 1800,
    },
    {
      id: 'tx-17',
      type: 'expense',
      date: currentMonthDate(16),
      categoryId: 'transport',
      title: 'Парковка',
      amount: 900,
    },
    {
      id: 'tx-18',
      type: 'expense',
      date: currentMonthDate(16),
      categoryId: 'entertainment',
      title: 'Кофе с командой',
      amount: 1600,
    },
    {
      id: 'tx-19',
      type: 'income',
      date: currentMonthDate(17),
      categoryId: 'investments',
      title: 'Дивиденды',
      amount: 12400,
    },
    {
      id: 'tx-20',
      type: 'expense',
      date: currentMonthDate(18),
      categoryId: 'transport',
      title: 'Топливо',
      amount: 7100,
    },
    {
      id: 'tx-21',
      type: 'expense',
      date: currentMonthDate(19),
      categoryId: 'health',
      title: 'Прием у врача',
      amount: 8500,
    },
    {
      id: 'tx-22',
      type: 'expense',
      date: currentMonthDate(20),
      categoryId: 'utilities',
      title: 'Интернет и мобильная связь',
      amount: 3900,
    },
    {
      id: 'tx-23',
      type: 'expense',
      date: currentMonthDate(21),
      categoryId: 'home',
      title: 'Товары для кухни',
      amount: 4300,
    },
    {
      id: 'tx-24',
      type: 'expense',
      date: currentMonthDate(22),
      categoryId: expenseLoanCategoryId,
      title: 'Платеж по рассрочке телефона',
      amount: 12000,
      loanId: 'phone-installment',
    },
    {
      id: 'tx-25',
      type: 'income',
      date: currentMonthDate(23),
      categoryId: 'salary',
      title: 'Зарплата',
      amount: 135000,
    },
    {
      id: 'tx-26',
      type: 'expense',
      date: previousMonthDate(24),
      categoryId: 'entertainment',
      title: 'Концерт',
      amount: 9000,
    },
    {
      id: 'tx-27',
      type: 'expense',
      date: previousMonthDate(26),
      categoryId: 'groceries',
      title: 'Большая закупка',
      amount: 12800,
    },
    {
      id: 'tx-28',
      type: 'income',
      date: previousMonthDate(28),
      categoryId: 'freelance',
      title: 'Поддержка проекта',
      amount: 28000,
    },
  ];
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
