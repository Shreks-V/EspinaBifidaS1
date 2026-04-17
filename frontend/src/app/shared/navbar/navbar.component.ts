import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface NavbarNotification {
  id: string;
  categoria: 'citas' | 'membresias';
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
  imports: [CommonModule, RouterLink],
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
                  [class.animate-bounce]="notifications.length > 0 && !notificationsOpen">
                  <path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                </svg>
                @if (notifications.length > 0) {
                  <span
                    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#f3ad1c] text-[#00328b] text-[10px] font-black flex items-center justify-center">
                    {{ notifications.length > 9 ? '9+' : notifications.length }}
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
                  @if (notifications.length === 0 && !notifLoading) {
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
                  @if (notifications.length > 0) {
                    <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      @for (n of notifications; track n) {
                        <button
                          (click)="navegarNotificacion(n)"
                          class="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                          <!-- Category icon pill -->
                          <div class="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                         [ngClass]="{
                           'bg-blue-100': n.categoria === 'citas',
                           'bg-amber-100': n.categoria === 'membresias'
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
                          <!-- Chevron -->
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-1 shrink-0">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </button>
                      }
                    </div>
                  }
                  <!-- Footer -->
                  @if (notifications.length > 0) {
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
                    <button (click)="auth.logout()" class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
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
            <div class="mt-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
              <p class="text-xs font-bold">Usuario</p>
              <p class="text-sm font-semibold truncate">{{ userName }}</p>
              <p class="text-xs text-white/80 truncate">{{ userEmail }}</p>
            </div>
            <div class="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
              <p class="text-xs font-bold">Notificaciones</p>
              <p class="text-sm font-semibold">{{ notifications.length === 0 ? 'Sin alertas por ahora' : notifications.length + ' pendientes' }}</p>
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
  notifLoading = false;
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
}
