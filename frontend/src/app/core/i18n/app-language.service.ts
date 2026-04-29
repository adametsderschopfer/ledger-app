import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

export type AppLanguage = 'RU' | 'EN';

interface AppConfig {
  language: AppLanguage;
  supportedLanguages: readonly AppLanguage[];
}

export type TranslationKey =
  | 'actions.addCategory'
  | 'actions.addExpense'
  | 'actions.addIncome'
  | 'actions.addLoan'
  | 'actions.addObligation'
  | 'actions.addTransaction'
  | 'actions.cancel'
  | 'actions.clear'
  | 'actions.delete'
  | 'actions.deleteExpenseRow'
  | 'actions.edit'
  | 'actions.more'
  | 'actions.pay'
  | 'actions.save'
  | 'actions.addRow'
  | 'actions.addUser'
  | 'actions.later'
  | 'app.financeWorkspace'
  | 'app.guest'
  | 'app.loading'
  | 'app.logout'
  | 'app.openNavigation'
  | 'auth.admin'
  | 'auth.login'
  | 'auth.loginError'
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
  | 'category.unknown'
  | 'dashboard.balance'
  | 'dashboard.balanceHelp'
  | 'dashboard.categoryExpenses'
  | 'dashboard.categoryLabel'
  | 'dashboard.emptyExpenses'
  | 'dashboard.incomeHelp'
  | 'dashboard.loans'
  | 'dashboard.emptyData'
  | 'dashboard.emptyHistory'
  | 'dashboard.emptyHistoryText'
  | 'dashboard.emptyLoans'
  | 'dashboard.emptyLoansText'
  | 'dashboard.emptyObligations'
  | 'dashboard.emptyObligationsText'
  | 'dashboard.duePrefix'
  | 'dashboard.entryLabel'
  | 'dashboard.activeLabel'
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
  | 'loan.title'
  | 'obligation.addTitle'
  | 'obligation.amount'
  | 'obligation.confirmDelete'
  | 'obligation.dueDay'
  | 'obligation.editTitle'
  | 'obligation.name'
  | 'obligation.paymentTitle'
  | 'obligation.recordExpense'
  | 'nav.dashboard'
  | 'nav.expenses'
  | 'nav.incomes'
  | 'nav.loans'
  | 'nav.server'
  | 'nav.settings'
  | 'nav.statistics'
  | 'nav.transactions'
  | 'notification.loadFailed'
  | 'notification.loginSuccess'
  | 'notification.saveFailed'
  | 'settings.categories'
  | 'settings.expenseCategories'
  | 'settings.incomeCategories'
  | 'settings.preferences'
  | 'settings.server'
  | 'settings.serverHelp'
  | 'settings.language'
  | 'settings.theme'
  | 'settings.themeHelp'
  | 'settings.title'
  | 'settings.user'
  | 'settings.userHelp'
  | 'settings.profile'
  | 'settings.profileHelp'
  | 'profile.avatar'
  | 'profile.avatarUrl'
  | 'profile.changePassword'
  | 'profile.confirmPassword'
  | 'profile.currentPassword'
  | 'profile.edit'
  | 'profile.editTitle'
  | 'profile.newPassword'
  | 'profile.passwordMismatch'
  | 'profile.passwordTitle'
  | 'profile.passwordUpdateFailed'
  | 'profile.removeAvatar'
  | 'profile.updateFailed'
  | 'profile.uploadAvatar'
  | 'server.access'
  | 'server.actions'
  | 'server.active'
  | 'server.deleteUser'
  | 'server.disabled'
  | 'server.email'
  | 'server.empty'
  | 'server.name'
  | 'server.role'
  | 'server.title'
  | 'stats.title'
  | 'stats.openJournal'
  | 'stats.loading'
  | 'stats.emptyTitle'
  | 'stats.emptyText'
  | 'stats.kpis'
  | 'stats.periodHelper'
  | 'stats.averageDay'
  | 'stats.netResult'
  | 'stats.savingsHelper'
  | 'stats.loanPressure'
  | 'stats.loanPayoffHelper'
  | 'stats.trendTitle'
  | 'stats.trendSubtitle'
  | 'stats.trendAria'
  | 'stats.categoryShare'
  | 'stats.expenseDonutAria'
  | 'stats.operationsShort'
  | 'stats.incomeSources'
  | 'stats.weekdayTitle'
  | 'stats.weekdaySubtitle'
  | 'stats.loanPortfolio'
  | 'stats.loanPortfolioSubtitle'
  | 'stats.loanRemaining'
  | 'stats.loanPaid'
  | 'stats.perMonth'
  | 'stats.topExpenses'
  | 'stats.topExpensesSubtitle'
  | 'stats.insights'
  | 'stats.insightsSubtitle'
  | 'stats.expensesUncategorized'
  | 'stats.expenseLeader'
  | 'stats.bestMonth'
  | 'stats.activeDaysInsight'
  | 'validation.minPassword'
  | 'theme.dark'
  | 'theme.enableDark'
  | 'theme.enableLight'
  | 'theme.light'
  | 'transactions.allCategories'
  | 'transactions.allDone'
  | 'transactions.allHistory'
  | 'transactions.allTypes'
  | 'transactions.activeFilters'
  | 'transactions.category'
  | 'transactions.date'
  | 'transactions.empty'
  | 'transactions.endDate'
  | 'transactions.expense'
  | 'transactions.expensesEmpty'
  | 'transactions.expensesTitle'
  | 'transactions.filters'
  | 'transactions.income'
  | 'transactions.incomesEmpty'
  | 'transactions.incomesTitle'
  | 'transactions.loadMore'
  | 'transactions.search'
  | 'transactions.shown'
  | 'transactions.startDate'
  | 'transactions.sum'
  | 'transactions.noCategories'
  | 'transactions.noCategoriesHint'
  | 'transactions.noLoans'
  | 'transactions.noLoansHint'
  | 'transactions.noCreditSelected'
  | 'transactions.description'
  | 'transactions.exampleDescription'
  | 'transactions.title'
  | 'transactions.transaction'
  | 'empty.title'
  | 'language.en'
  | 'language.ru';

