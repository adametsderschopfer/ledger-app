import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
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
}
