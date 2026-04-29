import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { LedgerTransaction, Loan, TransactionType } from '../../core/models/ledger.models';
import { EmptyState } from '../../shared/empty-state/empty-state';

interface KpiCard {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: 'income' | 'expense' | 'balance' | 'neutral';
}

interface MonthStat {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  incomeHeight: number;
  expenseHeight: number;
  balanceX: number;
  balanceY: number;
}

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  amount: number;
  share: number;
  width: number;
  dash: string;
  offset: number;
  transactions: number;
}

interface WeekdayStat {
  label: string;
  amount: number;
  count: number;
  intensity: number;
}

interface LoanStat {
  loan: Loan;
  paid: number;
  paidShare: number;
  pressureShare: number;
}

interface TopTransaction {
  transaction: LedgerTransaction;
  categoryName: string;
  categoryColor: string;
}

const monthsInTrend = 12;
const chartWidth = 720;
const chartHeight = 220;
const chartPadding = 24;
const donutRadius = 68;
const donutCircumference = 2 * Math.PI * donutRadius;

@Component({
  selector: 'app-statistics',
  imports: [RouterLink, MatButtonModule, MatIconModule, EmptyState],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statistics {
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);

  readonly hasTransactions = computed(() => this.ledger.transactions().length > 0);
  readonly totalIncome = computed(() => sumByType(this.ledger.transactions(), 'income'));
  readonly totalExpense = computed(() => sumByType(this.ledger.transactions(), 'expense'));
  readonly netBalance = computed(() => this.totalIncome() - this.totalExpense());
  readonly savingsRate = computed(() => {
    const income = this.totalIncome();
    return income > 0 ? Math.round((this.netBalance() / income) * 100) : 0;
  });
  readonly firstTransactionDate = computed(() => {
    const dates = this.ledger.transactions().map((transaction) => transaction.date).sort();
    return dates[0] ?? '';
  });
  readonly activeDays = computed(() => new Set(this.ledger.transactions().map((transaction) => transaction.date)).size);
  readonly activeDaysLabel = computed(() =>
    this.i18n.language() === 'EN'
      ? `${this.activeDays() === 1 ? 'active day' : 'active days'}`
      : plural(this.activeDays(), 'активный день', 'активных дня', 'активных дней'),
  );
  readonly averageDailyExpense = computed(() => {
    const days = Math.max(1, daysBetween(this.firstTransactionDate(), todayKey()));
    return this.totalExpense() / days;
  });
  readonly averageTransaction = computed(() => {
    const transactions = this.ledger.transactions();
    const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    return total / Math.max(1, transactions.length);
  });
  readonly monthlyDebtPressure = computed(() =>
    this.ledger.loans().reduce((sum, loan) => sum + loan.monthlyPayment, 0),
  );
  readonly loanPayoffShare = computed(() => {
    const original = this.ledger.loans().reduce((sum, loan) => sum + loan.originalAmount, 0);
    const remaining = this.ledger.loans().reduce((sum, loan) => sum + loan.remainingAmount, 0);
    return original > 0 ? Math.round(((original - remaining) / original) * 100) : 0;
  });

  readonly kpis = computed<readonly KpiCard[]>(() => [
    {
      label: this.i18n.t('transactions.income'),
      value: this.ledger.money(this.totalIncome()),
      helper: this.i18n.t('stats.periodHelper'),
      icon: 'south_west',
      tone: 'income',
    },
    {
      label: this.i18n.t('transactions.expense'),
      value: this.ledger.money(this.totalExpense()),
      helper: `${this.ledger.money(this.averageDailyExpense())} ${this.i18n.t('stats.averageDay')}`,
      icon: 'north_east',
      tone: 'expense',
    },
    {
      label: this.i18n.t('stats.netResult'),
      value: this.ledger.money(this.netBalance()),
      helper: `${this.savingsRate()}% ${this.i18n.t('stats.savingsHelper')}`,
      icon: 'account_balance_wallet',
      tone: 'balance',
    },
    {
      label: this.i18n.t('stats.loanPressure'),
      value: this.ledger.money(this.monthlyDebtPressure()),
      helper: `${this.loanPayoffShare()}% ${this.i18n.t('stats.loanPayoffHelper')}`,
      icon: 'credit_score',
      tone: 'neutral',
    },
  ]);

  readonly monthStats = computed<readonly MonthStat[]>(() => {
    const months = recentMonths(monthsInTrend, this.i18n.locale());
    const grouped = new Map<string, { income: number; expense: number }>();

    for (const transaction of this.ledger.transactions()) {
      const key = transaction.date.slice(0, 7);
      const current = grouped.get(key) ?? { income: 0, expense: 0 };
      if (transaction.type === 'income') {
        current.income += transaction.amount;
      } else {
        current.expense += transaction.amount;
      }
      grouped.set(key, current);
    }

    const maxFlow = Math.max(
      1,
      ...months.flatMap((month) => {
        const values = grouped.get(month.key) ?? { income: 0, expense: 0 };
        return [values.income, values.expense, Math.abs(values.income - values.expense)];
      }),
    );

    return months.map((month, index) => {
      const values = grouped.get(month.key) ?? { income: 0, expense: 0 };
      const balance = values.income - values.expense;
      return {
        key: month.key,
        label: month.label,
        income: values.income,
        expense: values.expense,
        balance,
        incomeHeight: percentOf(values.income, maxFlow),
        expenseHeight: percentOf(values.expense, maxFlow),
        balanceX: chartPadding + (index * (chartWidth - chartPadding * 2)) / Math.max(1, months.length - 1),
        balanceY: chartPadding + ((maxFlow - Math.max(0, balance)) / maxFlow) * (chartHeight - chartPadding * 2),
      };
    });
  });

  readonly balancePoints = computed(() =>
    this.monthStats()
      .map((month) => `${round(month.balanceX)},${round(month.balanceY)}`)
      .join(' '),
  );
  readonly balanceAreaPoints = computed(() => {
    const stats = this.monthStats();
    if (stats.length === 0) {
      return '';
    }
    const baseline = chartHeight - chartPadding;
    return `${round(stats[0].balanceX)},${baseline} ${this.balancePoints()} ${round(stats.at(-1)?.balanceX ?? chartPadding)},${baseline}`;
  });

  readonly expenseCategories = computed<readonly CategoryStat[]>(() => categoryBreakdown(this.ledger.transactions(), 'expense', this.ledger));
  readonly incomeCategories = computed<readonly CategoryStat[]>(() => categoryBreakdown(this.ledger.transactions(), 'income', this.ledger));
  readonly weekdays = computed<readonly WeekdayStat[]>(() => {
    const labels = this.i18n.language() === 'EN' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const values = labels.map((label) => ({ label, amount: 0, count: 0, intensity: 0 }));

    for (const transaction of this.ledger.transactions()) {
      if (transaction.type !== 'expense') {
        continue;
      }
      const index = normalizeWeekday(new Date(`${transaction.date}T00:00:00`).getDay());
      values[index].amount += transaction.amount;
      values[index].count += 1;
    }

    const maxAmount = Math.max(1, ...values.map((value) => value.amount));
    return values.map((value) => ({ ...value, intensity: percentOf(value.amount, maxAmount) }));
  });

  readonly loanStats = computed<readonly LoanStat[]>(() => {
    const maxPayment = Math.max(1, ...this.ledger.loans().map((loan) => loan.monthlyPayment));
    return this.ledger.loans().map((loan) => {
      const paid = Math.max(0, loan.originalAmount - loan.remainingAmount);
      return {
        loan,
        paid,
        paidShare: loan.originalAmount > 0 ? percentOf(paid, loan.originalAmount) : 0,
        pressureShare: percentOf(loan.monthlyPayment, maxPayment),
      };
    });
  });

  readonly topExpenses = computed<readonly TopTransaction[]>(() =>
    [...this.ledger.transactions()]
      .filter((transaction) => transaction.type === 'expense')
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 6)
      .map((transaction) => {
        const category = this.ledger.categoryById(transaction.categoryId);
        return {
          transaction,
          categoryName: category.name,
          categoryColor: category.color,
        };
      }),
  );

  readonly insightSummary = computed(() => {
    const expenseLeader = this.expenseCategories()[0];
    const bestMonth = [...this.monthStats()]
      .filter((month) => month.income > 0 || month.expense > 0)
      .sort((first, second) => second.balance - first.balance)[0];
    const activeDays = this.activeDays();

    return [
      expenseLeader
        ? `${expenseLeader.name} ${this.i18n.t('stats.expenseLeader')} ${expenseLeader.share}% ${this.i18n.t('transactions.expense').toLowerCase()}.`
        : this.i18n.t('stats.expensesUncategorized'),
      bestMonth ? `${this.i18n.t('stats.bestMonth')}: ${bestMonth.label}, ${this.ledger.money(bestMonth.balance)}.` : '',
      `${activeDays} ${this.activeDaysLabel()} ${this.i18n.t('stats.activeDaysInsight')}`,
    ].filter(Boolean);
  });

  chartViewBox(): string {
    return `0 0 ${chartWidth} ${chartHeight}`;
  }

  money(value: number): string {
    return this.ledger.money(value);
  }

  percent(value: number): string {
    return `${Math.round(value)}%`;
  }

  signedMoney(value: number): string {
    return `${value >= 0 ? '+' : '-'}${this.ledger.money(Math.abs(value))}`;
  }
}