const translationsRu: Record<TranslationKey, string> = {
  'actions.addCategory': 'Добавить категорию',
  'actions.addExpense': 'Добавить расход',
  'actions.addIncome': 'Добавить доход',
  'actions.addLoan': 'Добавить кредит',
  'actions.addObligation': 'Добавить платеж',
  'actions.addTransaction': 'Добавить операцию',
  'actions.addRow': 'Добавить строку',
  'actions.addUser': 'Добавить пользователя',
  'actions.cancel': 'Отмена',
  'actions.clear': 'Сбросить',
  'actions.delete': 'Удалить',
  'actions.deleteExpenseRow': 'Удалить строку расхода',
  'actions.edit': 'Редактировать',
  'actions.later': 'Позже',
  'actions.more': 'Дополнительные действия',
  'actions.pay': 'Записать платеж',
  'actions.save': 'Сохранить',
  'app.financeWorkspace': 'Учет финансов',
  'app.guest': 'Гость',
  'app.loading': 'Загрузка',
  'app.logout': 'Выйти',
  'app.openNavigation': 'Открыть навигацию',
  'auth.admin': 'Администратор',
  'auth.login': 'Войти',
  'auth.loginError': 'Пользователь не найден или пароль слишком короткий.',
  'auth.password': 'Пароль',
  'auth.subtitle': 'Вход в учет финансов',
  'auth.user': 'Пользователь',
  'category.addTitle': 'Добавить категорию',
  'category.color': 'Цвет',
  'category.expense': 'Расход',
  'category.income': 'Доход',
  'category.loanDescription':
    'Включайте только для категорий, которые должны уменьшать остаток выбранного кредита.',
  'category.loanLabel': 'Категория платежей по кредитам',
  'category.name': 'Название',
  'category.type': 'Тип',
  'category.unknown': 'Без категории',
  'dashboard.balance': 'Баланс',
  'dashboard.balanceHelp': 'Доходы минус расходы',
  'dashboard.categoryExpenses': 'Расходы по категориям',
  'dashboard.categoryLabel': 'категория',
  'dashboard.emptyExpenses': 'За этот месяц расходов пока нет.',
  'dashboard.incomeHelp': 'Доходы за месяц',
  'dashboard.loans': 'Кредиты',
  'dashboard.emptyData': 'Данных пока нет',
  'dashboard.emptyHistory': 'История операций пуста',
  'dashboard.emptyHistoryText': 'Создайте первую операцию, чтобы увидеть ее в сводке.',
  'dashboard.emptyLoans': 'Кредитов пока нет',
  'dashboard.emptyLoansText': 'Добавленные кредиты появятся здесь с остатком и днем платежа.',
  'dashboard.emptyObligations': 'Платежей пока нет',
  'dashboard.emptyObligationsText':
    'Добавьте кредит или регулярный платеж, чтобы видеть ближайшие обязательства здесь.',
  'dashboard.duePrefix': 'До',
  'dashboard.entryLabel': 'запись',
  'dashboard.activeLabel': 'активный',
  'dashboard.loanDebt': 'Остаток кредитов',
  'dashboard.loanDebtHelp': 'Обновляется из платежей',
  'dashboard.monthIncome': 'Доходы',
  'dashboard.monthExpense': 'Расходы',
  'dashboard.obligations': 'Обязательные платежи',
  'dashboard.obligationsHelp': 'Кредиты и регулярные списания',
  'dashboard.recent': 'Последние записи',
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
  'loan.title': 'Кредиты',
  'obligation.addTitle': 'Добавить обязательный платеж',
  'obligation.amount': 'Сумма платежа',
  'obligation.confirmDelete': 'Удалить этот обязательный платеж?',
  'obligation.dueDay': 'День списания',
  'obligation.editTitle': 'Редактировать обязательный платеж',
  'obligation.name': 'Платеж',
  'obligation.paymentTitle': 'Обязательный платеж',
  'obligation.recordExpense': 'Записать в расходы',
  'nav.dashboard': 'Главная',
  'nav.expenses': 'Расходы',
  'nav.incomes': 'Доходы',
  'nav.loans': 'Кредиты',
  'nav.server': 'Сервер',
  'nav.settings': 'Настройки',
  'nav.statistics': 'Статистика',
  'nav.transactions': 'История операций',
  'notification.loadFailed': 'Не удалось загрузить часть данных. Остальные разделы продолжат работать.',
  'notification.loginSuccess': 'Вы вошли в Ledger.',
  'notification.saveFailed': 'Не удалось сохранить изменения.',
  'settings.categories': 'Категории и параметры учета',
  'settings.expenseCategories': 'Расходы',
  'settings.incomeCategories': 'Доходы',
  'settings.preferences': 'Внешний вид',
  'settings.server': 'Управление сервером',
  'settings.serverHelp': 'Пользователи, роли и доступы доступны администраторам.',
  'settings.language': 'Язык интерфейса',
  'settings.theme': 'Темная тема',
  'settings.themeHelp': 'Цветовая схема применяется ко всему интерфейсу и сохраняется в браузере.',
  'settings.title': 'Настройки',
  'settings.user': 'Пользовательские настройки',
  'settings.userHelp': 'Профиль текущей сессии и локальные параметры интерфейса.',
  'settings.profile': 'Профиль',
  'settings.profileHelp': 'Данные текущей учетной записи.',
  'profile.avatar': 'Аватар',
  'profile.avatarUrl': 'Ссылка на аватар',
  'profile.changePassword': 'Сменить пароль',
  'profile.confirmPassword': 'Повторите пароль',
  'profile.currentPassword': 'Текущий пароль',
  'profile.edit': 'Редактировать профиль',
  'profile.editTitle': 'Редактировать профиль',
  'profile.newPassword': 'Новый пароль',
  'profile.passwordMismatch': 'Пароли не совпадают',
  'profile.passwordTitle': 'Смена пароля',
  'profile.passwordUpdateFailed': 'Не удалось обновить пароль.',
  'profile.removeAvatar': 'Удалить',
  'profile.updateFailed': 'Не удалось обновить профиль.',
  'profile.uploadAvatar': 'Загрузить',
  'server.access': 'Доступ',
  'server.actions': 'Действия',
  'server.active': 'Активен',
  'server.deleteUser': 'Удалить пользователя',
  'server.disabled': 'Отключен',
  'server.email': 'Email',
  'server.empty': 'Добавленные пользователи и их роли будут отображаться здесь.',
  'server.name': 'Имя',
  'server.role': 'Роль',
  'server.title': 'Пользователи и роли',
  'stats.title': 'Статистика финансов',
  'stats.openJournal': 'Открыть журнал',
  'stats.loading': 'Загрузка статистики',
  'stats.emptyTitle': 'Статистика появится после первых операций',
  'stats.emptyText':
    'Добавьте доходы и расходы, чтобы увидеть динамику, категории, кредитную нагрузку и ежедневные паттерны.',
  'stats.kpis': 'Ключевые показатели',
  'stats.periodHelper': 'За весь период учета',
  'stats.averageDay': 'в среднем в день',
  'stats.netResult': 'Чистый результат',
  'stats.savingsHelper': 'от доходов остается',
  'stats.loanPressure': 'Кредитная нагрузка',
  'stats.loanPayoffHelper': 'кредитов погашено',
  'stats.trendTitle': 'Динамика за 12 месяцев',
  'stats.trendSubtitle': 'Доходы, расходы и чистый результат по месяцам',
  'stats.trendAria': 'Линейный график баланса и столбцы доходов и расходов за 12 месяцев',
  'stats.categoryShare': 'Доля категорий за весь период',
  'stats.expenseDonutAria': 'Кольцевая диаграмма расходов по категориям',
  'stats.operationsShort': 'опер.',
  'stats.incomeSources': 'Источники дохода и их вклад',
  'stats.weekdayTitle': 'Интенсивность расходов по дням недели',
  'stats.weekdaySubtitle': 'Где чаще всего появляются траты',
  'stats.loanPortfolio': 'Кредитный портфель',
  'stats.loanPortfolioSubtitle': 'Остаток, погашение и месячная нагрузка',
  'stats.loanRemaining': 'осталось из',
  'stats.loanPaid': 'погашено',
  'stats.perMonth': 'мес.',
  'stats.topExpenses': 'Крупнейшие расходы',
  'stats.topExpensesSubtitle': 'Операции, которые сильнее всего влияют на бюджет',
  'stats.insights': 'Наблюдения',
  'stats.insightsSubtitle': 'Короткая выжимка по текущим данным',
  'stats.expensesUncategorized': 'Расходы еще не распределены по категориям.',
  'stats.expenseLeader': 'занимает',
  'stats.bestMonth': 'Лучший месяц по балансу',
  'stats.activeDaysInsight': 'в журнале операций.',
  'validation.minPassword': 'Минимум 4 символа',
  'theme.dark': 'Темная тема',
  'theme.enableDark': 'Включить темную тему',
  'theme.enableLight': 'Включить светлую тему',
  'theme.light': 'Светлая тема',
  'transactions.allCategories': 'Все категории',
  'transactions.allDone': 'Показана вся история операций.',
  'transactions.allHistory': 'Вся история',
  'transactions.allTypes': 'Все типы',
  'transactions.activeFilters': 'активн.',
  'transactions.category': 'Категория',
  'transactions.date': 'Дата',
  'transactions.empty': 'История операций по выбранным фильтрам не найдена.',
  'transactions.endDate': 'По дату',
  'transactions.expense': 'Расходы',
  'transactions.expensesEmpty': 'Расходов пока нет.',
  'transactions.expensesTitle': 'Расходы',
  'transactions.filters': 'Фильтры истории операций',
  'transactions.income': 'Доходы',
  'transactions.incomesEmpty': 'Доходов пока нет.',
  'transactions.incomesTitle': 'Доходы',
  'transactions.loadMore': 'Показать еще',
  'transactions.search': 'Поиск',
  'transactions.shown': 'Показано',
  'transactions.startDate': 'С даты',
  'transactions.sum': 'Сумма',
  'transactions.noCategories': 'Нет доступных категорий',
  'transactions.noCategoriesHint': 'Список категорий пуст. Добавьте категорию в настройках.',
  'transactions.noCreditSelected': 'Выберите кредит',
  'transactions.noLoans': 'Нет доступных кредитов',
  'transactions.noLoansHint': 'Список кредитов пуст. Добавьте кредит, чтобы выбрать его здесь.',
  'transactions.description': 'Описание',
  'transactions.exampleDescription': 'Например, кофе',
  'transactions.title': 'История операций',
  'transactions.transaction': 'Операция',
  'empty.title': 'Пока пусто',
  'language.en': 'English',
  'language.ru': 'Русский',
};

