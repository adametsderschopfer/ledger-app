import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class AppThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'ledger-theme';
  private readonly themeState = signal<AppTheme>(this.restoreTheme());

  readonly theme = this.themeState.asReadonly();
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      const root = this.document.documentElement;

      root.classList.toggle('dark-theme', theme === 'dark');
      root.style.colorScheme = theme;
      this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
    });
  }

  setTheme(theme: AppTheme): void {
    this.themeState.set(theme);
  }

  toggle(): void {
    this.themeState.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private restoreTheme(): AppTheme {
    const storedTheme = this.document.defaultView?.localStorage.getItem(this.storageKey);
    return storedTheme === 'dark' ? 'dark' : 'light';
  }
}
