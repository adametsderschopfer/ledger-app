import { firstValueFrom } from 'rxjs';
import { InMemoryAuthRepository } from './in-memory-auth.repository';

describe('InMemoryAuthRepository', () => {
  let repository: InMemoryAuthRepository;

  beforeEach(() => {
    sessionStorage.clear();
    repository = new InMemoryAuthRepository();
  });

  it('should start without an authorized user', () => {
    expect(repository.currentUser()).toBeNull();
  });

  it('should reject an invalid password', async () => {
    await expect(firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'wrong' }))).resolves.toBe(
      false,
    );
    expect(repository.currentUser()).toBeNull();
  });

  it('should authorize an active user with a matching password', async () => {
    await expect(firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'admin' }))).resolves.toBe(
      true,
    );
    expect(repository.currentUser()?.role).toBe('admin');
    expect(sessionStorage.getItem('ledger-current-user-id')).toBe('admin-user');
  });

  it('should create users with passwords and allow them to sign in', async () => {
    repository.addUser({
      name: 'Менеджер',
      email: 'manager@ledger.local',
      password: '1234',
      role: 'user',
    });

    await expect(firstValueFrom(repository.login({ email: 'manager@ledger.local', password: '1234' }))).resolves.toBe(
      true,
    );
    expect(repository.currentUser()?.name).toBe('Менеджер');
  });

  it('should logout the current user when it is removed', async () => {
    await firstValueFrom(repository.login({ email: 'user@ledger.local', password: 'user' }));
    repository.removeUser('regular-user');

    expect(repository.currentUser()).toBeNull();
  });

  it('should logout the current user when it is disabled', async () => {
    await firstValueFrom(repository.login({ email: 'user@ledger.local', password: 'user' }));
    repository.toggleUser('regular-user');

    expect(repository.currentUser()).toBeNull();
  });
});
