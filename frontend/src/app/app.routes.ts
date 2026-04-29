import { Routes } from '@angular/router';
import { adminGuard, authenticatedGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'transactions',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/transactions/transactions').then((m) => m.Transactions),
  },
  {
    path: 'statistics',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/statistics/statistics').then((m) => m.Statistics),
  },
  {
    path: 'incomes',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/incomes/incomes').then((m) => m.Incomes),
  },
  {
    path: 'expenses',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/expenses/expenses').then((m) => m.Expenses),
  },
  {
    path: 'loans',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/loans/loans').then((m) => m.Loans),
  },
  {
    path: 'settings',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
  },
  {
    path: 'server',
    canMatch: [authenticatedGuard, adminGuard],
    loadComponent: () => import('./pages/server-admin/server-admin').then((m) => m.ServerAdmin),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
