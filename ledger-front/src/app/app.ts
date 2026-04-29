import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthFacade } from './core/auth/auth.facade';
import { LedgerFacade } from './core/ledger.facade';
import { EveningExpensesDialog } from './shared/evening-expenses-dialog/evening-expenses-dialog';
import { AppThemeService } from './core/theme/app-theme.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly auth = inject(AuthFacade);
  readonly ledger = inject(LedgerFacade);
  readonly theme = inject(AppThemeService);
  readonly mobileNavOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly isHandset = toSignal(
    this.breakpointObserver.observe('(max-width: 840px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  readonly isLoginPage = computed(() => this.currentUrl().startsWith('/login'));
  readonly showShell = computed(() => !this.isLoginPage() && this.auth.isAuthenticated());
  readonly navItems = computed<readonly NavigationItem[]>(() => {
    const items: readonly NavigationItem[] = [
      { label: 'Главная', icon: 'dashboard', route: '/dashboard' },
      { label: 'Операции', icon: 'receipt_long', route: '/transactions' },
      { label: 'Доходы', icon: 'south_west', route: '/incomes' },
      { label: 'Расходы', icon: 'north_east', route: '/expenses' },
      { label: 'Кредиты', icon: 'account_balance', route: '/loans' },
      { label: 'Настройки', icon: 'settings', route: '/settings' },
      { label: 'Сервер', icon: 'admin_panel_settings', route: '/server', adminOnly: true },
    ];

    return items.filter((item) => !item.adminOnly || this.auth.isAdmin());
  });

  constructor() {
    afterNextRender(() => {
      window.setTimeout(() => this.openEveningDialogIfNeeded(), 400);
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((opened) => !opened);
  }

  closeNavIfHandset(): void {
    if (this.isHandset()) {
      this.mobileNavOpen.set(false);
    }
  }

  private openEveningDialogIfNeeded(): void {
    const now = new Date();
    const key = `ledger-evening-expenses-${now.toISOString().slice(0, 10)}`;

    if (now.getHours() < 18 || sessionStorage.getItem(key) || this.isLoginPage() || !this.auth.isAuthenticated()) {
      return;
    }

    sessionStorage.setItem(key, 'shown');
    const dialogRef = this.dialog.open(EveningExpensesDialog, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        categories: this.ledger.expenseCategories(),
        loans: this.ledger.loans(),
      },
    });

    dialogRef.afterClosed().subscribe((expenses) => {
      if (expenses?.length) {
        this.ledger.addDailyExpenses(expenses);
      }
    });
  }
}