const translationsEn: Record<TranslationKey, string> = {
  'actions.addCategory': 'Add category',
  'actions.addExpense': 'Add expense',
  'actions.addIncome': 'Add income',
  'actions.addLoan': 'Add loan',
  'actions.addObligation': 'Add payment',
  'actions.addTransaction': 'Add transaction',
  'actions.addRow': 'Add row',
  'actions.addUser': 'Add user',
  'actions.cancel': 'Cancel',
  'actions.clear': 'Clear',
  'actions.delete': 'Delete',
  'actions.deleteExpenseRow': 'Delete expense row',
  'actions.edit': 'Edit',
  'actions.later': 'Later',
  'actions.more': 'More actions',
  'actions.pay': 'Record payment',
  'actions.save': 'Save',
  'app.financeWorkspace': 'Finance workspace',
  'app.guest': 'Guest',
  'app.loading': 'Loading',
  'app.logout': 'Sign out',
  'app.openNavigation': 'Open navigation',
  'auth.admin': 'Administrator',
  'auth.login': 'Sign in',
  'auth.loginError': 'User was not found or the password is too short.',
  'auth.password': 'Password',
  'auth.subtitle': 'Sign in to finance workspace',
  'auth.user': 'User',
  'category.addTitle': 'Add category',
  'category.color': 'Color',
  'category.expense': 'Expense',
  'category.income': 'Income',
  'category.loanDescription':
    'Use only for categories that should reduce the selected loan balance.',
  'category.loanLabel': 'Loan payment category',
  'category.name': 'Name',
  'category.type': 'Type',
  'category.unknown': 'Uncategorized',
  'dashboard.balance': 'Balance',
  'dashboard.balanceHelp': 'Income minus expenses',
  'dashboard.categoryExpenses': 'Expenses by category',
  'dashboard.categoryLabel': 'category',
  'dashboard.emptyExpenses': 'No expenses this month yet.',
  'dashboard.incomeHelp': 'Income this month',
  'dashboard.loans': 'Loans',
  'dashboard.emptyData': 'No data yet',
  'dashboard.emptyHistory': 'Transaction history is empty',
  'dashboard.emptyHistoryText': 'Create the first transaction to see it in the summary.',
  'dashboard.emptyLoans': 'No loans yet',
  'dashboard.emptyLoansText': 'Added loans will appear here with balance and payment day.',
  'dashboard.emptyObligations': 'No payments yet',
  'dashboard.emptyObligationsText':
    'Add a loan or recurring payment to see upcoming obligations here.',
  'dashboard.duePrefix': 'By',
  'dashboard.entryLabel': 'entry',
  'dashboard.activeLabel': 'active',
  'dashboard.loanDebt': 'Loan balance',
  'dashboard.loanDebtHelp': 'Updated from payments',
  'dashboard.monthIncome': 'Income',
  'dashboard.monthExpense': 'Expenses',
  'dashboard.obligations': 'Required payments',
  'dashboard.obligationsHelp': 'Loans and recurring charges',
  'dashboard.recent': 'Recent entries',
  'dashboard.summary': 'Financial summary',
  'dashboard.todayExpenses': 'Today expenses',
  'loan.addTitle': 'Add loan',
  'loan.amount': 'Loan amount',
  'loan.confirmDelete': 'Delete this loan? Transaction history will remain without a loan link.',
  'loan.dueDay': 'Payment day',
  'loan.editTitle': 'Edit loan',
  'loan.monthlyPayment': 'Monthly payment',
  'loan.name': 'Loan',
  'loan.originalAmount': 'Original amount',
  'loan.paid': 'Paid',
  'loan.paymentTitle': 'Loan payment',
  'loan.remaining': 'Remaining',
  'loan.title': 'Loans',
  'obligation.addTitle': 'Add required payment',
  'obligation.amount': 'Payment amount',
  'obligation.confirmDelete': 'Delete this required payment?',
  'obligation.dueDay': 'Charge day',
  'obligation.editTitle': 'Edit required payment',
  'obligation.name': 'Payment',
  'obligation.paymentTitle': 'Required payment',
  'obligation.recordExpense': 'Record as expense',
  'nav.dashboard': 'Home',
  'nav.expenses': 'Expenses',
  'nav.incomes': 'Income',
  'nav.loans': 'Loans',
  'nav.server': 'Server',
  'nav.settings': 'Settings',
  'nav.statistics': 'Statistics',
  'nav.transactions': 'Transaction history',
  'notification.loadFailed': 'Some data could not be loaded. Other sections will keep working.',
  'notification.loginSuccess': 'Signed in to Ledger.',
  'notification.saveFailed': 'Could not save changes.',
  'settings.categories': 'Categories and accounting settings',
  'settings.expenseCategories': 'Expenses',
  'settings.incomeCategories': 'Income',
  'settings.preferences': 'Appearance',
  'settings.server': 'Server management',
  'settings.serverHelp': 'Users, roles, and access are available to administrators.',
  'settings.language': 'Interface language',
  'settings.theme': 'Dark theme',
  'settings.themeHelp':
    'The color scheme applies to the whole interface and is saved in this browser.',
  'settings.title': 'Settings',
  'settings.user': 'User settings',
  'settings.userHelp': 'Current session profile and local interface preferences.',
  'settings.profile': 'Profile',
  'settings.profileHelp': 'Current account details.',
  'profile.avatar': 'Avatar',
  'profile.avatarUrl': 'Avatar URL',
  'profile.changePassword': 'Change password',
  'profile.confirmPassword': 'Confirm password',
  'profile.currentPassword': 'Current password',
  'profile.edit': 'Edit profile',
  'profile.editTitle': 'Edit profile',
  'profile.newPassword': 'New password',
  'profile.passwordMismatch': 'Passwords do not match',
  'profile.passwordTitle': 'Change password',
  'profile.passwordUpdateFailed': 'Password could not be updated.',
  'profile.removeAvatar': 'Remove',
  'profile.updateFailed': 'Profile could not be updated.',
  'profile.uploadAvatar': 'Upload',
  'server.access': 'Access',
  'server.actions': 'Actions',
  'server.active': 'Active',
  'server.deleteUser': 'Delete user',
  'server.disabled': 'Disabled',
  'server.email': 'Email',
  'server.empty': 'Added users and their roles will appear here.',
  'server.name': 'Name',
  'server.role': 'Role',
  'server.title': 'Users and roles',
  'stats.title': 'Financial statistics',
  'stats.openJournal': 'Open journal',
  'stats.loading': 'Loading statistics',
  'stats.emptyTitle': 'Statistics will appear after the first transactions',
  'stats.emptyText':
    'Add income and expenses to see dynamics, categories, loan load, and daily patterns.',
  'stats.kpis': 'Key metrics',
  'stats.periodHelper': 'For the full accounting period',
  'stats.averageDay': 'average per day',
  'stats.netResult': 'Net result',
  'stats.savingsHelper': 'of income remains',
  'stats.loanPressure': 'Loan load',
  'stats.loanPayoffHelper': 'of loans paid',
  'stats.trendTitle': '12-month trend',
  'stats.trendSubtitle': 'Income, expenses, and net result by month',
  'stats.trendAria': 'Balance line chart and income and expense bars for 12 months',
  'stats.categoryShare': 'Category share for the full period',
  'stats.expenseDonutAria': 'Donut chart of expenses by category',
  'stats.operationsShort': 'tx',
  'stats.incomeSources': 'Income sources and their contribution',
  'stats.weekdayTitle': 'Expense intensity by weekday',
  'stats.weekdaySubtitle': 'Where spending happens most often',
  'stats.loanPortfolio': 'Loan portfolio',
  'stats.loanPortfolioSubtitle': 'Balance, repayment, and monthly load',
  'stats.loanRemaining': 'remaining of',
  'stats.loanPaid': 'paid',
  'stats.perMonth': 'mo.',
  'stats.topExpenses': 'Largest expenses',
  'stats.topExpensesSubtitle': 'Transactions with the strongest budget impact',
  'stats.insights': 'Insights',
  'stats.insightsSubtitle': 'Short summary of the current data',
  'stats.expensesUncategorized': 'Expenses are not distributed by category yet.',
  'stats.expenseLeader': 'accounts for',
  'stats.bestMonth': 'Best balance month',
  'stats.activeDaysInsight': 'in transaction history.',
  'validation.minPassword': 'Minimum 4 characters',
  'theme.dark': 'Dark theme',
  'theme.enableDark': 'Enable dark theme',
  'theme.enableLight': 'Enable light theme',
  'theme.light': 'Light theme',
  'transactions.allCategories': 'All categories',
  'transactions.allDone': 'Full transaction history is shown.',
  'transactions.allHistory': 'Full history',
  'transactions.allTypes': 'All types',
  'transactions.activeFilters': 'active',
  'transactions.category': 'Category',
  'transactions.date': 'Date',
  'transactions.empty': 'No transactions match the selected filters.',
  'transactions.endDate': 'End date',
  'transactions.expense': 'Expenses',
  'transactions.expensesEmpty': 'No expenses yet.',
  'transactions.expensesTitle': 'Expenses',
  'transactions.filters': 'Transaction history filters',
  'transactions.income': 'Income',
  'transactions.incomesEmpty': 'No income yet.',
  'transactions.incomesTitle': 'Income',
  'transactions.loadMore': 'Load more',
  'transactions.search': 'Search',
  'transactions.shown': 'Shown',
  'transactions.startDate': 'Start date',
  'transactions.sum': 'Amount',
  'transactions.noCategories': 'No categories available',
  'transactions.noCategoriesHint': 'The category list is empty. Add a category in settings.',
  'transactions.noCreditSelected': 'Select a loan',
  'transactions.noLoans': 'No loans available',
  'transactions.noLoansHint': 'The loan list is empty. Add a loan to select it here.',
  'transactions.description': 'Description',
  'transactions.exampleDescription': 'For example, coffee',
  'transactions.title': 'Transaction history',
  'transactions.transaction': 'Transaction',
  'empty.title': 'Nothing here yet',
  'language.en': 'English',
  'language.ru': 'Русский',
};

