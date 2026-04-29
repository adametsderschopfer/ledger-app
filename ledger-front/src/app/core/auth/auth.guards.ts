import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthFacade } from './auth.facade';

export const authenticatedGuard: CanMatchFn = () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  return auth.isAuthenticated() || router.createUrlTree(['/login']);
};

export const adminGuard: CanMatchFn = () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  return auth.isAdmin() || router.createUrlTree(['/']);
};
