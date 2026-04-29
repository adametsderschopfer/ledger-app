import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { LedgerFacade, TransactionDayGroup } from '../../core/ledger.facade';

@Component({
  selector: 'app-transaction-groups',
  imports: [MatIconModule],
  templateUrl: './transaction-groups.html',
  styleUrl: './transaction-groups.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionGroups {
  readonly groups = input.required<readonly TransactionDayGroup[]>();
  readonly emptyText = input('Операций пока нет.');
  readonly ledger = inject(LedgerFacade);
  readonly i18n = inject(AppLanguageService);

  dateLabel(date: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  }

  operationCount(count: number): string {
    return `${count} ${count === 1 ? 'операция' : 'операций'}`;
  }
}