@Injectable({ providedIn: 'root' })
export class AppLanguageService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly storageKey = 'ledger-language';
  private readonly languageState = signal<AppLanguage>(this.restoreLanguage() ?? 'RU');

  readonly language: Signal<AppLanguage> = this.languageState.asReadonly();
  readonly supportedLanguages = computed<readonly AppLanguage[]>(() => ['RU', 'EN']);

  constructor() {
    if (!this.http) {
      return;
    }

    this.http
      .get<AppConfig>('/api/app/config')
      .pipe(catchError(() => of(null)))
      .subscribe((config) => {
        if (!config || this.restoreLanguage()) {
          return;
        }

        this.languageState.set(normalizeLanguage(config.language));
      });
  }

  locale(): string {
    return this.languageState() === 'EN' ? 'en-US' : 'ru-RU';
  }

  t(key: TranslationKey): string {
    return this.languageState() === 'EN' ? translationsEn[key] : translationsRu[key];
  }

  setLanguage(language: AppLanguage): void {
    const normalized = normalizeLanguage(language);
    this.languageState.set(normalized);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, normalized);
    }
  }

  private restoreLanguage(): AppLanguage | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedLanguage = localStorage.getItem(this.storageKey);
    return storedLanguage ? normalizeLanguage(storedLanguage) : null;
  }
}

function normalizeLanguage(language: unknown): AppLanguage {
  return typeof language === 'string' && language.toUpperCase() === 'EN' ? 'EN' : 'RU';
}
