import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb]/30 via-white to-[#e0f2ff]/50">
      <app-navbar></app-navbar>
    
      <main class="flex-1">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
    
          <!-- 1. Header -->
          <div>
            <h1 class="text-3xl font-black text-slate-900">Panel principal</h1>
            <p class="text-sm text-slate-600 flex items-center gap-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ todayFormatted }}
            </p>
          </div>
    
          <!-- Loading Skeleton -->
          @if (loading) {
            <div class="space-y-6">
              <div class="animate-pulse">
                <div class="h-36 bg-slate-200 rounded-2xl"></div>
              </div>
              <div class="animate-pulse grid grid-cols-3 gap-6">
                <div class="col-span-1 space-y-3">
                  @for (_ of [1,2,3]; track _) {
                    <div class="h-20 bg-slate-200 rounded-2xl"></div>
                  }
                </div>
                <div class="col-span-2 space-y-3">
                  <div class="h-44 bg-slate-200 rounded-2xl"></div>
                  <div class="h-44 bg-slate-200 rounded-2xl"></div>
                </div>
              </div>
            </div>
          }
    
          <!-- 2. Doctor del Día -->
          @if (!loading) {
            <div class="bg-gradient-to-br from-[#007BFF] to-[#0056b3] rounded-2xl shadow-2xl overflow-hidden">
              <div class="p-6">
                <div class="flex items-start justify-between mb-6">
                  <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur border-2 border-white/30 text-white">
                      {{ doctorIniciales }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                          <circle cx="20" cy="10" r="2"/>
                        </svg>
                        <span class="text-xs text-blue-200 font-bold uppercase tracking-wide">Consultorio Hoy</span>
                      </div>
                      <h2 class="text-2xl font-black text-white">{{ doctorNombre }}</h2>
                      <p class="text-sm text-blue-200">{{ doctorEspecialidad }}</p>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                    <div class="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <p class="text-xs text-blue-200 font-bold">Horario</p>
                    </div>
                    <p class="text-lg font-black text-white">{{ doctorHorario }}</p>
                  </div>
                  <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                    <div class="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      </svg>
                      <p class="text-xs text-blue-200 font-bold">Atendidos</p>
                    </div>
                    <p class="text-lg font-black text-white">{{ doctorAtendidos }} / {{ doctorTotalHoy }}</p>
                  </div>
                </div>
              </div>
            </div>
          }
    
          <!-- 3. Grid Principal -->
          @if (!loading) {
            <div class="grid grid-cols-3 gap-6">
              <!-- Left Column: Acciones Rápidas -->
              <div class="col-span-1 space-y-3">
                <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                  Acciones Rápidas
                </h3>
                <div class="space-y-3">
                  <!-- Nuevo Recibo -->
                  <button (click)="navigateTo('/recibos', { action: 'nuevo' })"
                    class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-all cursor-pointer border-0">
                    <div class="p-3 bg-white/20 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                        <path d="M12 17.5v-11"/>
                      </svg>
                    </div>
                    <div class="flex-1 text-left">
                      <p class="font-bold">Nuevo Recibo</p>
                      <p class="text-xs text-white/70">Generar comprobante</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  <!-- Adeudos -->
                  <button (click)="navigateTo('/recibos', { filter: 'pendientes' })"
                    class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-[#007BFF] to-[#0056b3] text-white hover:shadow-xl transition-all cursor-pointer border-0">
                    <div class="p-3 bg-white/20 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" x2="12" y1="8" y2="12"/>
                        <line x1="12" x2="12.01" y1="16" y2="16"/>
                      </svg>
                    </div>
                    <div class="flex-1 text-left">
                      <p class="font-bold">Adeudos</p>
                      <p class="text-xs text-white/70">Recibos con saldo pendiente</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                  <!-- Agendar Cita -->
                  <button (click)="navigateTo('/citas', { action: 'nueva' })"
                    class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-[#f3ad1c] to-[#ffb84d] text-white hover:shadow-xl transition-all cursor-pointer border-0">
                    <div class="p-3 bg-white/20 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" x2="16" y1="2" y2="6"/>
                        <line x1="8" x2="8" y1="2" y2="6"/>
                        <line x1="3" x2="21" y1="10" y2="10"/>
                      </svg>
                    </div>
                    <div class="flex-1 text-left">
                      <p class="font-bold">Agendar Cita</p>
                      <p class="text-xs text-white/70">Programar consulta</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Right 2 Columns: Cola de Pacientes -->
              <div class="col-span-2">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    Siguiente en Cola
                  </h3>
                  <div class="flex items-center gap-2">
                    <button (click)="openWalkInModal()" class="text-xs text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-md font-bold cursor-pointer border-0 flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                      Atención sin cita
                    </button>
                    <button (click)="navigateTo('/citas')" class="text-xs text-[#00328b] font-bold hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1">
                      Ver todas
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>
                <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
                  @for (paciente of pacientes; track paciente; let i = $index) {
                    <div
                      class="flex items-center gap-4 p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-all"
                      [class.bg-emerald-50]="i === 0">
                      <!-- Avatar -->
                      <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        [ngClass]="paciente.color">
                        {{ paciente.iniciales }}
                      </div>
                      <!-- Time -->
                      <div class="flex flex-col items-center justify-center min-w-[60px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 mb-1">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span class="text-sm font-bold text-slate-900">{{ paciente.hora }}</span>
                      </div>
                      <!-- Name + Folio -->
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-slate-900">{{ paciente.nombre + ' ' + paciente.apellido }}</p>
                        <p class="text-xs text-slate-400 font-mono">{{ paciente.folio }}</p>
                      </div>
                      <!-- Atender Button -->
                      <button (click)="atenderAhora(paciente)" [disabled]="paciente.atendiendo" class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all cursor-pointer border-0 flex-shrink-0 whitespace-nowrap disabled:opacity-50">
                        {{ paciente.atendiendo ? 'Atendiendo...' : 'Atender Ahora' }}
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
    
          <!-- 4. Panorama General — fusiona KPIs + Actividad + Resumen (RF-D-01..06) -->
          @if (!loading) {
            <div class="grid grid-cols-3 gap-6">
              <!-- Panel Izquierdo: Pulso del Día -->
              <div class="col-span-2 bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
                <h4 class="text-sm font-bold text-slate-700 flex items-center gap-2 mb-5">
                  <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                  Pulso del D&iacute;a
                </h4>
                <div class="grid grid-cols-3 gap-4">
                  <!-- Beneficiarios Activos -->
                  <div class="flex items-center gap-4 p-4 bg-blue-50/60 rounded-xl">
                    <div class="p-2.5 bg-blue-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-2xl font-black text-slate-900">{{ statBeneficiariosActivos }}</p>
                      <p class="text-xs text-slate-500 font-semibold">Beneficiarios</p>
                      <p class="text-[11px] mt-0.5" [ngClass]="deltaBeneficiarios >= 0 ? 'text-emerald-600' : 'text-red-500'">
                        @if (deltaBeneficiarios > 0) {
                          <span>+{{ deltaBeneficiarios }}</span>
                          }@if (deltaBeneficiarios === 0) {
                          <span>=</span>
                          }@if (deltaBeneficiarios < 0) {
                          <span>{{ deltaBeneficiarios }}</span>
                        }
                        <span class="text-slate-400 ml-0.5">vs sem. ant.</span>
                      </p>
                    </div>
                  </div>
                  <!-- Citas Hoy -->
                  <div class="flex items-center gap-4 p-4 bg-amber-50/60 rounded-xl">
                    <div class="p-2.5 bg-amber-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-2xl font-black text-slate-900">{{ statCitas }}</p>
                      <p class="text-xs text-slate-500 font-semibold">Citas Hoy</p>
                      <p class="text-[11px] mt-0.5" [ngClass]="deltaCitas >= 0 ? 'text-emerald-600' : 'text-red-500'">
                        @if (deltaCitas > 0) {
                          <span>+{{ deltaCitas }}</span>
                          }@if (deltaCitas === 0) {
                          <span>=</span>
                          }@if (deltaCitas < 0) {
                          <span>{{ deltaCitas }}</span>
                        }
                        <span class="text-slate-400 ml-0.5">vs ayer</span>
                      </p>
                    </div>
                  </div>
                  <!-- Cobros Hoy -->
                  <div class="flex items-center gap-4 p-4 bg-emerald-50/60 rounded-xl">
                    <div class="p-2.5 bg-emerald-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-2xl font-black text-slate-900">{{ statCobros }}</p>
                      <p class="text-xs text-slate-500 font-semibold">Cobros Hoy</p>
                      <p class="text-[11px] mt-0.5" [ngClass]="deltaRecibos >= 0 ? 'text-emerald-600' : 'text-red-500'">
                        @if (deltaRecibos > 0) {
                          <span>+{{ deltaRecibos }}</span>
                          }@if (deltaRecibos === 0) {
                          <span>=</span>
                          }@if (deltaRecibos < 0) {
                          <span>{{ deltaRecibos }}</span>
                        }
                        <span class="text-slate-400 ml-0.5">vs ayer</span>
                      </p>
                    </div>
                  </div>
                  <!-- Pendientes -->
                  <div class="flex items-center gap-4 p-4 rounded-xl" [ngClass]="statPendientes > 0 ? 'bg-red-50 border border-red-200' : 'bg-slate-50'">
                    <div class="p-2.5 rounded-xl" [ngClass]="statPendientes > 0 ? 'bg-red-100' : 'bg-slate-200'">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" [attr.stroke]="statPendientes > 0 ? '#ef4444' : '#94a3b8'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-2xl font-black" [ngClass]="statPendientes > 0 ? 'text-red-600' : 'text-slate-900'">{{ statPendientes }}</p>
                      <p class="text-xs font-semibold" [ngClass]="statPendientes > 0 ? 'text-red-500' : 'text-slate-500'">Pendientes</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Panel Derecho: Tendencia Semanal -->
              <div class="col-span-1 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl shadow-xl p-6 text-white">
                <div class="flex items-center justify-between mb-5">
                  <h4 class="text-sm font-bold text-blue-200 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                    </svg>
                    Semana
                  </h4>
                  <span class="text-[11px] text-blue-300">{{ resumenSemanaLabel }}</span>
                </div>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 rounded-full bg-blue-300"></div>
                      <span class="text-sm text-blue-100">Nuevos Benef.</span>
                    </div>
                    <span class="text-lg font-black">{{ resumenNuevosBeneficiarios }}</span>
                  </div>
                  <div class="border-t border-white/10"></div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span class="text-sm text-blue-100">Citas Completadas</span>
                    </div>
                    <span class="text-lg font-black">{{ resumenCitasCompletadas }}</span>
                  </div>
                  <div class="border-t border-white/10"></div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 rounded-full bg-purple-400"></div>
                      <span class="text-sm text-blue-100">Recibos</span>
                    </div>
                    <span class="text-lg font-black">{{ resumenRecibosGenerados }}</span>
                  </div>
                  <div class="border-t border-white/10"></div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 rounded-full bg-amber-400"></div>
                      <span class="text-sm text-blue-100">Recaudado</span>
                    </div>
                    <span class="text-lg font-black">\${{ resumenMontoRecaudado | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
    
        </div>
      </main>
    
      <!-- Modal de atención sin cita -->
      @if (showWalkInModal) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="closeWalkInModal()">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-slate-900">Registrar atención sin cita</h2>
                <p class="text-xs text-slate-500">Agrega un beneficiario sin cita para hoy</p>
              </div>
              <button (click)="closeWalkInModal()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" [(ngModel)]="walkInSearchTerm" (input)="filtrarWalkIn()"
                  placeholder="Buscar por nombre o folio..."
                  class="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              @if (walkInResults.length > 0) {
                <div class="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  @for (b of walkInResults; track b) {
                    <button (click)="selectWalkIn(b)"
                      [class.bg-emerald-50]="walkInSelected?.id_paciente === b.id_paciente"
                      class="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between bg-white">
                      <div>
                        <p class="font-semibold text-slate-900 text-sm">{{ b.nombre }} {{ b.apellido_paterno }} {{ b.apellido_materno }}</p>
                        <p class="text-xs text-slate-500 font-mono">{{ b.folio }}</p>
                      </div>
                      @if (walkInSelected?.id_paciente === b.id_paciente) {
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                  }
                </div>
              }
              @if (walkInSearchTerm && walkInResults.length === 0) {
                <p class="text-xs text-slate-500 italic text-center py-4">Sin resultados</p>
              }
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-700">Servicio</label>
                <select [(ngModel)]="walkInServicioSeleccionadoId"
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option [ngValue]="null" disabled>Selecciona un servicio...</option>
                  @for (servicio of walkInServicios; track servicio.id_servicio) {
                    <option [ngValue]="servicio.id_servicio">{{ servicio.nombre }}</option>
                  }
                </select>
                @if (walkInServicios.length === 0) {
                  <p class="text-xs text-slate-500 italic">No hay servicios disponibles para seleccionar.</p>
                }
              </div>
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-700">Cantidad</label>
                <input type="number" [(ngModel)]="walkInCantidad" min="1"
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              @if (walkInError) {
                <p class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{{ walkInError }}</p>
              }
              <div class="flex gap-3 justify-end pt-2">
                <button (click)="closeWalkInModal()" class="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">Cancelar</button>
                <button (click)="registrarWalkIn()" [disabled]="!walkInSelected || !walkInServicioSeleccionadoId || walkInCantidad < 1 || walkInSaving"
                  class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ walkInSaving ? 'Registrando...' : 'Registrar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    
      <app-footer></app-footer>
    </div>
    `,
})
export class DashboardComponent implements OnInit {
  loading = true;
  todayFormatted = '';
  pacientes: any[] = [];

  // Stats
  statCobros = 0;
  statPendientes = 0;
  statCitas = 0;
  statBeneficiariosActivos = 0;

  // RF-D-06: Deltas de comparación
  deltaBeneficiarios = 0;
  deltaCitas = 0;
  deltaRecibos = 0;

  // Resumen semanal (RF-D-05)
  resumenSemanaLabel = '';
  resumenNuevosBeneficiarios = 0;
  resumenCitasCompletadas = 0;
  resumenRecibosGenerados = 0;
  resumenMontoRecaudado = 0;

  // Doctor del día
  doctorNombre = 'Sin doctor asignado';
  doctorEspecialidad = '';
  doctorIniciales = '--';
  doctorAtendidos = 0;
  doctorTotalHoy = 0;
  doctorHorario = '—';

  // Modal de atención sin cita
  showWalkInModal = false;
  walkInSearchTerm = '';
  walkInResults: any[] = [];
  walkInAllBeneficiarios: any[] = [];
  walkInServicios: any[] = [];
  walkInSelected: any = null;
  walkInServicioSeleccionadoId: number | null = null;
  walkInCantidad = 1;
  walkInSaving = false;
  walkInError = '';

  private colors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400',
    'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
    'bg-cyan-400', 'bg-indigo-400', 'bg-teal-400',
  ];

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.todayFormatted = today.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.todayFormatted = this.todayFormatted.charAt(0).toUpperCase() + this.todayFormatted.slice(1);

    // Fire all API calls in parallel; mark loading=false when all complete
    forkJoin({
      citasHoy: this.api.getCitasHoy(),
      recibosStats: this.api.getRecibosStats(),
      citasStats: this.api.getCitasStats(),
      doctor: this.api.getDoctorHoy(),
      benefStats: this.api.getDashboardStats(),
      resumen: this.api.getReporteConsolidadoMensual(today.getMonth() + 1, today.getFullYear()),
    }).subscribe({
      next: (res) => {
        this.processCitasHoy(res.citasHoy);
        this.processRecibosStats(res.recibosStats);
        this.processCitasStats(res.citasStats);
        this.processDoctor(res.doctor);
        this.processBenefStats(res.benefStats);
        this.processResumen(res.resumen);
        this.loading = false;
      },
      error: () => {
        // Even if some fail, show what we have
        this.loading = false;
      },
    });

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    this.resumenSemanaLabel = `${startOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`;
  }

  private processCitasHoy(resp: any): void {
    const citas = resp.citas || resp || [];
    this.doctorTotalHoy = resp.total || citas.length || 0;
    this.doctorAtendidos = resp.completadas || 0;

    this.pacientes = citas
      .filter((c: any) => c.estatus === 'PROGRAMADA')
      .map((cita: any, i: number) => {
        const fullName = cita.nombre_paciente || '';
        const parts = fullName.trim().split(/\s+/);
        const nombre = parts[0] || '';
        const apellido = parts.slice(1).join(' ') || '';
        const iniciales = (nombre.charAt(0) + (apellido.charAt(0) || '')).toUpperCase();
        let hora = '';
        if (cita.fecha_hora) {
          const date = new Date(cita.fecha_hora);
          hora = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        const servicio = cita.servicios?.[0]?.nombre || 'Consulta';
        return {
          idCita: cita.id_cita,
          nombre,
          apellido,
          folio: cita.folio_paciente || '',
          hora,
          iniciales,
          servicio,
          color: this.colors[i % this.colors.length],
          atendiendo: false,
        };
      });
  }

  private processRecibosStats(stats: any): void {
    this.statCobros = stats.total_hoy ?? stats.total ?? 0;
    this.statPendientes = stats.pendientes ?? 0;
    const ayer = stats.total_ayer ?? 0;
    this.deltaRecibos = this.statCobros - ayer;
  }

  private processCitasStats(stats: any): void {
    this.statCitas = stats.total_hoy ?? stats.total ?? 0;
    const ayer = stats.total_ayer ?? 0;
    this.deltaCitas = this.statCitas - ayer;
  }

  private processBenefStats(stats: any): void {
    this.statBeneficiariosActivos = stats.activos ?? stats.total ?? 0;
    const estaSemana = stats.nuevos_esta_semana ?? 0;
    const semanaAnt = stats.nuevos_semana_anterior ?? 0;
    this.deltaBeneficiarios = estaSemana - semanaAnt;
  }

  private processResumen(data: any): void {
    this.resumenNuevosBeneficiarios = data.pacientes_atendidos ?? 0;
    this.resumenCitasCompletadas = data.citas_por_estatus?.COMPLETADA ?? 0;
    this.resumenRecibosGenerados = data.total_ventas ?? 0;
    this.resumenMontoRecaudado = data.monto_ventas ?? 0;
  }

  private processDoctor(resp: any): void {
    const doctor = resp.doctor;
    if (doctor) {
      const nombre = doctor.nombre || '';
      const apellido = doctor.apellido_paterno || '';
      this.doctorNombre = `Dr. ${nombre} ${apellido}`.trim();
      this.doctorEspecialidad = doctor.especialidad || '';
      this.doctorIniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
      const formatTime = (ts: string) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      };
      const inicio = formatTime(resp.hora_inicio);
      const fin = formatTime(resp.hora_fin);
      this.doctorHorario = inicio && fin ? `${inicio} - ${fin}` : '—';
    }
  }

  atenderAhora(paciente: any): void {
    if (!paciente.idCita) return;
    paciente.atendiendo = true;
    const backup = [...this.pacientes];
    this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
    this.doctorAtendidos++;
    this.api.completarCita(paciente.idCita).subscribe({
      next: () => {},
      error: () => {
        this.pacientes = backup;
        this.doctorAtendidos = Math.max(0, this.doctorAtendidos - 1);
        paciente.atendiendo = false;
      },
    });
  }

  navigateTo(route: string, queryParams?: { [key: string]: string }): void {
    if (queryParams) {
      this.router.navigate([route], { queryParams });
    } else {
      this.router.navigate([route]);
    }
  }

  openWalkInModal(): void {
    this.showWalkInModal = true;
    this.walkInSearchTerm = '';
    this.walkInResults = [];
    this.walkInSelected = null;
    this.walkInServicioSeleccionadoId = null;
    this.walkInCantidad = 1;
    this.walkInError = '';
    if (this.walkInAllBeneficiarios.length === 0) {
      this.api.getBeneficiarios().subscribe({
        next: (data) => {
          this.walkInAllBeneficiarios = data || [];
        },
        error: () => {
          this.walkInError = 'No se pudieron cargar los beneficiarios';
        },
      });
    }
    if (this.walkInServicios.length === 0) {
      this.api.getServicios().subscribe({
        next: (data) => {
          this.walkInServicios = (data || []).filter((servicio: any) =>
            String(servicio?.activo ?? 'S').toUpperCase() === 'S'
          );
        },
        error: () => {
          this.walkInError = 'No se pudieron cargar los servicios';
        },
      });
    }
  }

  closeWalkInModal(): void {
    this.showWalkInModal = false;
    this.walkInSearchTerm = '';
    this.walkInResults = [];
    this.walkInSelected = null;
    this.walkInServicioSeleccionadoId = null;
    this.walkInCantidad = 1;
    this.walkInError = '';
    this.walkInSaving = false;
  }

  filtrarWalkIn(): void {
    const term = this.walkInSearchTerm.trim().toLowerCase();
    if (!term) {
      this.walkInResults = [];
      return;
    }
    this.walkInResults = this.walkInAllBeneficiarios
      .filter((b: any) => {
        const fullName = `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.toLowerCase();
        const folio = (b.folio || '').toLowerCase();
        return fullName.includes(term) || folio.includes(term);
      })
      .slice(0, 20);
  }

  selectWalkIn(b: any): void {
    this.walkInSelected = b;
  }

  registrarWalkIn(): void {
    if (!this.walkInSelected || this.walkInSaving) return;
    if (!this.walkInServicioSeleccionadoId) {
      this.walkInError = 'Selecciona un servicio para registrar la atención sin cita';
      return;
    }

    const servicioId = Number(this.walkInServicioSeleccionadoId);
    if (!Number.isInteger(servicioId) || servicioId <= 0) {
      this.walkInError = 'Selecciona un servicio válido';
      return;
    }

    const cantidad = Math.max(1, Number(this.walkInCantidad) || 1);
    this.walkInSaving = true;
    this.walkInError = '';

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaHora = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;

    const payload = {
      id_paciente: this.walkInSelected.id_paciente,
      fecha_hora: fechaHora,
      estatus: 'PROGRAMADA',
      notas: 'Atención sin cita registrada desde panel principal',
      servicios: [
        {
          id_servicio: servicioId,
          cantidad,
        },
      ],
    };

    this.api.createCita(payload).subscribe({
      next: () => {
        this.closeWalkInModal();
        this.api.getCitasHoy().subscribe({
          next: (resp) => this.processCitasHoy(resp),
          error: () => {},
        });
      },
      error: (err) => {
        this.walkInSaving = false;
        this.walkInError = err?.error?.detail || 'No se pudo registrar la atención sin cita';
      },
    });
  }
}
