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
    await expect(
      firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'wrong' })),
    ).resolves.toBe(false);
    expect(repository.currentUser()).toBeNull();
  });

  it('should authorize an active user with a matching password', async () => {
    await expect(
      firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'admin' })),
    ).resolves.toBe(true);
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

    await expect(
      firstValueFrom(repository.login({ email: 'manager@ledger.local', password: '1234' })),
    ).resolves.toBe(true);
    expect(repository.currentUser()?.name).toBe('Менеджер');
  });

  it('should update current user profile fields', async () => {
    await firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'admin' }));

    await expect(
      firstValueFrom(
        repository.updateProfile({
          name: 'Владелец',
          email: 'owner@ledger.local',
          avatarUrl: 'data:image/png;base64,a',
        }),
      ),
    ).resolves.toBe(true);

    expect(repository.currentUser()).toMatchObject({
      name: 'Владелец',
      email: 'owner@ledger.local',
      avatarUrl: 'data:image/png;base64,a',
    });
  });

  it('should update current user password after checking the current password', async () => {
    await firstValueFrom(repository.login({ email: 'admin@ledger.local', password: 'admin' }));

    await expect(
      firstValueFrom(repository.updatePassword({ currentPassword: 'wrong', newPassword: '1234' })),
    ).resolves.toBe(false);
    await expect(
      firstValueFrom(repository.updatePassword({ currentPassword: 'admin', newPassword: '1234' })),
    ).resolves.toBe(true);

    repository.logout();
    await expect(
      firstValueFrom(repository.login({ email: 'admin@ledger.local', password: '1234' })),
    ).resolves.toBe(true);
  });

  it('should logout the current user when it is removed', async () => {
    repository.addUser({
      name: 'Менеджер',
      email: 'manager@ledger.local',
      password: '1234',
      role: 'user',
    });
    const userId =
      repository.users().find((user) => user.email === 'manager@ledger.local')?.id ?? '';
    await firstValueFrom(repository.login({ email: 'manager@ledger.local', password: '1234' }));
    repository.removeUser(userId);

    expect(repository.currentUser()).toBeNull();
  });

  it('should logout the current user when it is disabled', async () => {
    repository.addUser({
      name: 'Менеджер',
      email: 'manager@ledger.local',
      password: '1234',
      role: 'user',
    });
    const userId =
      repository.users().find((user) => user.email === 'manager@ledger.local')?.id ?? '';
    await firstValueFrom(repository.login({ email: 'manager@ledger.local', password: '1234' }));
    repository.toggleUser(userId);

    expect(repository.currentUser()).toBeNull();
  });
});
