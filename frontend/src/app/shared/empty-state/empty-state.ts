import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <section class="empty-state" aria-live="polite">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <div>
        <strong>{{ title() }}</strong>
        <p>{{ text() }}</p>
      </div>
    </section>
  `,
  styles: `
    .empty-state {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 112px;
      padding: 20px;
      color: var(--ledger-muted);
      background: var(--mat-sys-surface);
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: 8px;
    }

    mat-icon {
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
      color: var(--mat-sys-primary);
      font-size: 32px;
    }

    strong {
      display: block;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface);
      font-weight: 500;
    }

    p {
      margin: 0;
    }

    @media (max-width: 640px) {
      .empty-state {
        align-items: flex-start;
        min-height: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}
