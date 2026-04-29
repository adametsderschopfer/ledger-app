import { InMemoryLedgerRepository } from './in-memory-ledger.repository';

describe('InMemoryLedgerRepository', () => {
  let repository: InMemoryLedgerRepository;

  beforeEach(() => {
    repository = new InMemoryLedgerRepository();
  });

  it('should expose seeded categories, transactions and loans', () => {
    expect(repository.categories().length).toBeGreaterThan(0);
    expect(repository.transactions().length).toBeGreaterThan(0);
    expect(repository.loans().length).toBeGreaterThan(0);
  });

  it('should add regular expenses without changing loan debt', () => {
    const debtBefore = repository.loans().find((loan) => loan.id === 'car-loan')?.remainingAmount;

    repository.addTransaction({
      type: 'expense',
      date: '2026-04-29',
      categoryId: 'groceries',
      title: 'Тестовый расход',
      amount: 1000,
    });

    expect(repository.transactions()[0].title).toBe('Тестовый расход');
    expect(repository.loans().find((loan) => loan.id === 'car-loan')?.remainingAmount).toBe(debtBefore);
  });

  it('should reduce loan debt when expense is linked to a loan', () => {
    const debtBefore = repository.loans().find((loan) => loan.id === 'car-loan')?.remainingAmount ?? 0;

    repository.addTransaction({
      type: 'expense',
      date: '2026-04-29',
      categoryId: 'credit-payments',
      title: 'Платеж',
      amount: 5000,
      loanId: 'car-loan',
    });

    expect(repository.loans().find((loan) => loan.id === 'car-loan')?.remainingAmount).toBe(debtBefore - 5000);
  });

  it('should add a batch of transactions and apply linked loan payments', () => {
    const debtBefore = repository.loans().find((loan) => loan.id === 'phone-installment')?.remainingAmount ?? 0;

    repository.addTransactions([
      {
        type: 'expense',
        date: '2026-04-29',
        categoryId: 'credit-payments',
        title: 'Рассрочка',
        amount: 3000,
        loanId: 'phone-installment',
      },
      {
        type: 'income',
        date: '2026-04-29',
        categoryId: 'freelance',
        title: 'Оплата',
        amount: 7000,
      },
    ]);

    expect(repository.transactions().slice(0, 2).map((transaction) => transaction.title)).toEqual([
      'Рассрочка',
      'Оплата',
    ]);
    expect(repository.loans().find((loan) => loan.id === 'phone-installment')?.remainingAmount).toBe(
      debtBefore - 3000,
    );
  });

  it('should create loans with remaining amount equal to original amount', () => {
    repository.addLoan({
      name: 'Ипотека',
      originalAmount: 5_000_000,
      monthlyPayment: 70_000,
      dueDay: 5,
    });

    expect(repository.loans()[0]).toMatchObject({
      name: 'Ипотека',
      originalAmount: 5_000_000,
      remainingAmount: 5_000_000,
    });
  });

  it('should add and remove non-system categories but keep system categories', () => {
    repository.addCategory({
      name: 'Подписки',
      type: 'expense',
      color: '#1a73e8',
    });
    const created = repository.categories().find((category) => category.name === 'Подписки');

    expect(created).toBeTruthy();

    repository.removeCategory(created?.id ?? '');
    repository.removeCategory('groceries');

    expect(repository.categories().some((category) => category.name === 'Подписки')).toBe(false);
    expect(repository.categories().some((category) => category.id === 'groceries')).toBe(true);
  });
});
