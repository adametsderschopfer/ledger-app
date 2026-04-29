import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatInputModule } from '@angular/material/input';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { CreateLoan, Loan, UpdateLoan } from '../../core/models/ledger.models';

@Component({
  selector: 'app-loan-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './loan-dialog.html',
  styleUrl: './loan-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<LoanDialog, CreateLoan | UpdateLoan>);
  private readonly data = inject<Loan | null>(MAT_DIALOG_DATA, { optional: true });
  readonly i18n = inject(AppLanguageService);
  readonly isEdit = this.data !== null;

  readonly form = this.fb.group({
    name: [this.data?.name ?? '', Validators.required],
    originalAmount: [this.data?.originalAmount ?? 0, [Validators.required, Validators.min(1)]],
    remainingAmount: [this.data?.remainingAmount ?? 0, [Validators.required, Validators.min(0)]],
    monthlyPayment: [this.data?.monthlyPayment ?? 0, [Validators.required, Validators.min(1)]],
    dueDay: [this.data?.dueDay ?? 1, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const loan = this.form.getRawValue();
    this.dialogRef.close(this.data ? { ...loan, id: this.data.id } : { ...loan, remainingAmount: undefined });
  }
}
