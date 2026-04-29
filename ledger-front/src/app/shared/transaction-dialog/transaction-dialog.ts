import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { startWith } from 'rxjs';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { Category, CreateTransaction, Loan, TransactionType } from '../../core/models/ledger.models';
import { toInputDate } from '../../core/ledger.facade';

export interface TransactionDialogData {
  mode: 'all' | TransactionType;
  categories: readonly Category[];
  loans: readonly Loan[];
}

type TransactionForm = FormGroup<{
  type: FormControl<TransactionType>;
  date: FormControl<string>;
  categoryId: FormControl<string>;
  title: FormControl<string>;
  amount: FormControl<number>;
  loanId: FormControl<string>;
}>;

@Component({
  selector: 'app-transaction-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './transaction-dialog.html',
  styleUrl: './transaction-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TransactionDialog, CreateTransaction>);
  readonly i18n = inject(AppLanguageService);
  readonly data = inject<TransactionDialogData>(MAT_DIALOG_DATA);

  readonly form: TransactionForm = this.fb.group({
    type: this.fb.control<TransactionType>(this.data.mode === 'income' ? 'income' : 'expense', {
      validators: Validators.required,
    }),
    date: this.fb.control(toInputDate(new Date()), { validators: Validators.required }),
    categoryId: this.fb.control(this.firstCategoryId(this.data.mode === 'income' ? 'income' : 'expense'), {
      validators: Validators.required,
    }),
    title: this.fb.control(''),
    amount: this.fb.control(0, { validators: [Validators.required, Validators.min(1)] }),
    loanId: this.fb.control(''),
  });

  private readonly selectedType = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { initialValue: this.form.controls.type.value },
  );
  private readonly selectedCategoryId = toSignal(
    this.form.controls.categoryId.valueChanges.pipe(startWith(this.form.controls.categoryId.value)),
    { initialValue: this.form.controls.categoryId.value },
  );

  readonly canSelectType = this.data.mode === 'all';
  readonly availableCategories = computed(() =>
    this.data.categories.filter((category) => category.type === this.selectedType()),
  );
  readonly linksToLoan = computed(() => this.categoryLinksToLoan(this.selectedCategoryId()));
  readonly dateValue = computed(() => parseInputDate(this.form.controls.date.value));

  typeChanged(type: TransactionType): void {
    this.form.controls.categoryId.setValue(this.firstCategoryId(type));
    this.syncLoanControl();
  }

  syncLoanControl(): void {
    const loanControl = this.form.controls.loanId;

    if (this.linksToLoan()) {
      loanControl.addValidators(Validators.required);
      loanControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    loanControl.clearValidators();
    loanControl.setValue('', { emitEvent: false });
    loanControl.updateValueAndValidity({ emitEvent: false });
  }

  setDate(event: MatDatepickerInputEvent<Date>): void {
    this.form.controls.date.setValue(event.value ? toInputDate(event.value) : '');
  }

  save(): void {
    this.syncLoanControl();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const category = this.data.categories.find((item) => item.id === value.categoryId);

    this.dialogRef.close({
      type: value.type,
      date: value.date,
      categoryId: value.categoryId,
      title: value.title || category?.name || this.i18n.t('transactions.transaction'),
      amount: value.amount,
      loanId: this.categoryLinksToLoan(value.categoryId) ? value.loanId : undefined,
    });
  }

  private firstCategoryId(type: TransactionType): string {
    return this.data.categories.find((category) => category.type === type)?.id ?? '';
  }

  private categoryLinksToLoan(categoryId: string): boolean {
    return this.data.categories.find((category) => category.id === categoryId)?.linksToLoan === true;
  }
}

function parseInputDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
