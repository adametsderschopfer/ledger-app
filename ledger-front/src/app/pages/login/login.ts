import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { AppLanguageService } from '../../core/i18n/app-language.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  readonly i18n = inject(AppLanguageService);
  readonly loginFailed = signal(false);
  readonly loginPending = signal(false);

  readonly form = this.fb.group({
    email: ['admin@ledger.local', [Validators.required, Validators.email]],
    password: ['admin', [Validators.required, Validators.minLength(4)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginPending.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loginPending.set(false)))
      .subscribe((success) => {
        this.loginFailed.set(!success);

        if (success) {
          void this.router.navigateByUrl('/');
        }
      });
  }
}
