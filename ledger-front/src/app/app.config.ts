import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { AuthRepository } from './core/auth/auth.repository';
import { InMemoryAuthRepository } from './core/auth/in-memory-auth.repository';
import { InMemoryLedgerRepository } from './core/repositories/in-memory-ledger.repository';
import { LedgerRepository } from './core/repositories/ledger.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideRouter(routes),
    { provide: LedgerRepository, useClass: InMemoryLedgerRepository },
    { provide: AuthRepository, useClass: InMemoryAuthRepository },
  ]
};
