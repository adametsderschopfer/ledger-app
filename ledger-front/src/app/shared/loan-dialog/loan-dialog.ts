import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateLoan } from '../../core/models/ledger.models';

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
  private readonly dialogRef = inject(MatDialogRef<LoanDialog, CreateLoan>);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    originalAmount: [0, [Validators.required, Validators.min(1)]],
    monthlyPayment: [0, [Validators.required, Validators.min(1)]],
    dueDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
