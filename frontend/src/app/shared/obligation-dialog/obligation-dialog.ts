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
import { MatSelectModule } from '@angular/material/select';
import { AppLanguageService } from '../../core/i18n/app-language.service';
import { Category, CreateObligation, Obligation, UpdateObligation } from '../../core/models/ledger.models';

export interface ObligationDialogData {
  categories: readonly Category[];
  obligation?: Obligation;
}

@Component({
  selector: 'app-obligation-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './obligation-dialog.html',
  styleUrl: './obligation-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObligationDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ObligationDialog, CreateObligation | UpdateObligation>);
  readonly data = inject<ObligationDialogData>(MAT_DIALOG_DATA);
  readonly i18n = inject(AppLanguageService);
  readonly isEdit = this.data.obligation !== undefined;

  readonly form = this.fb.group({
    name: [this.data.obligation?.name ?? '', Validators.required],
    amount: [this.data.obligation?.amount ?? 0, [Validators.required, Validators.min(1)]],
    dueDay: [this.data.obligation?.dueDay ?? 1, [Validators.required, Validators.min(1), Validators.max(31)]],
    categoryId: [this.data.obligation?.categoryId ?? this.data.categories[0]?.id ?? '', Validators.required],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const obligation = this.form.getRawValue();
    this.dialogRef.close(this.data.obligation ? { ...obligation, id: this.data.obligation.id } : obligation);
  }
}
