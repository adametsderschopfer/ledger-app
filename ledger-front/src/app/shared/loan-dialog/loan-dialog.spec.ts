import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LoanDialog } from './loan-dialog';

describe('LoanDialog', () => {
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoanDialog],
      providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: { close } }],
    }).compileComponents();
  });

  it('should validate payment day and amounts', () => {
    const fixture = TestBed.createComponent(LoanDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Кредит',
      originalAmount: 0,
      monthlyPayment: 0,
      dueDay: 40,
    });
    component.save();

    expect(close).not.toHaveBeenCalled();
  });

  it('should close with loan payload when valid', () => {
    const fixture = TestBed.createComponent(LoanDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Кредит',
      originalAmount: 100000,
      monthlyPayment: 10000,
      dueDay: 15,
    });
    component.save();

    expect(close).toHaveBeenCalledWith({
      name: 'Кредит',
      originalAmount: 100000,
      monthlyPayment: 10000,
      dueDay: 15,
    });
  });
});
