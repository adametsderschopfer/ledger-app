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
    expect(facade.monthlyExpense()).toBe(124300);
    expect(facade.monthlyBalance()).toBe(226200);
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

  it('should format money in rubles', () => {
    expect(facade.money(120000)).toContain('120');
    expect(facade.money(120000)).toContain('₽');
  });
});
