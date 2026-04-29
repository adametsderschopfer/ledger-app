import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AppUser, UpdateProfile } from '../../core/auth/auth.models';
import { AppLanguageService } from '../../core/i18n/app-language.service';

@Component({
  selector: 'app-profile-dialog',
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
  ],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProfileDialog, UpdateProfile>);
  private readonly user = inject<AppUser>(MAT_DIALOG_DATA);
  readonly i18n = inject(AppLanguageService);

  readonly avatarPreview = signal(this.user.avatarUrl ?? '');
  readonly avatarInitial = computed(
    () => this.form.controls.name.value.trim().slice(0, 1).toUpperCase() || 'L',
  );

  readonly form = this.fb.group({
    name: [this.user.name, Validators.required],
    email: [this.user.email, [Validators.required, Validators.email]],
    avatarUrl: [this.user.avatarUrl ?? ''],
  });

  setAvatarFromUrl(): void {
    this.avatarPreview.set(this.form.controls.avatarUrl.value.trim());
  }

  removeAvatar(): void {
    this.form.controls.avatarUrl.setValue('');
    this.avatarPreview.set('');
  }

  selectAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.form.controls.avatarUrl.setValue(result);
      this.avatarPreview.set(result);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      name: value.name.trim(),
      email: value.email.trim(),
      avatarUrl: value.avatarUrl.trim(),
    });
  }
}
