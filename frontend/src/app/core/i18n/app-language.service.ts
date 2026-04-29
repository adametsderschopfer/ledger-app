import { Injectable } from '@angular/core';

export type TranslationKey =
  | 'actions.addCategory'
  | 'actions.addIncome'
  | 'actions.addLoan'
  | 'actions.addTransaction'
  | 'actions.cancel'
  | 'actions.clear'
  | 'actions.delete'
  | 'actions.edit'
  | 'actions.more'
  | 'actions.pay'
  | 'actions.save'
  | 'app.financeWorkspace'
  | 'app.guest'
  | 'app.logout'
  | 'app.openNavigation'
  | 'auth.admin'
  | 'auth.login'
  | 'auth.loginError'
  | 'auth.mock'
  | 'auth.password'
  | 'auth.subtitle'
  | 'auth.user'
  | 'category.addTitle'
  | 'category.color'
  | 'category.expense'
  | 'category.income'
  | 'category.loanDescription'
  | 'category.loanLabel'
  | 'category.name'
  | 'category.type'
  | 'dashboard.balance'
  | 'dashboard.balanceHelp'
  | 'dashboard.categoryExpenses'
  | 'dashboard.currentMonth'
  | 'dashboard.emptyExpenses'
  | 'dashboard.incomeHelp'
  | 'dashboard.loans'
  | 'dashboard.loanDebt'
  | 'dashboard.loanDebtHelp'
  | 'dashboard.monthIncome'
  | 'dashboard.monthExpense'
  | 'dashboard.obligations'
  | 'dashboard.obligationsHelp'
  | 'dashboard.recent'
  | 'dashboard.summary'
  | 'dashboard.todayExpenses'
  | 'loan.addTitle'
  | 'loan.amount'
  | 'loan.confirmDelete'
  | 'loan.dueDay'
  | 'loan.editTitle'
  | 'loan.monthlyPayment'
  | 'loan.name'
  | 'loan.originalAmount'
  | 'loan.paid'
  | 'loan.paymentTitle'
  | 'loan.remaining'
  | 'loan.sectionEyebrow'
  | 'loan.title'
  | 'nav.dashboard'
  | 'nav.expenses'
  | 'nav.incomes'
  | 'nav.loans'
  | 'nav.server'
  | 'nav.settings'
  | 'nav.transactions'
  | 'settings.categories'
  | 'settings.expenseCategories'
  | 'settings.incomeCategories'
  | 'settings.preferences'
  | 'settings.subtitle'
  | 'settings.theme'
  | 'settings.themeHelp'
  | 'settings.title'
  | 'theme.dark'
  | 'theme.enableDark'
  | 'theme.enableLight'
  | 'theme.light'
  | 'transactions.allCategories'
  | 'transactions.allDone'
  | 'transactions.allTypes'
  | 'transactions.category'
  | 'transactions.date'
  | 'transactions.empty'
  | 'transactions.endDate'
  | 'transactions.expense'
  | 'transactions.expensesEmpty'
  | 'transactions.expensesEyebrow'
  | 'transactions.expensesTitle'
  | 'transactions.filters'
  | 'transactions.income'
  | 'transactions.incomesEmpty'
  | 'transactions.incomesEyebrow'
  | 'transactions.incomesTitle'
  | 'transactions.journal'
  | 'transactions.loadMore'
  | 'transactions.search'
  | 'transactions.shown'
  | 'transactions.startDate'
  | 'transactions.sum'
  | 'transactions.noCategories'
  | 'transactions.noCategoriesHint'
  | 'transactions.noLoans'
  | 'transactions.noLoansHint'
  | 'transactions.title'
  | 'transactions.transaction';

