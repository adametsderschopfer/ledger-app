import { TestBed } from '@angular/core/testing';
import { LedgerFacade } from './ledger.facade';
import { InMemoryLedgerRepository } from './repositories/in-memory-ledger.repository';
import { LedgerRepository } from './repositories/ledger.repository';

describe('LedgerFacade', () => {
  let facade: LedgerFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LedgerFacade, { provide: LedgerRepository, useClass: InMemoryLedgerRepository }],
    });

    facade = TestBed.inject(LedgerFacade);
  });

  it('should calculate monthly totals and balance', () => {
    expect(facade.monthlyIncome()).toBe(350500);
    expect(facade.monthlyExpense()).toBe(128600);
    expect(facade.monthlyBalance()).toBe(221900);
  });

  it('should group all transactions by day from newest to oldest', () => {
    const groups = facade.allTransactionGroups();

    expect(groups.length).toBeGreaterThan(1);
    expect(groups[0].date >= groups[1].date).toBe(true);
    expect(groups.flatMap((group) => group.transactions).length).toBe(facade.transactions().length);
  });

  it('should split income and expense groups independently', () => {
    expect(facade.incomeTransactionGroups().every((group) => group.expense === 0)).toBe(true);
    expect(facade.expenseTransactionGroups().every((group) => group.income === 0)).toBe(true);
  });

  it('should create daily expense transactions with today date', () => {
    facade.addDailyExpenses([{ categoryId: 'groceries', title: 'Кофе', amount: 250 }]);

    expect(facade.transactions()[0]).toMatchObject({
      type: 'expense',
      categoryId: 'groceries',
      title: 'Кофе',
      amount: 250,
    });
  });

  it('should identify categories linked to loans', () => {
    expect(facade.categoryLinksToLoan('credit-payments')).toBe(true);
    expect(facade.categoryLinksToLoan('groceries')).toBe(false);
  });

  it('should record custom obligations as expenses', () => {
    facade.addObligation({
      name: 'Интернет',
      amount: 1200,
      dueDay: 15,
      categoryId: 'utilities',
    });

    const obligation = facade.upcomingObligations().find((item) => item.name === 'Интернет');
    expect(obligation).toBeTruthy();

    facade.recordObligationPayment(obligation!);

    expect(facade.transactions()[0]).toMatchObject({
      type: 'expense',
      categoryId: 'utilities',
      title: 'Обязательный платеж: Интернет',
      amount: 1200,
    });
  });

  it('should remove a paid loan from upcoming obligations', () => {
    facade.addLoan({
      name: 'Короткий кредит',
      originalAmount: 500,
      monthlyPayment: 500,
      dueDay: 3,
    });
    const loan = facade.loans().find((item) => item.name === 'Короткий кредит');

    expect(loan).toBeTruthy();
    expect(
      facade.upcomingObligations().some((item) => item.source === 'loan' && item.id === loan!.id),
    ).toBe(true);

    facade.recordLoanPayment(loan!.id);

    expect(facade.loans().find((item) => item.id === loan!.id)?.remainingAmount).toBe(0);
    expect(
      facade.upcomingObligations().some((item) => item.source === 'loan' && item.id === loan!.id),
    ).toBe(false);
  });

  it('should format money in rubles', () => {
    expect(facade.money(120000)).toContain('120');
    expect(facade.money(120000)).toContain('₽');
  });
});
