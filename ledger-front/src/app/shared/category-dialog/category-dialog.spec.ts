import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CategoryDialog } from './category-dialog';

describe('CategoryDialog', () => {
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [CategoryDialog],
      providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: { close } }],
    }).compileComponents();
  });

  it('should not close invalid category form', () => {
    const fixture = TestBed.createComponent(CategoryDialog);
    const component = fixture.componentInstance;

    component.save();

    expect(close).not.toHaveBeenCalled();
  });

  it('should only pass linksToLoan for expense categories', () => {
    const fixture = TestBed.createComponent(CategoryDialog);
    const component = fixture.componentInstance;

    component.form.patchValue({
      name: 'Бонусы',
      type: 'income',
      color: '#34a853',
      linksToLoan: true,
    });
    component.save();

    expect(close).toHaveBeenCalledWith({
      name: 'Бонусы',
      type: 'income',
      color: '#34a853',
      linksToLoan: false,
    });
  });
});
