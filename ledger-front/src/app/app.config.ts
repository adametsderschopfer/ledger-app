import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter } from '@angular/router';

import { AuthRepository } from './core/auth/auth.repository';
import { HttpAuthRepository } from './core/auth/http-auth.repository';
import { HttpLedgerRepository } from './core/repositories/http-ledger.repository';
import { LedgerRepository } from './core/repositories/ledger.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'ru-RU' },
    provideRouter(routes),
    { provide: LedgerRepository, useClass: HttpLedgerRepository },
    { provide: AuthRepository, useClass: HttpAuthRepository },
  ]
};
