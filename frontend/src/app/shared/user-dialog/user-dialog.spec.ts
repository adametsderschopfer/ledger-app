import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UserDialog } from './user-dialog';

describe('UserDialog', () => {
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [UserDialog],
      providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: { close } }],
    }).compileComponents();
  });

  it('should require password before closing', () => {
    const fixture = TestBed.createComponent(UserDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Новый пользователь',
      email: 'new@ledger.local',
      password: '',
      role: 'user',
    });
    component.save();

    expect(close).not.toHaveBeenCalled();
  });

  it('should close with a complete user payload', () => {
    const fixture = TestBed.createComponent(UserDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Новый пользователь',
      email: 'new@ledger.local',
      password: '1234',
      role: 'admin',
    });
    component.save();

    expect(close).toHaveBeenCalledWith({
      name: 'Новый пользователь',
      email: 'new@ledger.local',
      password: '1234',
      role: 'admin',
    });
  });
});