const translations: Record<TranslationKey, string> = {
  'actions.addCategory': 'Добавить категорию',
  'actions.addIncome': 'Добавить поступление',
  'actions.addLoan': 'Добавить кредит',
  'actions.addTransaction': 'Добавить операцию',
  'actions.cancel': 'Отмена',
  'actions.clear': 'Сбросить',
  'actions.delete': 'Удалить',
  'actions.edit': 'Редактировать',
  'actions.more': 'Дополнительные действия',
  'actions.pay': 'Записать платеж',
  'actions.save': 'Сохранить',
  'app.financeWorkspace': 'Учет финансов',
  'app.guest': 'Гость',
  'app.logout': 'Выйти',
  'app.openNavigation': 'Открыть навигацию',
  'auth.admin': 'Администратор',
  'auth.login': 'Войти',
  'auth.loginError': 'Пользователь не найден или пароль слишком короткий.',
  'auth.mock': 'Мок: admin@ledger.local / admin',
  'auth.password': 'Пароль',
  'auth.subtitle': 'Вход в учет финансов',
  'auth.user': 'Пользователь',
  'category.addTitle': 'Добавить категорию',
  'category.color': 'Цвет',
  'category.expense': 'Расход',
  'category.income': 'Поступление',
  'category.loanDescription':
    'Включайте только для категорий, которые должны уменьшать остаток выбранного кредита.',
  'category.loanLabel': 'Категория платежей по кредитам',
  'category.name': 'Название',
  'category.type': 'Тип',
  'dashboard.balance': 'Баланс',
  'dashboard.balanceHelp': 'Поступления минус расходы',
  'dashboard.categoryExpenses': 'Расходы по категориям',
  'dashboard.currentMonth': 'Текущий месяц',
  'dashboard.emptyExpenses': 'За этот месяц расходов пока нет.',
  'dashboard.incomeHelp': 'Поступления за месяц',
  'dashboard.loans': 'Кредиты',
  'dashboard.loanDebt': 'Остаток кредитов',
  'dashboard.loanDebtHelp': 'Обновляется из платежей',
  'dashboard.monthIncome': 'Поступления',
  'dashboard.monthExpense': 'Расходы',
  'dashboard.obligations': 'Обязательные платежи',
  'dashboard.obligationsHelp': 'Кредиты и регулярные списания',
  'dashboard.recent': 'Последние операции',
  'dashboard.summary': 'Финансовая сводка',
  'dashboard.todayExpenses': 'Расходы за сегодня',
  'loan.addTitle': 'Добавить кредит',
  'loan.amount': 'Сумма кредита',
  'loan.confirmDelete': 'Удалить этот кредит? История операций сохранится без привязки к кредиту.',
  'loan.dueDay': 'День платежа',
  'loan.editTitle': 'Редактировать кредит',
  'loan.monthlyPayment': 'Ежемесячный платеж',
  'loan.name': 'Кредит',
  'loan.originalAmount': 'Исходная сумма',
  'loan.paid': 'Погашено',
  'loan.paymentTitle': 'Платеж по кредиту',
  'loan.remaining': 'Остаток',
  'loan.sectionEyebrow': 'Кредитный контур',
  'loan.title': 'Кредиты',
  'nav.dashboard': 'Главная',
  'nav.expenses': 'Расходы',
  'nav.incomes': 'Поступления',
  'nav.loans': 'Кредиты',
  'nav.server': 'Сервер',
  'nav.settings': 'Настройки',
  'nav.transactions': 'Операции',
  'settings.categories': 'Категории и параметры учета',
  'settings.expenseCategories': 'Расходы',
  'settings.incomeCategories': 'Поступления',
  'settings.preferences': 'Внешний вид',
  'settings.subtitle': 'Настройки',
  'settings.theme': 'Темная тема',
  'settings.themeHelp': 'Цветовая схема применяется ко всему интерфейсу и сохраняется в браузере.',
  'settings.title': 'Настройки',
  'theme.dark': 'Темная тема',
  'theme.enableDark': 'Включить темную тему',
  'theme.enableLight': 'Включить светлую тему',
  'theme.light': 'Светлая тема',
  'transactions.allCategories': 'Все категории',
  'transactions.allDone': 'Показаны все операции.',
  'transactions.allTypes': 'Все типы',
  'transactions.category': 'Категория',
  'transactions.date': 'Дата',
  'transactions.empty': 'Операции по выбранным фильтрам не найдены.',
  'transactions.endDate': 'По дату',
  'transactions.expense': 'Расходы',
  'transactions.expensesEmpty': 'Расходов пока нет.',
  'transactions.expensesEyebrow': 'Списания',
  'transactions.expensesTitle': 'Расходы',
  'transactions.filters': 'Фильтры операций',
  'transactions.income': 'Поступления',
  'transactions.incomesEmpty': 'Поступлений пока нет.',
  'transactions.incomesEyebrow': 'Поступления',
  'transactions.incomesTitle': 'Поступления',
  'transactions.journal': 'Журнал',
  'transactions.loadMore': 'Показать еще',
  'transactions.search': 'Поиск',
  'transactions.shown': 'Показано',
  'transactions.startDate': 'С даты',
  'transactions.sum': 'Сумма',
  'transactions.noCategories': 'Нет доступных категорий',
  'transactions.noCategoriesHint': 'Список категорий пуст. Добавьте категорию в настройках.',
  'transactions.noLoans': 'Нет доступных кредитов',
  'transactions.noLoansHint': 'Список кредитов пуст. Добавьте кредит, чтобы выбрать его здесь.',
  'transactions.title': 'Все операции',
  'transactions.transaction': 'Операция',
};

@Injectable({ providedIn: 'root' })
export class AppLanguageService {
  locale(): string {
    return 'ru-RU';
  }

  t(key: TranslationKey): string {
    return translations[key];
  }
}
