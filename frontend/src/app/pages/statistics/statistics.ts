import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade } from '../../core/ledger.facade';
import { LedgerTransaction, Loan } from '../../core/models/ledger.models';
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

  readonly summary = this.ledger.statisticsSummary;
  readonly hasTransactions = computed(() => (this.summary()?.totalIncome ?? 0) > 0 || (this.summary()?.totalExpense ?? 0) > 0);
  readonly totalIncome = computed(() => this.summary()?.totalIncome ?? 0);
  readonly totalExpense = computed(() => this.summary()?.totalExpense ?? 0);
  readonly netBalance = computed(() => this.summary()?.netBalance ?? 0);
  readonly savingsRate = computed(() => this.summary()?.savingsRate ?? 0);
  readonly firstTransactionDate = computed(() => this.summary()?.firstTransactionDate ?? '');
  readonly activeDays = computed(() => this.summary()?.activeDays ?? 0);
  readonly activeDaysLabel = computed(() =>
    this.i18n.language() === 'EN'
      ? `${this.activeDays() === 1 ? 'active day' : 'active days'}`
      : plural(this.activeDays(), 'активный день', 'активных дня', 'активных дней'),
  );
  readonly averageDailyExpense = computed(() => this.summary()?.averageDailyExpense ?? 0);
  readonly averageTransaction = computed(() => this.summary()?.averageTransaction ?? 0);
  readonly monthlyDebtPressure = computed(() => this.summary()?.monthlyDebtPressure ?? 0);
  readonly loanPayoffShare = computed(() => this.summary()?.loanPayoffShare ?? 0);

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
    const labels = monthLabels(this.summary()?.monthStats ?? [], this.i18n.locale());

    const maxFlow = Math.max(
      1,
      ...labels.flatMap((month) => [month.income, month.expense, Math.abs(month.balance)]),
    );

    return labels.map((month, index) => {
      return {
        key: month.key,
        label: month.label,
        income: month.income,
        expense: month.expense,
        balance: month.balance,
        incomeHeight: percentOf(month.income, maxFlow),
        expenseHeight: percentOf(month.expense, maxFlow),
        balanceX: chartPadding + (index * (chartWidth - chartPadding * 2)) / Math.max(1, labels.length - 1),
        balanceY: chartPadding + ((maxFlow - Math.max(0, month.balance)) / maxFlow) * (chartHeight - chartPadding * 2),
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

  readonly expenseCategories = computed<readonly CategoryStat[]>(() =>
    categoryStats(this.summary()?.expenseCategories ?? []),
  );
  readonly incomeCategories = computed<readonly CategoryStat[]>(() =>
    categoryStats(this.summary()?.incomeCategories ?? []),
  );
  readonly weekdays = computed<readonly WeekdayStat[]>(() => {
    const labels = this.i18n.language() === 'EN' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const values = labels.map((label, weekday) => {
      const item = this.summary()?.weekdays.find((value) => value.weekday === weekday);
      return { label, amount: item?.amount ?? 0, count: item?.count ?? 0, intensity: 0 };
    });

    const maxAmount = Math.max(1, ...values.map((value) => value.amount));
    return values.map((value) => ({ ...value, intensity: percentOf(value.amount, maxAmount) }));
  });

  readonly loanStats = computed<readonly LoanStat[]>(() => this.summary()?.loanStats ?? []);

  readonly topExpenses = computed<readonly TopTransaction[]>(() => this.summary()?.topExpenses ?? []);

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

  constructor() {
    this.ledger.refreshStatisticsSummary();
  }

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

function categoryStats(
  values: readonly { category: { id: string; name: string; color: string }; amount: number; share: number; transactions: number }[],
): readonly CategoryStat[] {
  let offset = 0;
  return values
    .map((value) => {
      const share = value.share;
      const dash = (share / 100) * donutCircumference;
      const item = {
        id: value.category.id,
        name: value.category.name,
        color: value.category.color,
        amount: value.amount,
        share,
        width: Math.max(4, share),
        dash: `${round(dash)} ${round(donutCircumference - dash)}`,
        offset: round(-offset),
        transactions: value.transactions,
      };
      offset += dash;
      return item;
    });
}

function monthLabels(
  months: readonly { key: string; income: number; expense: number; balance: number }[],
  locale: string,
) {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  return months.map((month) => {
    const [year, monthNumber] = month.key.split('-').map(Number);
    return { ...month, label: formatter.format(new Date(year, monthNumber - 1, 1)).replace('.', '') };
  });
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
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
