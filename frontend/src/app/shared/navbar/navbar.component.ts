import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface NavbarNotification {
  id: string;
  categoria: 'citas' | 'membresias' | 'almacen';
  tipo: 'info' | 'warning';
  titulo: string;
  detalle: string;
  count: number;
  link: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENCARGADO_ALMACEN: 'Encargado de almacén',
  DOCTOR: 'Doctor',
  OPERATIVO: 'Recepcionista',
  ADMIN: 'Administrador',
  ALMACEN: 'Encargado de almacén',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="bg-gradient-to-r from-[#00328b] via-[#0052cc] to-[#00328b] shadow-2xl sticky top-0 z-50 border-b-4 border-[#f3ad1c]">
      <div class="max-w-[1400px] mx-auto px-8">
        <div class="flex items-center justify-between h-16">
    
          <!-- Left: Logo -->
          <a routerLink="/dashboard" class="flex items-center gap-3 text-white no-underline flex-shrink-0">
            <div class="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#0052cc]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
            </div>
            <span class="font-bold text-white text-lg hidden sm:block">Espina Bífida</span>
          </a>
    
          <!-- Center: Navigation (desktop) -->
          <div class="hidden lg:flex items-center gap-1">
            <a routerLink="/dashboard"
              [class]="isActive('/dashboard') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Inicio
            </a>
    
            <a routerLink="/recibos"
              [class]="isActive('/recibos') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
              </svg>
              Recibos
            </a>
    
            <a routerLink="/registro-usuarios"
              [class]="isActive('/registro-usuarios') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Beneficiarios
            </a>
    
            <a routerLink="/citas"
              [class]="isActive('/citas') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              Citas
            </a>
    
            <a routerLink="/almacen"
              [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
              </svg>
              Almac&eacute;n y Serv.
            </a>
    
            <a routerLink="/reportes"
              [class]="isActive('/reportes') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
              </svg>
              Reportes
            </a>
          </div>
    
          <!-- Right: Notifications + User menu + Mobile hamburger -->
          <div class="flex items-center gap-3 relative">
            <!-- Notifications bell (desktop) -->
            <div class="hidden lg:block relative">
              <button (click)="$event.stopPropagation(); toggleNotifications()"
                class="relative flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 cursor-pointer"
                title="Notificaciones">
                <!-- Bell icon — animated shake when there are alerts -->
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  [class.animate-bounce]="visibleNotifications.length > 0 && !notificationsOpen">
                  <path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                </svg>
                @if (visibleNotifications.length > 0) {
                  <span
                    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#f3ad1c] text-[#00328b] text-[10px] font-black flex items-center justify-center">
                    {{ visibleNotifications.length > 9 ? '9+' : visibleNotifications.length }}
                  </span>
                }
              </button>
    
              <!-- Notification panel -->
              @if (notificationsOpen) {
                <div
                  class="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <!-- Header -->
                  <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-bold text-slate-800">Notificaciones</p>
                      @if (notifications.length > 0) {
                        <span
                          class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                          {{ notifications.length }}
                        </span>
                      }
                    </div>
                    <button (click)="refreshNotifications()"
                      class="flex items-center gap-1.5 text-xs font-semibold text-[#0052cc] hover:text-[#00328b] transition-colors cursor-pointer"
                      [class.opacity-50]="notifLoading">
                      @if (!notifLoading) {
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      }
                      @if (notifLoading) {
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="animate-spin">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      }
                      Actualizar
                    </button>
                  </div>
                  <!-- Empty state -->
                  @if (visibleNotifications.length === 0 && !notifLoading) {
                    <div class="px-5 py-10 flex flex-col items-center gap-3 text-center">
                      <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                          <path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                        </svg>
                      </div>
                      <p class="text-sm font-bold text-slate-700">Todo al día</p>
                      <p class="text-xs text-slate-400">No hay alertas pendientes en este momento.</p>
                    </div>
                  }
                  <!-- Loading state -->
                  @if (notifLoading) {
                    <div class="px-5 py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                      Cargando alertas...
                    </div>
                  }
                  <!-- Notification list -->
                  @if (visibleNotifications.length > 0) {
                    <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      @for (n of visibleNotifications; track n) {
                        <button
                          (click)="navegarNotificacion(n)"
                          class="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                          <!-- Category icon pill -->
                          <div class="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                         [ngClass]="{
                           'bg-blue-100': n.categoria === 'citas',
                           'bg-amber-100': n.categoria === 'membresias',
                           'bg-red-100': n.categoria === 'almacen' && n.tipo === 'warning',
                           'bg-orange-100': n.categoria === 'almacen' && n.id === 'caducidad'
                         }">
                            <!-- Citas icon -->
                            @if (n.categoria === 'citas') {
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                              </svg>
                            }
                            <!-- Membresías icon -->
                            @if (n.categoria === 'membresias') {
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                            }
                            <!-- Ícono de existencias en almacén -->
                            @if (n.categoria === 'almacen' && n.id === 'stock_bajo') {
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                              </svg>
                            }
                            <!-- Almacén caducidad icon -->
                            @if (n.categoria === 'almacen' && n.id === 'caducidad') {
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
                              </svg>
                            }
                          </div>
                          <!-- Text + count -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                              <p class="text-sm font-bold text-slate-800 truncate">{{ n.titulo }}</p>
                              <span class="shrink-0 px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                              [ngClass]="{
                                'bg-blue-100 text-blue-700': n.tipo === 'info',
                                'bg-amber-100 text-amber-700': n.tipo === 'warning'
                              }">
                                {{ n.count }}
                              </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ n.detalle }}</p>
                          </div>
                          <!-- Chevron + dismiss -->
                          <div class="flex items-center gap-1 mt-1 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                            <span (click)="dismissNotification(n.id, $event)"
                              class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                              </svg>
                            </span>
                          </div>
                        </button>
                      }
                    </div>
                  }
                  <!-- Footer -->
                  @if (visibleNotifications.length > 0) {
                    <div class="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 text-center">
                      Última actualización: {{ lastRefresh }}
                    </div>
                  }
                </div>
              }
            </div>
    
            <!-- User menu (desktop) -->
            <div class="hidden lg:block relative">
              <button (click)="$event.stopPropagation(); toggleUserMenu()"
                class="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 px-3 py-2 transition-all duration-200 cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-[#f3ad1c] text-[#00328b] font-black text-xs flex items-center justify-center">
                  {{ userInitials }}
                </div>
                <div class="text-left leading-tight">
                  <p class="text-xs font-bold max-w-[140px] truncate">{{ userName }}</p>
                  <p class="text-[11px] text-white/80">{{ userRole }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
    
              @if (userMenuOpen) {
                <div class="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div class="px-4 py-4 bg-slate-50 border-b border-slate-100">
                    <p class="text-sm font-black text-slate-900">{{ userName }}</p>
                    <p class="text-xs font-semibold text-slate-600">{{ userRole }}</p>
                    <p class="text-xs text-slate-500 mt-1">{{ userEmail }}</p>
                  </div>
                  <div class="p-2">
                    <a routerLink="/perfil" (click)="userMenuOpen=false" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors no-underline">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/></svg>
                      Mi Perfil
                    </a>
                    <button (click)="openCambiarPass(); userMenuOpen=false" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Cambiar contrase&ntilde;a
                    </button>
                    @if (isAdmin) {
                      <a routerLink="/usuarios-sistema" (click)="userMenuOpen=false" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors no-underline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Gesti&oacute;n de usuarios
                      </a>
                    }
                    <div class="border-t border-slate-100 my-1"></div>
                    <button (click)="auth.logout()" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      Cerrar sesi&oacute;n
                    </button>
                  </div>
                </div>
              }
            </div>
    
            <!-- Mobile menu button -->
            <button (click)="mobileMenuOpen = !mobileMenuOpen; userMenuOpen = false; notificationsOpen = false"
              class="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 cursor-pointer">
              <!-- Menu icon -->
              @if (!mobileMenuOpen) {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
                </svg>
              }
              <!-- X icon -->
              @if (mobileMenuOpen) {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              }
            </button>
          </div>
    
        </div>
    
        <!-- Mobile menu -->
        @if (mobileMenuOpen) {
          <div class="lg:hidden pb-4 flex flex-col gap-1">
            <a routerLink="/dashboard" (click)="mobileMenuOpen = false"
              [class]="isActive('/dashboard') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Inicio
            </a>
            <a routerLink="/recibos" (click)="mobileMenuOpen = false"
              [class]="isActive('/recibos') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
              </svg>
              Recibos
            </a>
            <a routerLink="/registro-usuarios" (click)="mobileMenuOpen = false"
              [class]="isActive('/registro-usuarios') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Beneficiarios
            </a>
            <a routerLink="/citas" (click)="mobileMenuOpen = false"
              [class]="isActive('/citas') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              Citas
            </a>
            <a routerLink="/almacen" (click)="mobileMenuOpen = false"
              [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
              </svg>
              Almac&eacute;n y Serv.
            </a>
            <a routerLink="/reportes" (click)="mobileMenuOpen = false"
              [class]="isActive('/reportes') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
              </svg>
              Reportes
            </a>
            <div class="mt-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
              <p class="text-xs font-bold">Usuario</p>
              <p class="text-sm font-semibold truncate">{{ userName }}</p>
              <p class="text-xs text-white/80 truncate">{{ userEmail }}</p>
            </div>
            <div class="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
              <p class="text-xs font-bold">Notificaciones</p>
              <p class="text-sm font-semibold">{{ visibleNotifications.length === 0 ? 'Sin alertas por ahora' : visibleNotifications.length + ' pendientes' }}</p>
            </div>
            <hr class="border-white/20 my-2">
            <button (click)="auth.logout()"
              class="flex items-center gap-2 bg-white/10 hover:bg-red-600 text-white rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-sm transition-all duration-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              Salir
            </button>
          </div>
        }
      </div>
    </nav>

    <!-- Modal: Cambiar contraseña -->
    @if (showCambiarPass) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="closeCambiarPass()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[#00328b] rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 class="text-base font-bold text-slate-900">Cambiar contrase&ntilde;a</h2>
            </div>
            <button (click)="closeCambiarPass()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            @if (cambiarPassSuccess) {
              <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Contrase&ntilde;a actualizada correctamente.
              </div>
            }
            @if (cambiarPassError) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700">{{ cambiarPassError }}</div>
            }
            @if (!cambiarPassSuccess) {
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Contrase&ntilde;a actual</label>
                <input type="password" [(ngModel)]="cambiarPassData.actual" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-all text-sm" placeholder="Tu contrase&ntilde;a actual">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nueva contrase&ntilde;a</label>
                <input type="password" [(ngModel)]="cambiarPassData.nueva" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-all text-sm" placeholder="M&iacute;nimo 8 caracteres">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Confirmar nueva contrase&ntilde;a</label>
                <input type="password" [(ngModel)]="cambiarPassData.confirmar" class="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-all text-sm" placeholder="Repite la nueva contrase&ntilde;a">
              </div>
            }
          </div>
          <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button (click)="closeCambiarPass()" class="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
            @if (!cambiarPassSuccess) {
              <button (click)="submitCambiarPass()" [disabled]="cambiarPassLoading" class="px-5 py-2 text-sm font-bold text-white bg-[#00328b] hover:bg-[#00246d] rounded-xl transition-all disabled:opacity-50">
                {{ cambiarPassLoading ? 'Guardando...' : 'Guardar' }}
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- Modal: Gestión de accesos (solo admin) -->
    @if (showGestionAccesos) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="closeGestionAccesos()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[#00328b] rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h2 class="text-base font-bold text-slate-900">Gesti&oacute;n de accesos</h2>
            </div>
            <button (click)="closeGestionAccesos()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="px-6 py-4 overflow-y-auto flex-1">
            @if (gestionAccesosLoading) {
              <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                  <div class="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                }
              </div>
            }
            @if (!gestionAccesosLoading) {
              <div class="space-y-3">
                @for (u of usuariosSistema; track u.id_usuario) {
                  <div class="border border-slate-200 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <p class="text-sm font-bold text-slate-900">{{ u.nombre }} {{ u.apellido_paterno }}</p>
                        <p class="text-xs text-slate-500">{{ u.correo }} &middot; <span class="font-semibold text-[#00328b]">{{ u.rol }}</span></p>
                      </div>
                      <span class="text-xs px-2 py-0.5 rounded-full font-bold" [ngClass]="u.estatus === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">{{ u.estatus }}</span>
                    </div>
                    @if (resetPassId === u.id_usuario) {
                      <div class="space-y-2">
                        @if (resetPassSuccess === u.id_usuario) {
                          <p class="text-xs font-semibold text-emerald-600">&#10003; Contrase&ntilde;a restablecida</p>
                        }
                        @if (resetPassError) {
                          <p class="text-xs font-semibold text-red-600">{{ resetPassError }}</p>
                        }
                        @if (resetPassSuccess !== u.id_usuario) {
                          <input type="password" [(ngModel)]="resetPassNueva" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#00328b] focus:outline-none" placeholder="Nueva contrase&ntilde;a (m&iacute;n. 8 chars)">
                          <div class="flex gap-2">
                            <button (click)="submitResetPass(u.id_usuario)" [disabled]="resetPassLoading" class="px-3 py-1.5 text-xs font-bold text-white bg-[#00328b] hover:bg-[#00246d] rounded-lg transition-all disabled:opacity-50">
                              {{ resetPassLoading ? 'Guardando...' : 'Confirmar' }}
                            </button>
                            <button (click)="resetPassId=null; resetPassNueva=''; resetPassError=''" class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">Cancelar</button>
                          </div>
                        }
                      </div>
                    }
                    @if (resetPassId !== u.id_usuario) {
                      <button (click)="openResetPass(u.id_usuario)" class="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7"/><circle cx="11" cy="14" r=".5" fill="currentColor"/></svg>
                        Restablecer contrase&ntilde;a
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
    `,
  styles: []
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private api = inject(ApiService);
  private host = inject(ElementRef);
  auth = inject(AuthService);
  mobileMenuOpen = false;
  userMenuOpen = false;
  notificationsOpen = false;
  notifications: NavbarNotification[] = [];
  dismissedIds = new Set<string>();
  notifLoading = false;

  get visibleNotifications(): NavbarNotification[] {
    return this.notifications.filter(n => !this.dismissedIds.has(n.id));
  }

  // Cambiar contraseña
  showCambiarPass = false;
  cambiarPassData = { actual: '', nueva: '', confirmar: '' };
  cambiarPassError = '';
  cambiarPassSuccess = false;
  cambiarPassLoading = false;

  // Gestión de accesos (admin)
  showGestionAccesos = false;
  usuariosSistema: any[] = [];
  gestionAccesosLoading = false;
  resetPassId: number | null = null;
  resetPassNueva = '';
  resetPassError = '';
  resetPassSuccess: number | null = null;
  resetPassLoading = false;
  lastRefresh = '';
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadNotifications();
    // Actualización automática cada 5 minutos
    this.refreshInterval = setInterval(() => this.loadNotifications(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen && !this.notificationsOpen) return;
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      this.userMenuOpen = false;
      this.notificationsOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen = false;
    this.notificationsOpen = false;
  }

  get userName(): string {
    return this.auth.getUser()?.nombre || 'Usuario';
  }

  get userRole(): string {
    const raw = (this.auth.getUser()?.rol || 'OPERATIVO').toString().toUpperCase();
    return ROLE_LABELS[raw] || raw;
  }

  get userEmail(): string {
    return this.auth.getUser()?.correo || 'sin-correo';
  }

  get userInitials(): string {
    const name = this.userName.trim();
    if (!name) return 'US';
    const parts = name.split(' ');
    const first = parts[0]?.charAt(0) || 'U';
    const second = parts[1]?.charAt(0) || 'S';
    return (first + second).toUpperCase();
  }

  get isAdmin(): boolean {
    return ['ADMINISTRADOR', 'ADMIN'].includes(
      (this.auth.getUser()?.rol || '').toString().toUpperCase()
    );
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    this.notificationsOpen = false;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    this.userMenuOpen = false;
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  navegarNotificacion(n: NavbarNotification): void {
    this.notificationsOpen = false;
    this.router.navigate([n.link]);
  }

  dismissNotification(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.dismissedIds.add(id);
  }

  private loadNotifications(): void {
    this.notifLoading = true;
    this.api.getNotificaciones().subscribe({
      next: (data: any[]) => {
        this.notifications = data || [];
        this.notifLoading = false;
        const now = new Date();
        this.lastRefresh = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      },
      error: () => {
        this.notifLoading = false;
      }
    });
  }

  isActive(path: string): boolean {
    if (path === '/dashboard') {
      return this.router.url === '/dashboard' || this.router.url === '/';
    }
    return this.router.url.startsWith(path);
  }

  // ── Cambiar contraseña ─────────────────────────────────────────────────────

  openCambiarPass(): void {
    this.cambiarPassData = { actual: '', nueva: '', confirmar: '' };
    this.cambiarPassError = '';
    this.cambiarPassSuccess = false;
    this.showCambiarPass = true;
  }

  closeCambiarPass(): void {
    this.showCambiarPass = false;
  }

  submitCambiarPass(): void {
    this.cambiarPassError = '';
    const { actual, nueva, confirmar } = this.cambiarPassData;
    if (!actual || !nueva || !confirmar) {
      this.cambiarPassError = 'Completa todos los campos.';
      return;
    }
    if (nueva.length < 8) {
      this.cambiarPassError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (nueva !== confirmar) {
      this.cambiarPassError = 'Las contraseñas no coinciden.';
      return;
    }
    this.cambiarPassLoading = true;
    this.api.cambiarContrasena({ contrasena_actual: actual, contrasena_nueva: nueva }).subscribe({
      next: () => {
        this.cambiarPassLoading = false;
        this.cambiarPassSuccess = true;
      },
      error: (err) => {
        this.cambiarPassLoading = false;
        this.cambiarPassError = err?.error?.detail || 'Error al cambiar la contraseña.';
      },
    });
  }

  // ── Gestión de accesos (admin) ─────────────────────────────────────────────

  openGestionAccesos(): void {
    this.showGestionAccesos = true;
    this.resetPassId = null;
    this.resetPassNueva = '';
    this.resetPassError = '';
    this.resetPassSuccess = null;
    this.gestionAccesosLoading = true;
    this.api.listarUsuariosSistema().subscribe({
      next: (data) => { this.usuariosSistema = data; this.gestionAccesosLoading = false; },
      error: () => { this.gestionAccesosLoading = false; },
    });
  }

  closeGestionAccesos(): void {
    this.showGestionAccesos = false;
  }

  openResetPass(idUsuario: number): void {
    this.resetPassId = idUsuario;
    this.resetPassNueva = '';
    this.resetPassError = '';
    this.resetPassSuccess = null;
  }

  submitResetPass(idUsuario: number): void {
    this.resetPassError = '';
    if (this.resetPassNueva.length < 8) {
      this.resetPassError = 'Mínimo 8 caracteres.';
      return;
    }
    this.resetPassLoading = true;
    this.api.adminResetContrasena(idUsuario, { contrasena_nueva: this.resetPassNueva }).subscribe({
      next: () => {
        this.resetPassLoading = false;
        this.resetPassSuccess = idUsuario;
        this.resetPassNueva = '';
      },
      error: (err) => {
        this.resetPassLoading = false;
        this.resetPassError = err?.error?.detail || 'Error al restablecer.';
      },
    });
  }
}
