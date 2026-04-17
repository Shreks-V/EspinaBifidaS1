import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'preregistro', loadComponent: () => import('./pages/pre-registro/pre-registro.component').then(m => m.PreRegistroComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'registro-usuarios', canActivate: [authGuard], loadComponent: () => import('./pages/beneficiarios/beneficiarios.component').then(m => m.BeneficiariosComponent) },
  { path: 'citas', canActivate: [authGuard], loadComponent: () => import('./pages/citas/citas.component').then(m => m.CitasComponent) },
  { path: 'recibos', canActivate: [authGuard], loadComponent: () => import('./pages/recibos/recibos.component').then(m => m.RecibosComponent) },
  { path: '**', redirectTo: '' },
];
