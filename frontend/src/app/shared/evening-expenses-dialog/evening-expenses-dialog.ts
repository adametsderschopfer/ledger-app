import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { Category, DailyExpenseDraft, Loan } from '../../core/models/ledger.models';

export interface EveningExpensesDialogData {
  categories: readonly Category[];
  loans: readonly Loan[];
}

type ExpenseRowForm = FormGroup<{
  categoryId: FormControl<string>;
  title: FormControl<string>;
  amount: FormControl<number>;
  loanId: FormControl<string>;
}>;

@Component({
  selector: 'app-evening-expenses-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './evening-expenses-dialog.html',
  styleUrl: './evening-expenses-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EveningExpensesDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<EveningExpensesDialog, readonly DailyExpenseDraft[]>,
  );
  readonly data = inject<EveningExpensesDialogData>(MAT_DIALOG_DATA);
  readonly i18n = inject(AppLanguageService);
  readonly hasNoCategories = this.data.categories.length === 0;
  readonly hasNoLoans = this.data.loans.length === 0;

  readonly form = this.fb.group({
    rows: this.fb.array<ExpenseRowForm>([this.createRow()]),
  });

  get rows(): FormArray<ExpenseRowForm> {
    return this.form.controls.rows;
  }

  addRow(): void {
    if (this.hasNoCategories) {
      return;
    }

    this.rows.push(this.createRow());
  }

  removeRow(index: number): void {
    if (this.rows.length === 1) {
      return;
    }

    this.rows.removeAt(index);
  }

  save(): void {
    this.rows.controls.forEach((row) => this.syncRowLoan(row));

    if (this.form.invalid || this.isMissingRequiredList()) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(
      this.rows.controls
        .map((row) => row.getRawValue())
        .filter((row) => row.amount > 0)
        .map((row) => ({
          categoryId: row.categoryId,
          title: row.title,
          amount: row.amount,
          loanId: this.categoryLinksToLoan(row.categoryId) ? row.loanId : undefined,
        })),
    );
  }

  rowLinksToLoan(row: ExpenseRowForm): boolean {
    return this.categoryLinksToLoan(row.controls.categoryId.value);
  }

  rowHasNoLoans(row: ExpenseRowForm): boolean {
    return this.rowLinksToLoan(row) && this.hasNoLoans;
  }

  isMissingRequiredList(): boolean {
    return this.hasNoCategories || this.rows.controls.some((row) => this.rowHasNoLoans(row));
  }

  syncRowLoan(row: ExpenseRowForm): void {
    const loanControl = row.controls.loanId;

    if (this.rowLinksToLoan(row)) {
      loanControl.addValidators(Validators.required);
      loanControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    loanControl.clearValidators();
    loanControl.setValue('', { emitEvent: false });
    loanControl.updateValueAndValidity({ emitEvent: false });
  }

  private createRow(): ExpenseRowForm {
    return this.fb.group({
      categoryId: [this.data.categories[0]?.id ?? '', Validators.required],
      title: [''],
      amount: [0, [Validators.required, Validators.min(1)]],
      loanId: [''],
    });
  }

  private categoryLinksToLoan(categoryId: string): boolean {
    return (
      this.data.categories.find((category) => category.id === categoryId)?.linksToLoan === true
    );
  }
}
