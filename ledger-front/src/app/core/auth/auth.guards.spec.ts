import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { adminGuard, authenticatedGuard } from './auth.guards';
import { AuthFacade } from './auth.facade';

describe('auth guards', () => {
  function configure(auth: Partial<AuthFacade>): void {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthFacade, useValue: auth }],
    });
  }

  it('should allow authenticated users', () => {
    configure({ isAuthenticated: () => true } as Partial<AuthFacade>);

    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as never, []));

    expect(result).toBe(true);
  });

  it('should redirect anonymous users to login', () => {
    configure({ isAuthenticated: () => false } as Partial<AuthFacade>);

    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as never, []));

    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('should allow admin users into server routes', () => {
    configure({ isAdmin: () => true } as Partial<AuthFacade>);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, []));

    expect(result).toBe(true);
  });

  it('should redirect non-admin users to dashboard root', () => {
    configure({ isAdmin: () => false } as Partial<AuthFacade>);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, []));

    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});
