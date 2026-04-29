import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateCategory, TransactionType } from '../../core/models/ledger.models';

@Component({
  selector: 'app-category-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryDialog, CreateCategory>);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    type: this.fb.control<TransactionType>('expense', { validators: Validators.required }),
    color: ['#1a73e8', Validators.required],
    linksToLoan: [false],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const category = this.form.getRawValue();
    this.dialogRef.close({
      ...category,
      linksToLoan: category.type === 'expense' && category.linksToLoan,
    });
  }
}
