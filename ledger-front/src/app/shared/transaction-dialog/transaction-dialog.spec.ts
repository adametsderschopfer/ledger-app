import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TransactionDialog, TransactionDialogData } from './transaction-dialog';

describe('TransactionDialog', () => {
  const data: TransactionDialogData = {
    mode: 'all',
    categories: [
      { id: 'salary', name: 'Зарплата', type: 'income', color: '#1a73e8' },
      { id: 'groceries', name: 'Продукты', type: 'expense', color: '#ea4335' },
      {
        id: 'credit-payments',
        name: 'Платежи по кредитам',
        type: 'expense',
        color: '#9334e6',
        linksToLoan: true,
      },
    ],
    loans: [{ id: 'car-loan', name: 'Автокредит', originalAmount: 100000, remainingAmount: 50000, monthlyPayment: 5000, dueDay: 10 }],
  };
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [TransactionDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
  });

  it('should not close when required fields are invalid', () => {
    const fixture = TestBed.createComponent(TransactionDialog);
    const component = fixture.componentInstance;

    component.form.controls.amount.setValue(0);
    component.save();

    expect(close).not.toHaveBeenCalled();
  });

  it('should close with a regular expense without loan id', () => {
    const fixture = TestBed.createComponent(TransactionDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      type: 'expense',
      categoryId: 'groceries',
      amount: 1200,
      title: 'Магазин',
      loanId: 'car-loan',
    });
    component.save();

    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        categoryId: 'groceries',
        title: 'Магазин',
        amount: 1200,
        loanId: undefined,
      }),
    );
  });

  it('should require a loan for loan-linked categories', () => {
    const fixture = TestBed.createComponent(TransactionDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      type: 'expense',
      categoryId: 'credit-payments',
      amount: 1200,
      loanId: '',
    });
    component.save();

    expect(close).not.toHaveBeenCalled();

    component.form.controls.loanId.setValue('car-loan');
    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ loanId: 'car-loan' }));
  });

  it('should switch category when operation type changes', () => {
    const fixture = TestBed.createComponent(TransactionDialog);
    const component = fixture.componentInstance;

    component.typeChanged('income');

    expect(component.form.controls.categoryId.value).toBe('salary');
  });
});
