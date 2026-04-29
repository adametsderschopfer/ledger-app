export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  isSystem?: boolean;
  linksToLoan?: boolean;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  date: string;
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}

export interface Loan {
  id: string;
  name: string;
  originalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  dueDay: number;
}

export interface CreateTransaction {
  type: TransactionType;
  date: string;
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}

export interface CreateLoan {
  name: string;
  originalAmount: number;
  remainingAmount?: number;
  monthlyPayment: number;
  dueDay: number;
}

export interface UpdateLoan extends CreateLoan {
  id: string;
}

export interface CreateCategory {
  name: string;
  type: TransactionType;
  color: string;
  linksToLoan?: boolean;
}

export interface DailyExpenseDraft {
  categoryId: string;
  title: string;
  amount: number;
  loanId?: string;
}