function sumByType(transactions: readonly LedgerTransaction[], type: TransactionType): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function categoryBreakdown(
  transactions: readonly LedgerTransaction[],
  type: TransactionType,
  ledger: LedgerFacade,
): readonly CategoryStat[] {
  const values = new Map<string, { amount: number; transactions: number }>();
  let total = 0;

  for (const transaction of transactions) {
    if (transaction.type !== type) {
      continue;
    }
    const current = values.get(transaction.categoryId) ?? { amount: 0, transactions: 0 };
    current.amount += transaction.amount;
    current.transactions += 1;
    total += transaction.amount;
    values.set(transaction.categoryId, current);
  }

  let offset = 0;
  return [...values.entries()]
    .sort(([, first], [, second]) => second.amount - first.amount)
    .map(([categoryId, value]) => {
      const category = ledger.categoryById(categoryId);
      const share = total > 0 ? (value.amount / total) * 100 : 0;
      const dash = (share / 100) * donutCircumference;
      const item = {
        id: category.id,
        name: category.name,
        color: category.color,
        amount: value.amount,
        share: Math.round(share),
        width: Math.max(4, share),
        dash: `${round(dash)} ${round(donutCircumference - dash)}`,
        offset: round(-offset),
        transactions: value.transactions,
      };
      offset += dash;
      return item;
    });
}

function recentMonths(count: number, locale: string): readonly { key: string; label: string }[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return {
      key: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`,
      label: formatter.format(date).replace('.', ''),
    };
  });
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

function daysBetween(start: string, end: string): number {
  if (!start) {
    return 1;
  }
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  return Math.max(1, Math.ceil((endTime - startTime) / 86_400_000) + 1);
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
}

function normalizeWeekday(day: number): number {
  return day === 0 ? 6 : day - 1;
}

function plural(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value);
  const last = absolute % 10;
  const lastTwo = absolute % 100;

  if (last === 1 && lastTwo !== 11) {
    return one;
  }

  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return few;
  }

  return many;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
