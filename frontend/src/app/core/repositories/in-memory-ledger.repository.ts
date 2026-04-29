import { Injectable, signal } from '@angular/core';
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

const expenseLoanCategoryId = 'credit-payments';

@Injectable()
export class InMemoryLedgerRepository extends LedgerRepository {
  private readonly categoryState = signal<readonly Category[]>([
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

  private readonly transactionState = signal<readonly LedgerTransaction[]>(createMockTransactions());

  private readonly loanState = signal<readonly Loan[]>([
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

  private readonly obligationState = signal<readonly Obligation[]>([
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

  override readonly isLoading = this.isLoadingState.asReadonly();
  override readonly hasLoaded = this.hasLoadedState.asReadonly();
  override readonly categories = this.categoryState.asReadonly();
  override readonly transactions = this.transactionState.asReadonly();
  override readonly loans = this.loanState.asReadonly();
  override readonly obligations = this.obligationState.asReadonly();

  override load(): void {
    return;
  }

  override addTransaction(transaction: CreateTransaction): void {
    const created = { ...transaction, id: createId('tx') };
    this.transactionState.update((transactions) => [created, ...transactions]);
    this.applyLoanPayment(created);
  }

  override addTransactions(transactions: readonly CreateTransaction[]): void {
    const createdTransactions = transactions.map((transaction) => ({
      ...transaction,
      id: createId('tx'),
    }));

    this.transactionState.update((current) => [...createdTransactions, ...current]);
    createdTransactions.forEach((transaction) => this.applyLoanPayment(transaction));
  }

  override addLoan(loan: CreateLoan): void {
    this.loanState.update((loans) => [
      {
        ...loan,
        id: createId('loan'),
        remainingAmount: loan.remainingAmount ?? loan.originalAmount,
      },
      ...loans,
    ]);
  }

  override updateLoan(updatedLoan: UpdateLoan): void {
    this.loanState.update((loans) =>
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
  }

  override removeLoan(loanId: string): void {
    this.loanState.update((loans) => loans.filter((loan) => loan.id !== loanId));
    this.transactionState.update((transactions) =>
      transactions.map((transaction) =>
        transaction.loanId === loanId ? { ...transaction, loanId: undefined } : transaction,
      ),
    );
  }

  override addObligation(obligation: CreateObligation): void {
    this.obligationState.update((obligations) => [
      {
        ...obligation,
        id: createId('obligation'),
      },
      ...obligations,
    ]);
  }

  override updateObligation(updatedObligation: UpdateObligation): void {
    this.obligationState.update((obligations) =>
      obligations.map((obligation) =>
        obligation.id === updatedObligation.id ? { ...obligation, ...updatedObligation } : obligation,
      ),
    );
  }

  override removeObligation(obligationId: string): void {
    this.obligationState.update((obligations) => obligations.filter((obligation) => obligation.id !== obligationId));
  }

  override addCategory(category: CreateCategory): void {
    this.categoryState.update((categories) => [
      ...categories,
      {
        ...category,
        linksToLoan: category.type === 'expense' && category.linksToLoan,
        id: createId('cat'),
      },
    ]);
  }

  override removeCategory(categoryId: string): void {
    const category = this.categoryState().find((item) => item.id === categoryId);

    if (!category || category.isSystem) {
      return;
    }

    this.categoryState.update((categories) => categories.filter((item) => item.id !== categoryId));
  }

  private applyLoanPayment(transaction: LedgerTransaction): void {
    if (transaction.type !== 'expense' || !transaction.loanId) {
      return;
    }

    this.loanState.update((loans) =>
      loans.map((loan) =>
        loan.id === transaction.loanId
          ? { ...loan, remainingAmount: Math.max(0, loan.remainingAmount - transaction.amount) }
          : loan,
      ),
    );
  }
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
