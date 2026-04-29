import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthFacade } from './core/auth/auth.facade';
import { AppLanguageService } from './core/i18n/app-language.service';
import { LedgerFacade } from './core/ledger.facade';
import { AppThemeService } from './core/theme/app-theme.service';

interface NavigationItem {
  labelKey:
    | 'nav.dashboard'
    | 'nav.transactions'
    | 'nav.incomes'
    | 'nav.expenses'
    | 'nav.loans'
    | 'nav.settings'
    | 'nav.server';
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
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly auth = inject(AuthFacade);
  readonly i18n = inject(AppLanguageService);
  readonly ledger = inject(LedgerFacade);
  readonly theme = inject(AppThemeService);
  readonly mobileNavOpen = signal(false);
  readonly routeLoading = signal(false);
  private routeLoadingTimer: ReturnType<typeof setTimeout> | undefined;

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
      { labelKey: 'nav.dashboard', icon: 'dashboard', route: '/dashboard' },
      { labelKey: 'nav.transactions', icon: 'receipt_long', route: '/transactions' },
      { labelKey: 'nav.incomes', icon: 'south_west', route: '/incomes' },
      { labelKey: 'nav.expenses', icon: 'north_east', route: '/expenses' },
      { labelKey: 'nav.loans', icon: 'account_balance', route: '/loans' },
      { labelKey: 'nav.settings', icon: 'settings', route: '/settings' },
      { labelKey: 'nav.server', icon: 'admin_panel_settings', route: '/server', adminOnly: true },
    ];

    return items.filter((item) => !item.adminOnly || this.auth.isAdmin());
  });

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        return;
      }

      this.ledger.load();
      if (this.auth.isAdmin()) {
        this.auth.loadUsers();
      }
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.clearRouteLoadingTimer();
        this.routeLoadingTimer = setTimeout(() => this.routeLoading.set(true), 160);
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.clearRouteLoadingTimer();
        this.routeLoading.set(false);
      }
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

  private clearRouteLoadingTimer(): void {
    if (this.routeLoadingTimer) {
      clearTimeout(this.routeLoadingTimer);
      this.routeLoadingTimer = undefined;
    }
  }
}
