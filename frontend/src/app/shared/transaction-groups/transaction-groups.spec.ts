import { TestBed } from '@angular/core/testing';
import { InMemoryLedgerRepository } from '../../core/repositories/in-memory-ledger.repository';
import { LedgerRepository } from '../../core/repositories/ledger.repository';
import { TransactionGroups } from './transaction-groups';

describe('TransactionGroups', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionGroups],
      providers: [{ provide: LedgerRepository, useClass: InMemoryLedgerRepository }],
    }).compileComponents();
  });

  it('should render grouped transactions', async () => {
    const fixture = TestBed.createComponent(TransactionGroups);
    fixture.componentRef.setInput('groups', [
      {
        date: '2026-04-29',
        income: 1000,
        expense: 300,
        transactions: [
          {
            id: 'tx-test',
            type: 'income',
            date: '2026-04-29',
            categoryId: 'salary',
            title: 'Тест',
            amount: 1000,
          },
        ],
      },
    ]);

    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2026-04-29');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Тест');
  });

  it('should render empty state', async () => {
    const fixture = TestBed.createComponent(TransactionGroups);
    fixture.componentRef.setInput('groups', []);
    fixture.componentRef.setInput('emptyText', 'Пусто');

    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Пусто');
  });
});
