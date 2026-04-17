import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface Beneficiario {
  idPaciente: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  fechaNacimiento: string;
  curp: string;
  nombrePadreMadre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefonoCasa: string;
  telefonoCelular: string;
  correoElectronico: string;
  enEmergenciaAvisarA: string;
  telefonoEmergencia: string;
  municipioNacimiento: string;
  estadoNacimiento: string;
  hospitalNacimiento: string;
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  fechaAlta: string;
  membresiaEstatus: string;
  tipoCuota: string;
  activo: string;
  tiposEspina: {idTipoEspina: number, nombre: string}[];
  fechaInicioMembresia: string | null;
  fechaVencimientoMembresia: string | null;
  fotoUrl: string | null;
  // UI helpers
  iniciales: string;
  color: string;
}

interface Preregistro {
  id: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  genero: string;
  curp: string;
  nombrePadreMadre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefonoCasa: string;
  telefonoCelular: string;
  correoElectronico: string;
  enEmergenciaAvisarA: string;
  telefonoEmergencia: string;
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  tipoCuota: string;
  fechaSolicitud: string;
  estatus: string;
  // UI helpers
  iniciales: string;
  color: string;
}

interface NuevoBeneficiarioDocumento {
  id_tipo_documento: number;
  archivo: File | null;
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-beneficiarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar />
    
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
    
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="16" y1="11" x2="22" y2="11"/>
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">Registro de Beneficiarios</h1>
                <p class="text-slate-600 font-semibold">Gestion completa de beneficiarios y membresias</p>
              </div>
            </div>
            <button (click)="openNuevoModal()" class="bg-gradient-to-r from-[#f3ad1c] to-[#ffb84d] text-white shadow-xl font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-2xl transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Nuevo Beneficiario
            </button>
          </div>
    
          <!-- Search -->
          <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-6">
            <div class="flex items-center gap-4">
              <div class="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="filterData()"
                  placeholder="Buscar por nombre, folio, CURP o membresia..."
                  class="w-full pl-14 h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
                  />
              </div>
              <button (click)="exportarCSV()" class="h-14 border-2 border-slate-200 font-bold px-6 rounded-2xl text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Exportar
              </button>
            </div>
          </div>
    
          <!-- Tabs -->
          <div class="bg-white border-2 border-slate-200 p-1 rounded-2xl shadow-lg flex">
            <button
              (click)="currentTab = 'activos'"
              [class]="currentTab === 'activos'
                ? 'bg-[#007BFF] text-white rounded-xl font-bold px-6 py-2 transition-all'
                : 'text-slate-600 font-bold px-6 py-2 rounded-xl hover:bg-slate-100 transition-all'"
              >
              Beneficiarios Activos ({{ filteredBeneficiarios.length }})
            </button>
            <button
              (click)="currentTab = 'preregistros'"
              [class]="currentTab === 'preregistros'
                ? 'bg-[#f3ad1c] text-white rounded-xl font-bold px-6 py-2 transition-all'
                : 'text-slate-600 font-bold px-6 py-2 rounded-xl hover:bg-slate-100 transition-all'"
              >
              Aprobacion de Preregistro ({{ filteredPreregistros.length }})
            </button>
          </div>
    
          <!-- Loading Skeleton -->
          @if (loading) {
            <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden p-6">
              <div class="animate-pulse space-y-4">
                <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                @for (_ of [1,2,3,4,5,6]; track _) {
                  <div class="flex items-center gap-4 py-3">
                    <div class="w-12 h-12 bg-slate-200 rounded-full"></div>
                    <div class="flex-1 space-y-2">
                      <div class="h-4 bg-slate-200 rounded w-2/3"></div>
                      <div class="h-3 bg-slate-100 rounded w-1/3"></div>
                    </div>
                    <div class="h-4 bg-slate-200 rounded w-20"></div>
                    <div class="h-6 bg-slate-200 rounded-full w-16"></div>
                  </div>
                }
              </div>
            </div>
          }
    
          <!-- Alerta membresías próximas a vencer -->
          @if (membresiasProximasCount > 0 && currentTab === 'activos') {
            <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 flex items-center gap-3">
              <div class="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <p class="text-sm font-bold text-amber-800">
                {{ membresiasProximasCount }} membresía{{ membresiasProximasCount === 1 ? '' : 's' }} próxima{{ membresiasProximasCount === 1 ? '' : 's' }} a vencer en los próximos 30 días.
                <span class="font-normal">Verifica la columna Membresía y renueva según corresponda.</span>
              </p>
            </div>
          }
    
          <!-- Tab Content: Beneficiarios Activos -->
          @if (currentTab === 'activos' && !loading) {
            <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-auto max-h-[calc(100vh-320px)]">
              <table class="w-full">
                <thead class="sticky top-0 z-20 shadow-sm bg-slate-50">
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('folio')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Folio</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'folio') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('nombre')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Nombre Completo</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'nombre') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('tipoEspina')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Tipo Espina</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'tipoEspina') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('cuota')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Cuota</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'cuota') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('membresia')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Membresia</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'membresia') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="toggleBeneficiariosSort('fechaAlta')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Fecha Alta</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(beneficiariosSort, 'fechaAlta') }}</span>
                      </button>
                    </th>
                    <th class="w-14 px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of paginatedBeneficiarios; track b; let i = $index) {
                    <tr class="group border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-default">
                      <td class="px-6 py-4 text-sm font-semibold text-slate-700">{{ b.folio }}</td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div [class]="b.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                            @if (b.fotoUrl) {
                              <img
                                [src]="b.fotoUrl"
                                [alt]="'Foto de ' + b.nombre"
                                class="w-full h-full rounded-full object-cover" />
                            } @else {
                              {{ b.iniciales }}
                            }
                          </div>
                          <span class="text-sm font-semibold text-slate-800">{{ b.nombre }} {{ b.apellidoPaterno }} {{ b.apellidoMaterno }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">
                        @if (b.tiposEspina.length) {
                          <span>
                            @for (te of b.tiposEspina; track te; let last = $last) {
                              <span>{{ te.nombre }}{{ !last ? ', ' : '' }}</span>
                            }
                          </span>
                        } @else {
                          N/A
                        }
                      </td>
                      <td class="px-6 py-4">
                        <span [class]="getCuotaBadgeClass(b.tipoCuota)">{{ cuotaShortLabel(b.tipoCuota) }}</span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex flex-col gap-0.5">
                          <span [class]="getMembresiaBadgeClass(b.membresiaEstatus)">{{ b.membresiaEstatus }}</span>
                          @if (b.fechaVencimientoMembresia) {
                            <span class="text-xs font-semibold" [ngClass]="getMembresiaVencimientoClass(b)">
                              Vence: {{ b.fechaVencimientoMembresia | slice:0:10 }}
                            </span>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ b.fechaAlta }}</td>
                      <td class="px-4 py-4 text-center">
                        <button (click)="toggleActionMenu(b, $event)"
                          class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                      [ngClass]="openActionMenu === b.folio
                        ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600 group-hover:shadow-sm hover:bg-slate-50'">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <!-- Footer -->
              <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span class="text-sm text-slate-500 font-medium">
                  Mostrando {{ beneficiariosStart + 1 }} a {{ beneficiariosEnd }} de {{ filteredBeneficiarios.length }} beneficiarios
                </span>
                <div class="flex items-center gap-2">
                  <button
                    (click)="beneficiariosPage > 1 && changeBeneficiariosPage(beneficiariosPage - 1)"
                    [disabled]="beneficiariosPage <= 1"
                    class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                    Anterior
                  </button>
                  <button
                    (click)="beneficiariosPage < beneficiariosTotalPages && changeBeneficiariosPage(beneficiariosPage + 1)"
                    [disabled]="beneficiariosPage >= beneficiariosTotalPages"
                    class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          }
    
          <!-- Tab Content: Preregistros -->
          @if (currentTab === 'preregistros') {
            <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100">
              <table class="w-full">
                <thead class="sticky top-0 z-10 shadow-sm">
                  <tr class="bg-amber-50 border-b border-amber-200">
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="togglePreregistrosSort('id')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>ID</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(preregistrosSort, 'id') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="togglePreregistrosSort('nombre')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Nombre</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(preregistrosSort, 'nombre') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="togglePreregistrosSort('estatus')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Estatus</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(preregistrosSort, 'estatus') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="togglePreregistrosSort('cuota')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Cuota</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(preregistrosSort, 'cuota') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <button type="button" (click)="togglePreregistrosSort('fechaSolicitud')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        <span>Fecha Solicitud</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(preregistrosSort, 'fechaSolicitud') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of paginatedPreregistros; track p; let i = $index) {
                    <tr class="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                      <td class="px-6 py-4 text-sm font-semibold text-slate-700">{{ p.id }}</td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div [class]="p.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                            {{ p.iniciales }}
                          </div>
                          <span class="text-sm font-semibold text-slate-800">{{ p.nombre }} {{ p.apellidoPaterno }} {{ p.apellidoMaterno }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ p.estatus }}</td>
                      <td class="px-6 py-4">
                        <span [class]="getCuotaBadgeClass(p.tipoCuota)">Cuota {{ cuotaShortLabel(p.tipoCuota) }}</span>
                      </td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ p.fechaSolicitud }}</td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <!-- Eye -->
                          <button (click)="verDetallePreregistro(p)" class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver detalle">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <!-- Editar -->
                          <button
                            (click)="editarPreregistro(p)"
                            class="px-4 py-2 rounded-lg border-2 border-blue-300 text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors"
                            >
                            Editar
                          </button>
                          <!-- Aprobar -->
                          <button
                            (click)="abrirModalAprobacion(p)"
                            class="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                            >
                            Aprobar
                          </button>
                          <!-- Rechazar -->
                          <button
                            (click)="rechazarPreregistro(p)"
                            class="px-4 py-2 rounded-lg border-2 border-red-400 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
                            >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <!-- Footer -->
              <div class="px-6 py-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
                <span class="text-sm text-slate-500 font-medium">
                  Mostrando {{ preregistrosStart + 1 }} a {{ preregistrosEnd }} de {{ filteredPreregistros.length }} preregistros
                </span>
                <div class="flex items-center gap-2">
                  <button
                    (click)="preregistrosPage > 1 && changePreregistrosPage(preregistrosPage - 1)"
                    [disabled]="preregistrosPage <= 1"
                    class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                    Anterior
                  </button>
                  <button
                    (click)="preregistrosPage < preregistrosTotalPages && changePreregistrosPage(preregistrosPage + 1)"
                    [disabled]="preregistrosPage >= preregistrosTotalPages"
                    class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          }
    
        </div>
    
        <app-footer />
      </main>
    </div>
    
    <!-- ==================== MODAL: Nuevo Beneficiario ==================== -->
    <!-- No click-outside-to-close: the form has too much data to lose accidentally -->
    @if (showNuevoModal) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Nuevo Beneficiario</h2>
            <button (click)="closeNuevoModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="submitNuevoBeneficiario()">
            <!-- Datos personales -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Datos Personales</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                <input type="text" [(ngModel)]="formData.nombre" name="nombre" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Paterno *</label>
                <input type="text" [(ngModel)]="formData.apellido_paterno" name="apellido_paterno" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Materno</label>
                <input type="text" [(ngModel)]="formData.apellido_materno" name="apellido_materno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Genero *</label>
                <select [(ngModel)]="formData.genero" name="genero" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Nacimiento *</label>
                <input type="date" [(ngModel)]="formData.fecha_nacimiento" name="fecha_nacimiento" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">CURP *</label>
                <input type="text" [(ngModel)]="formData.curp" name="curp" required maxlength="18" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all uppercase" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre del Padre/Madre</label>
                <input type="text" [(ngModel)]="formData.nombre_padre_madre" name="nombre_padre_madre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <!-- Direccion -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Direccion</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Direccion</label>
                <input type="text" [(ngModel)]="formData.direccion" name="direccion" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Colonia</label>
                <input type="text" [(ngModel)]="formData.colonia" name="colonia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
                <input type="text" [(ngModel)]="formData.ciudad" name="ciudad" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
                <select [(ngModel)]="formData.estado" name="estado" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (e of estadosMexicanos; track e) {
                    <option [value]="e">{{ e }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Codigo Postal</label>
                <input type="text" [(ngModel)]="formData.codigo_postal" name="codigo_postal" maxlength="5" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <!-- Contacto -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Casa</label>
                <input type="tel" [(ngModel)]="formData.telefono_casa" name="telefono_casa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Celular</label>
                <input type="tel" [(ngModel)]="formData.telefono_celular" name="telefono_celular" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico</label>
                <input type="email" [(ngModel)]="formData.correo_electronico" name="correo_electronico" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">En emergencia avisar a</label>
                <input type="text" [(ngModel)]="formData.en_emergencia_avisar_a" name="en_emergencia_avisar_a" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Emergencia</label>
                <input type="tel" [(ngModel)]="formData.telefono_emergencia" name="telefono_emergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <!-- Medico -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Informacion Medica</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Sangre</label>
                <select [(ngModel)]="formData.tipo_sangre" name="tipo_sangre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (ts of tiposSangre; track ts) {
                    <option [value]="ts">{{ ts }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3 pt-7">
                <input type="checkbox" [(ngModel)]="formDataUsaValvula" name="usa_valvula" id="usa_valvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
                <label for="usa_valvula" class="text-sm font-semibold text-slate-700">Usa Valvula</label>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-2">Tipo(s) de Espina Bifida</label>
                <div class="flex flex-wrap gap-4">
                  @for (te of tiposEspinaCatalogo; track te) {
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        [checked]="isNuevoEspinaSelected(te.id_tipo_espina)"
                        (change)="toggleNuevoEspina(te.id_tipo_espina)"
                        class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
                      <span class="text-sm font-semibold text-slate-700">{{ te.nombre }}</span>
                    </label>
                  }
                  @if (tiposEspinaCatalogo.length === 0) {
                    <span class="text-sm text-slate-400">Cargando...</span>
                  }
                </div>
              </div>
            </div>
            <!-- Membresia -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Membresia</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Cuota *</label>
                <select [(ngModel)]="formData.tipo_cuota" name="tipo_cuota" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  <option value="CUOTA A">A</option>
                  <option value="CUOTA B">B</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus de Membresia *</label>
                <select [(ngModel)]="formData.membresia_estatus" name="membresia_estatus" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="VENCIDO">VENCIDO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                </select>
              </div>
            </div>
            <!-- Documentos opcionales -->
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Documentos (Opcional)</h3>
            <div class="mb-8 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-3">
              <p class="text-xs text-slate-600 font-semibold">Los documentos se suben autom&aacute;ticamente despu&eacute;s de guardar al beneficiario.</p>
              @for (doc of nuevoBeneficiarioDocumentos; track doc; let i = $index) {
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div class="md:col-span-5">
                    <select [(ngModel)]="doc.id_tipo_documento" [name]="'nuevoDocTipo' + i" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all text-sm bg-white">
                      <option [ngValue]="0">Tipo de documento...</option>
                      @for (td of tiposDocumentoCatalogo; track td) {
                        <option [ngValue]="td.id_tipo_documento">{{ td.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="md:col-span-5">
                    <input type="file" [name]="'nuevoDocArchivo' + i" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" (change)="onNuevoBeneficiarioDocSelected($event, i)" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm bg-white" />
                  </div>
                  <div class="md:col-span-2 flex justify-end">
                    <button type="button" (click)="eliminarDocumentoNuevoBeneficiario(i)" class="w-10 h-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors" title="Quitar documento">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
              <button type="button" (click)="agregarDocumentoNuevoBeneficiario()" class="px-4 py-2 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:bg-white transition-all inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar documento
              </button>
            </div>
            <!-- Error message -->
            @if (nuevoError) {
              <div class="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                {{ nuevoError }}
              </div>
            }
            <!-- Buttons -->
            <div class="flex items-center justify-end gap-3">
              <button type="button" (click)="closeNuevoModal()" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button type="submit" [disabled]="submittingNuevo" class="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#00328b] to-[#0052cc] text-white hover:shadow-lg transition-all disabled:opacity-50">
                {{ submittingNuevo ? 'Guardando...' : 'Guardar Beneficiario' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Detalle Beneficiario ==================== -->
    @if (showDetalleModal && beneficiarioSeleccionado) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeDetalleModal()">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <div [class]="beneficiarioSeleccionado.color + ' w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg'">
                @if (beneficiarioSeleccionado.fotoUrl) {
                  <img
                    [src]="beneficiarioSeleccionado.fotoUrl"
                    [alt]="'Foto de ' + beneficiarioSeleccionado.nombre"
                    class="w-full h-full rounded-full object-cover" />
                } @else {
                  {{ beneficiarioSeleccionado.iniciales }}
                }
              </div>
              <div>
                <h2 class="text-2xl font-black text-slate-900">{{ beneficiarioSeleccionado.nombre }} {{ beneficiarioSeleccionado.apellidoPaterno }} {{ beneficiarioSeleccionado.apellidoMaterno }}</h2>
                <p class="text-slate-500 font-semibold">Folio: {{ beneficiarioSeleccionado.folio }}</p>
              </div>
            </div>
            <button (click)="closeDetalleModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Badges -->
          <div class="flex items-center gap-3 mb-6">
            <span [class]="getMembresiaBadgeClass(beneficiarioSeleccionado.membresiaEstatus)">{{ beneficiarioSeleccionado.membresiaEstatus }}</span>
            <span [class]="getCuotaBadgeClass(beneficiarioSeleccionado.tipoCuota)">Cuota {{ cuotaShortLabel(beneficiarioSeleccionado.tipoCuota) }}</span>
            @if (beneficiarioSeleccionado.fechaVencimientoMembresia) {
              <span class="text-xs font-semibold" [ngClass]="getMembresiaVencimientoClass(beneficiarioSeleccionado)">
                Vence: {{ beneficiarioSeleccionado.fechaVencimientoMembresia | slice:0:10 }}
              </span>
            }
          </div>
          <!-- Personal -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Datos Personales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
            <div><span class="text-xs font-bold text-slate-400 uppercase">Genero</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.genero || '-' }}</p></div>
            <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Nacimiento</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.fechaNacimiento || '-' }}</p></div>
            <div><span class="text-xs font-bold text-slate-400 uppercase">CURP</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.curp || '-' }}</p></div>
            <div><span class="text-xs font-bold text-slate-400 uppercase">Padre/Madre</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.nombrePadreMadre || '-' }}</p></div>
            <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Alta</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.fechaAlta || '-' }}</p></div>
            <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Tipo(s) de Espina</span>
            <div class="flex flex-wrap gap-2 mt-1">
              @for (te of beneficiarioSeleccionado.tiposEspina; track te) {
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">{{ te.nombre }}</span>
              }
              @if (!beneficiarioSeleccionado.tiposEspina.length) {
                <span class="text-sm font-semibold text-slate-800">N/A</span>
              }
            </div>
          </div>
        </div>
        <!-- Direccion -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Direccion</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Direccion</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.direccion || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Colonia</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.colonia || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Ciudad</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.ciudad || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Estado</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.estado || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Codigo Postal</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.codigoPostal || '-' }}</p></div>
        </div>
        <!-- Contacto -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Contacto</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Casa</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoCasa || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Celular</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoCelular || '-' }}</p></div>
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Correo Electronico</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.correoElectronico || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">En emergencia avisar a</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.enEmergenciaAvisarA || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Emergencia</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoEmergencia || '-' }}</p></div>
        </div>
        <!-- Medico -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Informacion Medica</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Tipo de Sangre</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.tipoSangre || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Usa Valvula</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.usaValvula === 'S' ? 'Si' : 'No' }}</p></div>
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Notas Adicionales</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.notasAdicionales || '-' }}</p></div>
        </div>
        <!-- Actions -->
        <div class="flex justify-between items-center">
          <div class="flex gap-2">
            <button (click)="verCredencial(beneficiarioSeleccionado)" class="px-4 py-2 rounded-xl font-bold text-sm bg-[#00328b] text-white hover:bg-[#002266] transition-all flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
              Credencial
            </button>
            <button (click)="descargarExpediente(beneficiarioSeleccionado.folio)" class="px-4 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              Expediente PDF
            </button>
          </div>
          <button (click)="closeDetalleModal()" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>
    }
    
    <!-- ==================== MODAL: Detalle Preregistro ==================== -->
    @if (showDetallePreregistroModal && preregistroSeleccionado) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeDetallePreregistroModal()">
        <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full mx-4 max-h-[92vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- Header sticky -->
          <div class="flex items-center justify-between px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
            <div class="flex items-center gap-4">
              <div [class]="preregistroSeleccionado.color + ' w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0'">
                {{ preregistroSeleccionado.iniciales }}
              </div>
              <div>
                <h2 class="text-xl font-black text-slate-900">{{ preregistroSeleccionado.nombre }} {{ preregistroSeleccionado.apellidoPaterno }} {{ preregistroSeleccionado.apellidoMaterno }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{{ preregistroSeleccionado.estatus }}</span>
                  @if (preregistroSeleccionado.tipoCuota) {
                    <span [class]="getCuotaBadgeClass(preregistroSeleccionado.tipoCuota)">Cuota {{ cuotaShortLabel(preregistroSeleccionado.tipoCuota) }}</span>
                  }
                  @if (!preregistroSeleccionado.tipoCuota) {
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Sin cuota asignada</span>
                  }
                </div>
              </div>
            </div>
            <button (click)="closeDetallePreregistroModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Scrollable body -->
          <div class="overflow-y-auto flex-1 px-8 py-6 space-y-6">
            <!-- Datos Personales -->
            <div>
              <h3 class="text-xs font-bold text-[#00328b] uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Datos Personales</h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.nombre }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Apellido Paterno</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.apellidoPaterno }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Apellido Materno</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.apellidoMaterno || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Fecha de Nacimiento</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.fechaNacimiento ? preregistroSeleccionado.fechaNacimiento.substring(0,10) : '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Sexo</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.genero || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">CURP</span><p class="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{{ preregistroSeleccionado.curp || '-' }}</p></div>
                <div class="col-span-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Padre / Madre</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.nombrePadreMadre || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Folio</span><p class="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{{ preregistroSeleccionado.folio || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Fecha de Solicitud</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.fechaSolicitud ? preregistroSeleccionado.fechaSolicitud.substring(0,10) : '-' }}</p></div>
              </div>
            </div>
            <!-- Direccion -->
            <div>
              <h3 class="text-xs font-bold text-[#00328b] uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Direccion</h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div class="col-span-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Calle y numero</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.direccion || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Colonia</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.colonia || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Ciudad</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.ciudad || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Estado</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.estado || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Codigo Postal</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.codigoPostal || '-' }}</p></div>
              </div>
            </div>
            <!-- Contacto -->
            <div>
              <h3 class="text-xs font-bold text-[#00328b] uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Contacto</h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Telefono Casa</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.telefonoCasa || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Telefono Celular</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.telefonoCelular || '-' }}</p></div>
                <div class="col-span-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Correo Electronico</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.correoElectronico || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">En Emergencia Avisar a</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.enEmergenciaAvisarA || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Telefono Emergencia</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.telefonoEmergencia || '-' }}</p></div>
              </div>
            </div>
            <!-- Info Medica -->
            <div>
              <h3 class="text-xs font-bold text-[#00328b] uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Informacion Medica</h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Tipo de Sangre</span><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ preregistroSeleccionado.tipoSangre || '-' }}</p></div>
                <div><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Usa Valvula</span>
                <p class="mt-0.5">
                  @if (preregistroSeleccionado.usaValvula === 'S') {
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Si</span>
                  }
                  @if (preregistroSeleccionado.usaValvula !== 'S') {
                    <span class="text-sm font-semibold text-slate-800">No</span>
                  }
                </p>
              </div>
              @if (preregistroSeleccionado.notasAdicionales) {
                <div class="col-span-2"><span class="text-xs font-bold text-slate-400 uppercase tracking-wide">Notas Adicionales</span><p class="text-sm font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap">{{ preregistroSeleccionado.notasAdicionales }}</p></div>
              }
            </div>
          </div>
        </div>
        <!-- Footer actions sticky -->
        <div class="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 shrink-0">
          <button (click)="closeDetallePreregistroModal()" class="px-5 py-2.5 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cerrar
          </button>
          <button (click)="closeDetallePreregistroModal(); editarPreregistro(preregistroSeleccionado!)" class="px-5 py-2.5 rounded-xl font-bold border-2 border-blue-300 text-blue-600 hover:bg-blue-50 transition-all">
            Editar
          </button>
          <button (click)="closeDetallePreregistroModal(); rechazarPreregistro(preregistroSeleccionado!)" class="px-5 py-2.5 rounded-xl font-bold border-2 border-red-400 text-red-500 hover:bg-red-50 transition-all">
            Rechazar
          </button>
          <button (click)="closeDetallePreregistroModal(); abrirModalAprobacion(preregistroSeleccionado!)" class="px-5 py-2.5 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
            Aprobar
          </button>
        </div>
      </div>
    </div>
    }
    
    <!-- ==================== MODAL: Confirmar Aprobacion ==================== -->
    @if (showAprobarModal && preregistroAProbar) {
      <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center" (click)="showAprobarModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
          <!-- Icon + Title -->
          <div class="flex flex-col items-center text-center mb-6">
            <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-black text-slate-900">Aprobar Beneficiario</h3>
            <p class="text-slate-500 text-sm mt-1 font-semibold">{{ preregistroAProbar.nombre }} {{ preregistroAProbar.apellidoPaterno }} {{ preregistroAProbar.apellidoMaterno }}</p>
          </div>
          <!-- Cuota selection -->
          <div class="mb-6">
            <label class="block text-sm font-bold text-slate-700 mb-3">Tipo de Cuota <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-2 gap-3">
              <button type="button"
                (click)="aprobarCuotaSeleccionada = 'CUOTA A'"
              [ngClass]="aprobarCuotaSeleccionada === 'CUOTA A'
                ? 'border-[#00328b] bg-[#00328b] text-white shadow-lg'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
                class="px-4 py-4 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1">
                <span class="text-base">Cuota A</span>
                <span class="text-xs font-normal opacity-75">Tarifa estandar</span>
              </button>
              <button type="button"
                (click)="aprobarCuotaSeleccionada = 'CUOTA B'"
              [ngClass]="aprobarCuotaSeleccionada === 'CUOTA B'
                ? 'border-[#f3ad1c] bg-[#f3ad1c] text-white shadow-lg'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
                class="px-4 py-4 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1">
                <span class="text-base">Cuota B</span>
                <span class="text-xs font-normal opacity-75">Tarifa diferenciada</span>
              </button>
            </div>
            @if (!aprobarCuotaSeleccionada) {
              <p class="text-xs text-amber-600 font-semibold mt-2">Selecciona el tipo de cuota para continuar</p>
            }
          </div>
          <!-- Actions -->
          <div class="flex gap-3">
            <button (click)="showAprobarModal = false" class="flex-1 px-5 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button (click)="confirmarAprobacion()"
              [disabled]="!aprobarCuotaSeleccionada || submittingAprobacion"
              class="flex-1 px-5 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {{ submittingAprobacion ? 'Aprobando...' : 'Confirmar Aprobacion' }}
            </button>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Editar Preregistro ==================== -->
    @if (showEditPreregistroModal && preregistroEditData) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditPreregistroModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Editar Pre-registro</h2>
            <button (click)="showEditPreregistroModal = false" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarEdicionPreregistro()">
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Datos Personales</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                <input type="text" [(ngModel)]="preregistroEditData.nombre" name="preNombre" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Paterno *</label>
                <input type="text" [(ngModel)]="preregistroEditData.apellido_paterno" name="preApellidoPaterno" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Materno</label>
                <input type="text" [(ngModel)]="preregistroEditData.apellido_materno" name="preApellidoMaterno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
                <input type="date" [(ngModel)]="preregistroEditData.fecha_nacimiento" name="preFechaNacimiento" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Genero</label>
                <select [(ngModel)]="preregistroEditData.genero" name="preGenero" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">CURP *</label>
                <input type="text" [(ngModel)]="preregistroEditData.curp" name="preCurp" required maxlength="18" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all uppercase" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre del Padre/Madre</label>
                <input type="text" [(ngModel)]="preregistroEditData.nombre_padre_madre" name="prePadreMadre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Direccion y Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Direccion</label>
                <input type="text" [(ngModel)]="preregistroEditData.direccion" name="preDireccion" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Colonia</label>
                <input type="text" [(ngModel)]="preregistroEditData.colonia" name="preColonia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
                <input type="text" [(ngModel)]="preregistroEditData.ciudad" name="preCiudad" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
                <select [(ngModel)]="preregistroEditData.estado" name="preEstado" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (e of estadosMexicanos; track e) {
                    <option [value]="e">{{ e }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Codigo Postal</label>
                <input type="text" [(ngModel)]="preregistroEditData.codigo_postal" name="preCP" maxlength="5" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Casa</label>
                <input type="tel" [(ngModel)]="preregistroEditData.telefono_casa" name="preTelCasa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Celular</label>
                <input type="tel" [(ngModel)]="preregistroEditData.telefono_celular" name="preTelCel" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico</label>
                <input type="email" [(ngModel)]="preregistroEditData.correo_electronico" name="preCorreo" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">En emergencia avisar a</label>
                <input type="text" [(ngModel)]="preregistroEditData.en_emergencia_avisar_a" name="preEmergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Emergencia</label>
                <input type="tel" [(ngModel)]="preregistroEditData.telefono_emergencia" name="preTelEmergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Informacion Medica</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Sangre</label>
                <select [(ngModel)]="preregistroEditData.tipo_sangre" name="preTipoSangre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (ts of tiposSangre; track ts) {
                    <option [value]="ts">{{ ts }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3 pt-7">
                <input type="checkbox" [(ngModel)]="preregistroEditUsaValvula" name="preUsaValvula" id="preUsaValvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
                <label for="preUsaValvula" class="text-sm font-semibold text-slate-700">Usa Valvula</label>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Cuota</label>
                <select [(ngModel)]="preregistroEditData.tipo_cuota" name="preTipoCuota" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  <option value="CUOTA A">A</option>
                  <option value="CUOTA B">B</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Notas Adicionales</label>
                <textarea [(ngModel)]="preregistroEditData.notas_adicionales" name="preNotas" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all resize-none"></textarea>
              </div>
            </div>
            @if (preregistroEditError) {
              <div class="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                {{ preregistroEditError }}
              </div>
            }
            <div class="flex items-center justify-end gap-3">
              <button type="button" (click)="showEditPreregistroModal = false" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button type="submit" [disabled]="submittingPreregistroEdit" class="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#f3ad1c] to-[#ffb84d] text-white hover:shadow-lg transition-all disabled:opacity-50">
                {{ submittingPreregistroEdit ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Editar Beneficiario ==================== -->
    @if (showEditModal && editFormData) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Editar Beneficiario</h2>
            <button (click)="showEditModal = false" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarEdicionBeneficiario()">
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Fotografia</h3>
            <div class="mb-6 rounded-2xl border-2 border-slate-200 p-4 flex flex-col sm:flex-row gap-4 bg-slate-50">
              <div class="w-28 h-36 rounded-xl border-2 border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                @if (editFotoPreviewUrl) {
                  <img
                    [src]="editFotoPreviewUrl"
                    alt="Vista previa de foto"
                    class="w-full h-full object-cover" />
                } @else {
                  <div class="text-center text-slate-300 px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <p class="text-[10px] font-bold">Sin foto</p>
                  </div>
                }
              </div>
              <div class="flex-1 space-y-3">
                <div>
                  <p class="text-sm font-bold text-slate-800">Cargar foto del beneficiario</p>
                  <p class="text-xs font-semibold text-slate-500">Esta imagen se mostrara en el avatar y en la credencial generada.</p>
                </div>
                <input type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  (change)="onFotoBeneficiarioSeleccionada($event)"
                  class="w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#00328b] file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-[#002266]" />
                @if (editFotoFile) {
                  <p class="text-xs font-semibold text-emerald-700">
                    Archivo seleccionado: {{ editFotoFile.name }}
                  </p>
                }
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Datos Personales</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                <input type="text" [(ngModel)]="editFormData.nombre" name="editNombre" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Paterno *</label>
                <input type="text" [(ngModel)]="editFormData.apellido_paterno" name="editApPaterno" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Materno</label>
                <input type="text" [(ngModel)]="editFormData.apellido_materno" name="editApMaterno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Genero *</label>
                <select [(ngModel)]="editFormData.genero" name="editGenero" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Nacimiento *</label>
                <input type="date" [(ngModel)]="editFormData.fecha_nacimiento" name="editFechaNac" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">CURP *</label>
                <input type="text" [(ngModel)]="editFormData.curp" name="editCurp" required maxlength="18" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all uppercase" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre del Padre/Madre</label>
                <input type="text" [(ngModel)]="editFormData.nombre_padre_madre" name="editPadreMadre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Direccion</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Direccion</label>
                <input type="text" [(ngModel)]="editFormData.direccion" name="editDireccion" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Colonia</label>
                <input type="text" [(ngModel)]="editFormData.colonia" name="editColonia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
                <input type="text" [(ngModel)]="editFormData.ciudad" name="editCiudad" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
                <select [(ngModel)]="editFormData.estado" name="editEstado" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (e of estadosMexicanos; track e) {
                    <option [value]="e">{{ e }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Codigo Postal</label>
                <input type="text" [(ngModel)]="editFormData.codigo_postal" name="editCP" maxlength="5" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Casa</label>
                <input type="tel" [(ngModel)]="editFormData.telefono_casa" name="editTelCasa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Celular</label>
                <input type="tel" [(ngModel)]="editFormData.telefono_celular" name="editTelCel" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico</label>
                <input type="email" [(ngModel)]="editFormData.correo_electronico" name="editCorreo" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">En emergencia avisar a</label>
                <input type="text" [(ngModel)]="editFormData.en_emergencia_avisar_a" name="editEmergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Emergencia</label>
                <input type="tel" [(ngModel)]="editFormData.telefono_emergencia" name="editTelEmergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Informacion Medica</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Sangre</label>
                <select [(ngModel)]="editFormData.tipo_sangre" name="editTipoSangre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="">Seleccionar</option>
                  @for (ts of tiposSangre; track ts) {
                    <option [value]="ts">{{ ts }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3 pt-7">
                <input type="checkbox" [(ngModel)]="editFormDataUsaValvula" name="editUsaValvula" id="editUsaValvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
                <label for="editUsaValvula" class="text-sm font-semibold text-slate-700">Usa Valvula</label>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-slate-700 mb-2">Tipo(s) de Espina Bifida</label>
                <div class="flex flex-wrap gap-4">
                  @for (te of tiposEspinaCatalogo; track te) {
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        [checked]="isEditEspinaSelected(te.id_tipo_espina)"
                        (change)="toggleEditEspina(te.id_tipo_espina)"
                        class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
                      <span class="text-sm font-semibold text-slate-700">{{ te.nombre }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>
            <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Membresia</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Cuota *</label>
                <select [(ngModel)]="editFormData.tipo_cuota" name="editTipoCuota" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="CUOTA A">A</option>
                  <option value="CUOTA B">B</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus de Membresia *</label>
                <select [(ngModel)]="editFormData.membresia_estatus" name="editMembresiaEstatus" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
            </div>
            @if (editError) {
              <div class="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold">{{ editError }}</div>
            }
            <div class="flex items-center justify-end gap-3">
              <button type="button" (click)="showEditModal = false" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button>
              <button type="submit" [disabled]="submittingEdit" class="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#00328b] to-[#0052cc] text-white hover:shadow-lg transition-all disabled:opacity-50">
                {{ submittingEdit ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Historial ==================== -->
    @if (showHistorialModal) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showHistorialModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Historial - {{ historialData?.nombre }}</h2>
            <button (click)="showHistorialModal = false" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Loading -->
          @if (historialLoading) {
            <div class="space-y-4">
              <div class="h-8 bg-slate-200 rounded-lg animate-pulse w-1/3"></div>
              <div class="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
              <div class="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          }
          <!-- Content -->
          @if (!historialLoading && historialData) {
            <div>
              <!-- Tabs -->
              <div class="flex gap-2 mb-6 border-b border-slate-200 pb-3">
                <button (click)="historialTab = 'citas'" [class]="historialTab === 'citas' ? 'px-4 py-2 rounded-lg text-sm font-bold bg-[#00328b] text-white' : 'px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100'">
                  Citas ({{ historialData.citas?.length || 0 }})
                </button>
                <button (click)="historialTab = 'pagos'" [class]="historialTab === 'pagos' ? 'px-4 py-2 rounded-lg text-sm font-bold bg-[#00328b] text-white' : 'px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100'">
                  Pagos ({{ historialData.pagos?.length || 0 }})
                </button>
                <button (click)="historialTab = 'comodatos'" [class]="historialTab === 'comodatos' ? 'px-4 py-2 rounded-lg text-sm font-bold bg-[#00328b] text-white' : 'px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100'">
                  Comodatos ({{ historialData.comodatos?.length || 0 }})
                </button>
              </div>
              <!-- Tab: Citas -->
              @if (historialTab === 'citas') {
                <div>
                  @if (!historialData.citas?.length) {
                    <div class="text-center py-8 text-slate-400 text-sm">Sin citas registradas</div>
                  }
                  @for (c of historialData.citas; track c) {
                    <div class="border-2 border-slate-200 rounded-2xl p-4 mb-3 bg-white shadow-sm">
                      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha y hora</p>
                          <p class="text-base font-black text-slate-900">{{ formatDateTime(c.fecha_hora) }}</p>
                        </div>
                        <span [class]="getCitaStatusClass(c.estatus)">{{ getCitaStatusLabel(c.estatus) }}</span>
                      </div>
                      @if (c.servicios?.length) {
                        <div class="mb-3">
                          <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Servicios</p>
                          <div class="space-y-2">
                            @for (s of c.servicios; track s) {
                              <div class="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                  <span class="text-sm font-semibold text-slate-800">{{ s.nombre || 'Servicio' }}</span>
                                  @if (s.cancelado === 'S') {
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Cancelado</span>
                                  }
                                </div>
                                <div class="text-xs font-semibold text-slate-600 flex items-center gap-3">
                                  <span>Cantidad: {{ s.cantidad || 1 }}</span>
                                  <span>Monto: {{ formatMoney(s.monto_pagado) }}</span>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }
                      @if (c.doctores?.length) {
                        <div class="mb-2">
                          <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Equipo medico</p>
                          <div class="flex flex-wrap gap-2">
                            @for (d of c.doctores; track d) {
                              <span class="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {{ d.nombre_doctor }}@if (d.especialidad) {
                                <span> - {{ d.especialidad }}</span>
                              }
                            </span>
                          }
                        </div>
                      </div>
                    }
                    @if (c.notas) {
                      <div class="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span class="font-bold">Notas:</span> {{ c.notas }}
                      </div>
                    }
                  </div>
                }
              </div>
            }
            <!-- Tab: Pagos -->
            @if (historialTab === 'pagos') {
              <div>
                @if (!historialData.pagos?.length) {
                  <div class="text-center py-8 text-slate-400 text-sm">Sin pagos registrados</div>
                }
                @for (p of historialData.pagos; track p) {
                  <div class="border-2 border-slate-200 rounded-2xl p-4 mb-3 bg-white shadow-sm">
                    <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Recibo</p>
                        <p class="text-base font-black text-slate-900">{{ p.folio_venta || ('Venta #' + p.id_venta) }}</p>
                      </div>
                      <span [class]="getPagoStatusClass(p)">{{ getPagoStatusLabel(p) }}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Fecha</p>
                        <p class="text-sm font-semibold text-slate-800">{{ formatDateTime(p.fecha_venta) }}</p>
                      </div>
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total</p>
                        <p class="text-sm font-semibold text-slate-800">{{ formatMoney(p.monto_total) }}</p>
                      </div>
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Saldo pendiente</p>
                        <p class="text-sm font-semibold" [class.text-amber-700]="hasPendingAmount(p.saldo_pendiente)" [class.text-emerald-700]="!hasPendingAmount(p.saldo_pendiente)">
                          {{ formatMoney(p.saldo_pendiente) }}
                        </p>
                      </div>
                    </div>
                    @if (p.motivo_cancelacion) {
                      <div class="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span class="font-bold">Motivo de cancelacion:</span> {{ p.motivo_cancelacion }}
                      </div>
                    }
                  </div>
                }
              </div>
            }
            <!-- Tab: Comodatos -->
            @if (historialTab === 'comodatos') {
              <div>
                @if (!historialData.comodatos?.length) {
                  <div class="text-center py-8 text-slate-400 text-sm">Sin comodatos registrados</div>
                }
                @for (cm of historialData.comodatos; track cm) {
                  <div class="border-2 border-slate-200 rounded-2xl p-4 mb-3 bg-white shadow-sm">
                    <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Equipo</p>
                        <p class="text-base font-black text-slate-900">{{ cm.nombre_equipo || cm.folio_comodato }}</p>
                        @if (cm.folio_comodato) {
                          <p class="text-xs font-semibold text-slate-500 mt-0.5">{{ cm.folio_comodato }}</p>
                        }
                      </div>
                      <span [class]="getComodatoStatusClass(cm.estatus)">{{ getComodatoStatusLabel(cm.estatus) }}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Prestamo</p>
                        <p class="text-sm font-semibold text-slate-800">{{ formatDate(cm.fecha_prestamo) }}</p>
                      </div>
                      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Devolucion</p>
                        <p class="text-sm font-semibold text-slate-800">{{ cm.fecha_devolucion ? formatDate(cm.fecha_devolucion) : 'Sin fecha de devolucion' }}</p>
                      </div>
                    </div>
                    @if (cm.monto_total !== null || cm.saldo_pendiente !== null) {
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        @if (cm.monto_total !== null && cm.monto_total !== undefined) {
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Monto total</p>
                            <p class="text-sm font-semibold text-slate-800">{{ formatMoney(cm.monto_total) }}</p>
                          </div>
                        }
                        @if (cm.saldo_pendiente !== null && cm.saldo_pendiente !== undefined) {
                          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Saldo pendiente</p>
                            <p class="text-sm font-semibold" [class.text-amber-700]="hasPendingAmount(cm.saldo_pendiente)" [class.text-emerald-700]="!hasPendingAmount(cm.saldo_pendiente)">{{ formatMoney(cm.saldo_pendiente) }}</p>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
    }
    
    <!-- ==================== MENÚ CONTEXTUAL FILA ==================== -->
    <!-- Backdrop invisible para cerrar al clic fuera -->
    @if (openActionMenu) {
      <div class="fixed inset-0 z-40" (click)="closeActionMenu()"></div>
    }
    <!-- Dropdown -->
    @if (openActionMenu && menuBeneficiario) {
      <div
        class="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 overflow-hidden"
        [style.top.px]="menuPosition.top"
        [style.left.px]="menuPosition.left"
        (click)="$event.stopPropagation()">
        <!-- Ver detalle -->
        <button (click)="verDetalleBeneficiario(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="font-medium">Ver detalle</span>
        </button>
        <!-- Editar -->
        <button (click)="editarBeneficiario(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path stroke-linecap="round" stroke-linejoin="round" d="m15 5 4 4"/>
          </svg>
          <span class="font-medium">Editar</span>
        </button>
        <!-- Historial -->
        <button (click)="verHistorialBeneficiario(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="font-medium">Historial</span>
        </button>
        <!-- Credencial -->
        <button (click)="verCredencial(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#00328b] hover:bg-blue-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-[#00328b] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/>
          </svg>
          <span class="font-medium">Credencial</span>
        </button>
        <!-- Renovar membresía -->
        <button (click)="abrirRenovarModal(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span class="font-medium">Renovar membresía</span>
        </button>
        <!-- Divider -->
        <div class="border-t border-slate-100 my-1"></div>
        <!-- Desactivar -->
        <button (click)="confirmarDesactivar(menuBeneficiario!); closeActionMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
          <span class="font-medium">Desactivar</span>
        </button>
      </div>
    }
    
    <!-- ==================== MODAL: Renovar Membresía ==================== -->
    @if (showRenovarModal && beneficiarioARenovar) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-xl font-black text-slate-900">Renovar Membresía</h2>
              <p class="text-sm text-slate-500">{{ beneficiarioARenovar.nombre }} {{ beneficiarioARenovar.apellidoPaterno }}</p>
            </div>
            <button (click)="showRenovarModal = false" class="w-9 h-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Info actual -->
          <div class="mb-5 p-4 bg-slate-50 rounded-xl space-y-1">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 font-semibold">Estado actual</span>
              <span [class]="getMembresiaBadgeClass(beneficiarioARenovar.membresiaEstatus)">{{ beneficiarioARenovar.membresiaEstatus }}</span>
            </div>
            @if (beneficiarioARenovar.fechaVencimientoMembresia) {
              <div class="flex justify-between text-sm">
                <span class="text-slate-500 font-semibold">Vencimiento actual</span>
                <span class="font-bold text-slate-700">{{ beneficiarioARenovar.fechaVencimientoMembresia | slice:0:10 }}</span>
              </div>
            }
            <div class="flex justify-between text-sm pt-1 border-t border-slate-200">
              <span class="text-slate-500 font-semibold">Nueva vigencia</span>
              <span class="font-bold text-emerald-600">1 año desde hoy</span>
            </div>
          </div>
          <!-- Monto -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Monto de la Cuota *</label>
            <input type="number" [(ngModel)]="renovarMonto" min="0" step="0.01"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-sm"
              placeholder="0.00" />
          </div>
          <!-- Exento -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Exento de Pago</label>
            <select [(ngModel)]="renovarExento" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-sm">
              <option value="N">No</option>
              <option value="S">Sí</option>
            </select>
          </div>
          <!-- Métodos de pago -->
          @if (renovarExento !== 'S') {
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-semibold text-slate-700">Métodos de Pago</label>
                <button type="button" (click)="renovarMetodosPago.push({id_metodo_pago:0, monto:0})" class="text-xs font-bold text-emerald-600 hover:text-emerald-700">+ Agregar</button>
              </div>
              <div class="space-y-2">
                @for (mp of renovarMetodosPago; track mp; let i = $index) {
                  <div class="flex items-center gap-2">
                    <select [(ngModel)]="mp.id_metodo_pago" class="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-all">
                      <option [ngValue]="0" disabled>Método...</option>
                      @for (m of renovarMetodosCatalogo; track m) {
                        <option [ngValue]="m.id">{{ m.nombre }}</option>
                      }
                    </select>
                    <input type="number" [(ngModel)]="mp.monto" min="0" step="0.01" placeholder="0.00"
                      class="w-28 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-all" />
                    @if (renovarMetodosPago.length > 1) {
                      <button type="button" (click)="renovarMetodosPago.splice(i,1)"
                        class="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
          <!-- Error -->
          @if (renovarError) {
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">{{ renovarError }}</div>
          }
          <!-- Botones -->
          <div class="flex gap-3">
            <button type="button" (click)="confirmarRenovacion()" [disabled]="renovarSubmitting"
              class="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
              {{ renovarSubmitting ? 'Renovando...' : 'Confirmar Renovación' }}
            </button>
            <button type="button" (click)="showRenovarModal = false"
              class="px-5 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Confirmar Desactivar ==================== -->
    @if (showConfirmDesactivar) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Desactivar Beneficiario</h3>
          <p class="text-sm text-slate-600 mb-6">Se desactivara al beneficiario {{ beneficiarioADesactivar?.nombre }} {{ beneficiarioADesactivar?.apellidoPaterno }}. &iquest;Continuar?</p>
          <div class="flex gap-3 justify-center">
            <button (click)="showConfirmDesactivar = false" class="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button (click)="desactivarBeneficiario()" class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Desactivar</button>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Vista previa de credencial ==================== -->
    @if (showCredencialModal && credencialBeneficiario) {
      <div class="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" (click)="showCredencialModal = false">
        <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 class="text-lg font-black text-slate-900">Vista previa de Credencial</h2>
            <div class="flex items-center gap-2">
              <button (click)="descargarCredencial(credencialBeneficiario!.folio)" class="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-[#00328b] text-white hover:bg-[#002266] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Descargar PDF
              </button>
              <button (click)="showCredencialModal = false" class="w-9 h-9 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <!-- Credential card -->
          <div class="p-6 bg-slate-100">
            <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden" style="font-size:11px; line-height:1.4">
              <!-- Card header -->
              <div class="bg-[#00328b] px-4 py-2.5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-[#00328b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#00328b" stroke="none"/>
                      <path stroke="white" stroke-width="1.5" d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-white font-black text-xs tracking-wide leading-tight">ESPINA BIFIDA</p>
                    <p class="text-blue-200 font-semibold leading-tight" style="font-size:9px">Asociacion de Nuevo Leon ABP</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-blue-200 font-semibold" style="font-size:9px">CREDENCIAL DE BENEFICIARIO</p>
                  <p class="text-white font-black text-sm">Folio: {{ credencialBeneficiario!.folio }}</p>
                </div>
              </div>
              <!-- Card body -->
              <div class="flex gap-0">
                <!-- Left: photo + basic info -->
                <div class="w-40 shrink-0 border-r border-slate-200 p-3 flex flex-col gap-2">
                  <!-- Photo placeholder -->
                  <div class="w-full aspect-[3/4] bg-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden flex flex-col items-center justify-center text-slate-300">
                    @if (credencialBeneficiario!.fotoUrl) {
                      <img
                        [src]="credencialBeneficiario!.fotoUrl"
                        [alt]="'Foto de ' + credencialBeneficiario!.nombre"
                        class="w-full h-full object-cover" />
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                      <span style="font-size:8px" class="text-slate-300 font-semibold">FOTOGRAFIA</span>
                    }
                  </div>
                  <!-- Membership badge -->
                  <div class="bg-[#00328b]/5 rounded-lg px-2 py-1.5 border border-[#00328b]/10 text-center">
                    <p class="text-[#00328b] font-black" style="font-size:9px">MEMBRESIA No.</p>
                    <p class="text-slate-800 font-bold text-xs">{{ credencialBeneficiario!.idPaciente }}</p>
                  </div>
                  <!-- Estatus -->
                  <div class="text-center">
                    <span class="inline-block px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700" style="font-size:8px">
                      {{ credencialBeneficiario!.membresiaEstatus }}
                    </span>
                  </div>
                </div>
                <!-- Center: personal + contact -->
                <div class="flex-1 p-3 space-y-2 border-r border-slate-200">
                  <!-- Name big -->
                  <div>
                    <p class="text-[#00328b] font-black" style="font-size:9px">NOMBRE</p>
                    <p class="font-bold text-slate-900 text-sm leading-tight">{{ credencialBeneficiario!.nombre }} {{ credencialBeneficiario!.apellidoPaterno }} {{ credencialBeneficiario!.apellidoMaterno }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">FECHA DE EXPEDICION</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.fechaAlta ? credencialBeneficiario!.fechaAlta.substring(0,10) : '-' }}</p>
                    </div>
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">SEXO</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.genero || '-' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[#00328b] font-black" style="font-size:9px">DIRECCION</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.direccion || '-' }}, {{ credencialBeneficiario!.colonia || '' }}</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.ciudad || '' }}{{ credencialBeneficiario!.estado ? ', ' + credencialBeneficiario!.estado : '' }}</p>
                    </div>
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">TEL. CASA</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.telefonoCasa || '-' }}</p>
                    </div>
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">CELULAR</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.telefonoCelular || '-' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[#00328b] font-black" style="font-size:9px">CORREO ELECTRONICO</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.correoElectronico || '-' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[#00328b] font-black" style="font-size:9px">NOMBRE DE PADRE/MADRE</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.nombrePadreMadre || '-' }}</p>
                    </div>
                  </div>
                </div>
                <!-- Right: medical + emergency + birth -->
                <div class="w-52 shrink-0 p-3 flex flex-col gap-2">
                  <!-- Padecimiento -->
                  <div>
                    <p class="text-[#00328b] font-black" style="font-size:9px">PADECIMIENTO</p>
                    <p class="font-semibold text-slate-800 leading-tight">{{ credencialPadecimiento }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">TIPO DE SANGRE</p>
                      <p class="font-bold text-slate-800 text-sm">{{ credencialBeneficiario!.tipoSangre || '-' }}</p>
                    </div>
                    <div>
                      <p class="text-[#00328b] font-black" style="font-size:9px">TIENE VALVULA</p>
                      <p class="font-bold text-slate-800">{{ credencialBeneficiario!.usaValvula === 'S' ? 'Si' : 'No' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[#00328b] font-black" style="font-size:9px">EN CASO DE ACCIDENTE AVISAR A</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.enEmergenciaAvisarA || '-' }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="text-[#00328b] font-black" style="font-size:9px">TELEFONO EMERGENCIA</p>
                      <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.telefonoEmergencia || '-' }}</p>
                    </div>
                  </div>
                  <!-- Divider -->
                  <div class="h-px bg-slate-100"></div>
                  <!-- Birth data -->
                  <div>
                    <p class="text-[#00328b] font-black" style="font-size:9px">DATOS DE NACIMIENTO</p>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                      <div>
                        <p class="text-slate-400 font-semibold" style="font-size:8px">Fecha</p>
                        <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.fechaNacimiento ? credencialBeneficiario!.fechaNacimiento.substring(0,10) : '-' }}</p>
                      </div>
                      <div>
                        <p class="text-slate-400 font-semibold" style="font-size:8px">Lugar Nac.</p>
                        <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.estadoNacimiento || '-' }}</p>
                      </div>
                      <div class="col-span-2">
                        <p class="text-slate-400 font-semibold" style="font-size:8px">Hospital</p>
                        <p class="font-semibold text-slate-800">{{ credencialBeneficiario!.hospitalNacimiento || '-' }}</p>
                      </div>
                    </div>
                  </div>
                  <!-- Divider -->
                  <div class="h-px bg-slate-100"></div>
                  <!-- Association footer -->
                  <div class="text-center bg-[#00328b]/5 rounded-lg p-2 border border-[#00328b]/10 mt-auto">
                    <p class="text-[#00328b] font-black leading-tight" style="font-size:8px">ASOCIACION DE ESPINA BIFIDA</p>
                    <p class="text-[#00328b] font-black leading-tight" style="font-size:8px">DE NUEVO LEON ABP</p>
                    <p class="text-slate-500 font-semibold mt-0.5" style="font-size:8px">www.espinabifida.org.mx</p>
                  </div>
                </div>
              </div>
              <!-- Card footer -->
              <div class="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
                <p class="text-slate-400 font-semibold" style="font-size:9px">Cuota: {{ credencialBeneficiario!.tipoCuota || 'No asignada' }}</p>
                <p class="text-slate-400 font-semibold" style="font-size:9px">Vigencia: {{ credencialBeneficiario!.fechaVencimientoMembresia ? credencialBeneficiario!.fechaVencimientoMembresia.substring(0,10) : 'Indefinida' }}</p>
                <p class="text-slate-400 font-semibold" style="font-size:9px">CURP: {{ credencialBeneficiario!.curp || '-' }}</p>
              </div>
            </div>
          </div>
          <!-- Footer note -->
          <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 text-center">
            <p class="text-xs text-slate-400 font-semibold">El PDF descargado es la version oficial para impresion</p>
          </div>
        </div>
      </div>
    }
    `
})
export class BeneficiariosComponent implements OnInit, OnDestroy {
  currentTab: 'activos' | 'preregistros' = 'activos';
  searchTerm = '';

  // Pagination
  pageSize = 20;
  beneficiariosPage = 1;
  preregistrosPage = 1;

  // Modal state
  showNuevoModal = false;
  showDetalleModal = false;
  showDetallePreregistroModal = false;
  showEditPreregistroModal = false;
  showAprobarModal = false;
  preregistroAProbar: Preregistro | null = null;
  aprobarCuotaSeleccionada = '';
  submittingAprobacion = false;
  beneficiarioSeleccionado: Beneficiario | null = null;
  preregistroSeleccionado: Preregistro | null = null;
  submittingNuevo = false;
  nuevoError = '';
  formDataUsaValvula = false;

  // Edit preregistro modal
  preregistroEditData: any = null;
  preregistroEditUsaValvula = false;
  editingPreregistroId: number | null = null;
  submittingPreregistroEdit = false;
  preregistroEditError = '';

  // Edit modal
  showEditModal = false;
  editFormData: any = null;
  editFormDataUsaValvula = false;
  editFolio = '';
  submittingEdit = false;
  editError = '';
  editFotoFile: File | null = null;
  editFotoPreviewUrl: string | null = null;

  // Historial modal
  showHistorialModal = false;
  historialData: any = null;
  historialLoading = false;
  historialTab: 'citas' | 'pagos' | 'comodatos' = 'citas';

  // Confirm desactivar
  showConfirmDesactivar = false;
  beneficiarioADesactivar: any = null;

  // Renovar membresía modal
  showRenovarModal = false;
  beneficiarioARenovar: Beneficiario | null = null;
  renovarMonto = 0;
  renovarExento = 'N';
  renovarMetodosPago: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  renovarMetodosCatalogo: { id: number; nombre: string }[] = [];
  renovarError = '';
  renovarSubmitting = false;

  // Alertas membresía
  membresiasProximasCount = 0;

  // Menú contextual por fila
  openActionMenu: string | null = null;
  menuPosition = { top: 0, left: 0 };
  menuBeneficiario: Beneficiario | null = null;
  beneficiariosSort: TableSortState = { key: 'folio', direction: 'asc' };
  preregistrosSort: TableSortState = { key: 'id', direction: 'asc' };
  private actionMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 208; // Tailwind w-52
  private readonly actionMenuEstimatedHeight = 332;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly onViewportGeometryChange = (): void => {
    this.repositionOpenActionMenu();
  };

  // Vista previa de credencial
  showCredencialModal = false;
  credencialBeneficiario: Beneficiario | null = null;

  // Form data for new beneficiario
  formData: any = {};
  tiposDocumentoCatalogo: any[] = [];
  nuevoBeneficiarioDocumentos: NuevoBeneficiarioDocumento[] = [{ id_tipo_documento: 0, archivo: null }];
  tiposEspinaCatalogo: any[] = [];
  formDataTiposEspina: number[] = [];
  editFormDataTiposEspina: number[] = [];

  // Select options
  estadosMexicanos = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango',
    'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
    'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatan', 'Zacatecas'
  ];

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  private avatarColors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400',
    'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400',
    'bg-cyan-400', 'bg-amber-400'
  ];

  loading = true;
  beneficiarios: Beneficiario[] = [];
  preregistros: Preregistro[] = [];
  filteredBeneficiarios: Beneficiario[] = [];
  filteredPreregistros: Preregistro[] = [];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.loadBeneficiarios();
    this.loadPreregistros();
    this.loadTiposDocumentoCatalogo();
    this.loadAlertasMembresia();
    this.resetFormData();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nuevo') {
        this.openNuevoModal();
      }
    });

    window.visualViewport?.addEventListener('resize', this.onViewportGeometryChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewportGeometryChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewportGeometryChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportGeometryChange);
  }

  private resetFormData(): void {
    this.formData = {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      genero: '',
      fecha_nacimiento: '',
      curp: '',
      nombre_padre_madre: '',
      direccion: '',
      colonia: '',
      ciudad: '',
      estado: '',
      codigo_postal: '',
      telefono_casa: '',
      telefono_celular: '',
      correo_electronico: '',
      en_emergencia_avisar_a: '',
      telefono_emergencia: '',
      tipo_sangre: '',
      usa_valvula: 'N',
      tipo_cuota: '',
      membresia_estatus: ''
    };
    this.formDataUsaValvula = false;
    this.nuevoBeneficiarioDocumentos = [{ id_tipo_documento: 0, archivo: null }];
  }

  private loadTiposDocumentoCatalogo(): void {
    this.api.getTiposDocumentoPublic().subscribe({
      next: (data) => {
        this.tiposDocumentoCatalogo = data || [];
      },
      error: (err) => {
        console.error('Error al cargar tipos de documento:', err);
      }
    });
  }

  private loadBeneficiarios(): void {
    this.loading = true;
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiarios = data.map((item: any, index: number) => ({
          idPaciente: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno,
          genero: item.genero,
          fechaNacimiento: item.fecha_nacimiento,
          curp: item.curp,
          nombrePadreMadre: item.nombre_padre_madre,
          direccion: item.direccion,
          colonia: item.colonia,
          ciudad: item.ciudad,
          estado: item.estado,
          codigoPostal: item.codigo_postal,
          telefonoCasa: item.telefono_casa,
          telefonoCelular: item.telefono_celular,
          correoElectronico: item.correo_electronico,
          enEmergenciaAvisarA: item.en_emergencia_avisar_a,
          telefonoEmergencia: item.telefono_emergencia,
          municipioNacimiento: item.municipio_nacimiento,
          estadoNacimiento: item.estado_nacimiento,
          hospitalNacimiento: item.hospital_nacimiento,
          tipoSangre: item.tipo_sangre,
          usaValvula: item.usa_valvula,
          notasAdicionales: item.notas_adicionales,
          fechaAlta: item.fecha_alta,
          membresiaEstatus: item.membresia_estatus,
          tipoCuota: item.tipo_cuota,
          activo: item.activo,
          tiposEspina: (item.tipos_espina || []).map((te: any) => ({
            idTipoEspina: te.id_tipo_espina,
            nombre: te.nombre
          })),
          fechaInicioMembresia: item.fecha_inicio_membresia || null,
          fechaVencimientoMembresia: item.fecha_vencimiento_membresia || null,
          fotoUrl: null,
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: this.avatarColors[index % this.avatarColors.length]
        } as Beneficiario));
        this.filterData();
        this.cargarFotosBeneficiarios(this.beneficiarios);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading beneficiarios:', err);
        this.loading = false;
      }
    });
  }

  private loadPreregistros(): void {
    this.api.getPreRegistros().subscribe({
      next: (data) => {
        this.preregistros = data.map((item: any, index: number) => ({
          id: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno || '',
          fechaNacimiento: item.fecha_nacimiento,
          genero: item.genero || '',
          curp: item.curp || '',
          nombrePadreMadre: item.nombre_padre_madre || '',
          direccion: item.direccion || '',
          colonia: item.colonia || '',
          ciudad: item.ciudad || '',
          estado: item.estado || '',
          codigoPostal: item.codigo_postal || '',
          telefonoCasa: item.telefono_casa || '',
          telefonoCelular: item.telefono_celular || '',
          correoElectronico: item.correo_electronico || '',
          enEmergenciaAvisarA: item.en_emergencia_avisar_a || '',
          telefonoEmergencia: item.telefono_emergencia || '',
          tipoSangre: item.tipo_sangre || '',
          usaValvula: item.usa_valvula || 'N',
          notasAdicionales: item.notas_adicionales || '',
          tipoCuota: item.tipo_cuota || '',
          fechaSolicitud: item.fecha_registro,
          estatus: item.estatus_registro,
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: this.avatarColors[index % this.avatarColors.length]
        } as Preregistro));
        this.filterData();
      },
      error: (err) => {
        console.error('Error loading preregistros:', err);
      }
    });
  }

  private getFotoTipoDocumentoId(): number {
    const tipo = this.tiposDocumentoCatalogo.find((item: any) => {
      const nombre = String(item?.nombre || '').toLowerCase();
      const descripcion = String(item?.descripcion || '').toLowerCase();
      const texto = `${nombre} ${descripcion}`;
      return texto.includes('foto') || texto.includes('fotografia') || texto.includes('imagen');
    });
    const id = Number(tipo?.id_tipo_documento || 0);
    return Number.isFinite(id) ? id : 0;
  }

  private getTipoDocumentoFotoUploadId(): number {
    const tipoFoto = this.getFotoTipoDocumentoId();
    if (tipoFoto > 0) return tipoFoto;

    const fallback = Number(this.tiposDocumentoCatalogo?.[0]?.id_tipo_documento || 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  private esFormatoImagen(formato: any): boolean {
    const valor = String(formato || '').trim().toUpperCase();
    return ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(valor);
  }

  private obtenerFechaDocumento(valor: any): number {
    if (!valor) return 0;
    const ms = new Date(valor).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  private seleccionarDocumentoFoto(documentos: any[]): any | null {
    if (!Array.isArray(documentos) || documentos.length === 0) return null;

    const imagenes = documentos.filter((doc) => this.esFormatoImagen(doc?.formato_archivo));
    if (!imagenes.length) return null;

    const fotosExplicitas = imagenes.filter((doc) => {
      const tipo = String(doc?.tipo_nombre || '').toLowerCase();
      const nombreArchivo = String(doc?.nombre_archivo || '').toLowerCase();
      return tipo.includes('foto') || tipo.includes('fotografia') || tipo.includes('imagen') || nombreArchivo.includes('foto');
    });

    const candidatas = fotosExplicitas.length ? fotosExplicitas : imagenes;
    return [...candidatas].sort(
      (a, b) => this.obtenerFechaDocumento(b?.fecha_carga) - this.obtenerFechaDocumento(a?.fecha_carga)
    )[0] || null;
  }

  private actualizarFotoEnVistas(idPaciente: number, fotoUrl: string | null): void {
    this.beneficiarios = this.beneficiarios.map((b) =>
      b.idPaciente === idPaciente ? { ...b, fotoUrl } : b
    );
    this.filteredBeneficiarios = this.filteredBeneficiarios.map((b) =>
      b.idPaciente === idPaciente ? { ...b, fotoUrl } : b
    );

    if (this.beneficiarioSeleccionado?.idPaciente === idPaciente) {
      this.beneficiarioSeleccionado = { ...this.beneficiarioSeleccionado, fotoUrl };
    }
    if (this.credencialBeneficiario?.idPaciente === idPaciente) {
      this.credencialBeneficiario = { ...this.credencialBeneficiario, fotoUrl };
    }
  }

  private cargarFotosBeneficiarios(items: Beneficiario[]): void {
    if (!items.length) return;

    const requests = items.map((beneficiario) =>
      this.api.getDocumentos(beneficiario.idPaciente).pipe(
        map((docs: any[]) => {
          const fotoDoc = this.seleccionarDocumentoFoto(docs || []);
          const fotoUrl = fotoDoc?.id_documento
            ? this.api.getDocumentoArchivoUrl(beneficiario.idPaciente, Number(fotoDoc.id_documento))
            : null;
          return { idPaciente: beneficiario.idPaciente, fotoUrl };
        }),
        catchError(() => of({ idPaciente: beneficiario.idPaciente, fotoUrl: null }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        results.forEach((item) => this.actualizarFotoEnVistas(item.idPaciente, item.fotoUrl));
      },
      error: (err) => {
        console.error('Error al cargar fotos de beneficiarios:', err);
      }
    });
  }

  // ──────────── Modal: Nuevo Beneficiario ────────────

  openNuevoModal(): void {
    this.resetFormData();
    this.nuevoError = '';
    this.formDataTiposEspina = [];
    if (this.tiposEspinaCatalogo.length === 0) {
      this.api.getTiposEspina().subscribe({
        next: (data: any[]) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {}
      });
    }
    this.showNuevoModal = true;
  }

  closeNuevoModal(): void {
    this.showNuevoModal = false;
  }

  agregarDocumentoNuevoBeneficiario(): void {
    this.nuevoBeneficiarioDocumentos.push({ id_tipo_documento: 0, archivo: null });
  }

  eliminarDocumentoNuevoBeneficiario(index: number): void {
    if (this.nuevoBeneficiarioDocumentos.length === 1) {
      this.nuevoBeneficiarioDocumentos[0] = { id_tipo_documento: 0, archivo: null };
      return;
    }
    this.nuevoBeneficiarioDocumentos.splice(index, 1);
  }

  onNuevoBeneficiarioDocSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (this.nuevoBeneficiarioDocumentos[index]) {
      this.nuevoBeneficiarioDocumentos[index].archivo = file;
    }
  }

  submitNuevoBeneficiario(): void {
    if (!this.formData.nombre || !this.formData.apellido_paterno || !this.formData.genero ||
        !this.formData.fecha_nacimiento || !this.formData.curp || !this.formData.tipo_cuota ||
        !this.formData.membresia_estatus) {
      this.nuevoError = 'Por favor completa todos los campos obligatorios marcados con *.';
      return;
    }

    this.submittingNuevo = true;
    this.nuevoError = '';

    const payload = { ...this.formData };
    payload.usa_valvula = this.formDataUsaValvula ? 'S' : 'N';
    payload.tipos_espina = this.formDataTiposEspina;

    const documentosValidos = this.nuevoBeneficiarioDocumentos
      .filter((doc) => doc.id_tipo_documento > 0 && !!doc.archivo);

    this.api.createBeneficiario(payload).subscribe({
      next: (created: any) => {
        const idPacienteCreado = created?.id_paciente;
        if (documentosValidos.length > 0 && idPacienteCreado) {
          const uploads = documentosValidos.map((doc) =>
            this.api.uploadDocumento(idPacienteCreado, doc.id_tipo_documento, doc.archivo as File)
          );

          forkJoin(uploads).subscribe({
            next: () => {
              this.finalizarAltaBeneficiario();
            },
            error: (err) => {
              console.error('Beneficiario creado, pero hubo error al subir documentos:', err);
              this.finalizarAltaBeneficiario();
              alert('El beneficiario se creo correctamente, pero algunos documentos no se pudieron subir.');
            }
          });
          return;
        }

        this.finalizarAltaBeneficiario();
      },
      error: (err) => {
        this.submittingNuevo = false;
        this.nuevoError = err?.error?.detail || 'Error al crear el beneficiario. Intenta de nuevo.';
        console.error('Error creating beneficiario:', err);
      }
    });
  }

  private finalizarAltaBeneficiario(): void {
    this.submittingNuevo = false;
    this.showNuevoModal = false;
    this.resetFormData();
    this.loadBeneficiarios();
  }

  // ──────────── Modal: Detalle Beneficiario ────────────

  verDetalleBeneficiario(b: Beneficiario): void {
    this.beneficiarioSeleccionado = b;
    this.showDetalleModal = true;
  }

  closeDetalleModal(): void {
    this.showDetalleModal = false;
    this.beneficiarioSeleccionado = null;
  }

  // ──────────── Modal: Detalle Preregistro ────────────

  verDetallePreregistro(p: Preregistro): void {
    this.preregistroSeleccionado = p;
    this.showDetallePreregistroModal = true;
  }

  closeDetallePreregistroModal(): void {
    this.showDetallePreregistroModal = false;
    this.preregistroSeleccionado = null;
  }

  editarPreregistro(p: Preregistro): void {
    this.editingPreregistroId = p.id;
    this.preregistroEditError = '';
    this.submittingPreregistroEdit = false;

    this.api.getPreRegistro(p.id).subscribe({
      next: (data: any) => {
        this.preregistroEditData = {
          nombre: data?.nombre || p.nombre,
          apellido_paterno: data?.apellido_paterno || p.apellidoPaterno,
          apellido_materno: data?.apellido_materno || p.apellidoMaterno || '',
          fecha_nacimiento: this.toInputDate(data?.fecha_nacimiento || p.fechaNacimiento),
          genero: data?.genero || '',
          curp: data?.curp || p.curp,
          estado_nacimiento: data?.estado_nacimiento || data?.estado || '',
          hospital_nacimiento: data?.hospital_nacimiento || '',
          nombre_padre_madre: data?.nombre_padre_madre || p.nombrePadreMadre || '',
          direccion: data?.direccion || '',
          colonia: data?.colonia || '',
          ciudad: data?.ciudad || '',
          estado: data?.estado || '',
          codigo_postal: data?.codigo_postal || '',
          telefono_casa: data?.telefono_casa || '',
          telefono_celular: data?.telefono_celular || '',
          correo_electronico: data?.correo_electronico || '',
          en_emergencia_avisar_a: data?.en_emergencia_avisar_a || '',
          telefono_emergencia: data?.telefono_emergencia || '',
          tipo_sangre: data?.tipo_sangre || '',
          tipo_cuota: data?.tipo_cuota || p.tipoCuota || 'CUOTA A',
          notas_adicionales: data?.notas_adicionales || '',
          paso_actual: data?.paso_actual || 5,
        };
        this.preregistroEditUsaValvula = data?.usa_valvula === 'S';
        this.showEditPreregistroModal = true;
      },
      error: (err) => {
        console.error('Error al cargar detalle de preregistro:', err);
      }
    });
  }

  guardarEdicionPreregistro(): void {
    if (!this.editingPreregistroId || !this.preregistroEditData) return;

    if (!this.preregistroEditData.nombre || !this.preregistroEditData.apellido_paterno || !this.preregistroEditData.curp) {
      this.preregistroEditError = 'Nombre, apellido paterno y CURP son obligatorios.';
      return;
    }

    this.submittingPreregistroEdit = true;
    this.preregistroEditError = '';

    const payload = {
      nombre: this.preregistroEditData.nombre,
      apellido_paterno: this.preregistroEditData.apellido_paterno,
      apellido_materno: this.preregistroEditData.apellido_materno || null,
      fecha_nacimiento: this.preregistroEditData.fecha_nacimiento || null,
      genero: this.preregistroEditData.genero || null,
      curp: this.preregistroEditData.curp,
      estado_nacimiento: this.preregistroEditData.estado_nacimiento || this.preregistroEditData.estado || null,
      hospital_nacimiento: this.preregistroEditData.hospital_nacimiento || null,
      nombre_padre_madre: this.preregistroEditData.nombre_padre_madre || null,
      direccion: this.preregistroEditData.direccion || null,
      colonia: this.preregistroEditData.colonia || null,
      ciudad: this.preregistroEditData.ciudad || null,
      estado: this.preregistroEditData.estado || null,
      codigo_postal: this.preregistroEditData.codigo_postal || null,
      telefono_casa: this.preregistroEditData.telefono_casa || null,
      telefono_celular: this.preregistroEditData.telefono_celular || null,
      correo_electronico: this.preregistroEditData.correo_electronico || null,
      en_emergencia_avisar_a: this.preregistroEditData.en_emergencia_avisar_a || null,
      telefono_emergencia: this.preregistroEditData.telefono_emergencia || null,
      tipo_sangre: this.preregistroEditData.tipo_sangre || null,
      usa_valvula: this.preregistroEditUsaValvula ? 'S' : 'N',
      tipo_cuota: this.preregistroEditData.tipo_cuota || null,
      notas_adicionales: this.preregistroEditData.notas_adicionales || null,
      paso_actual: this.preregistroEditData.paso_actual || 5,
      tipos_espina: null,
    };

    this.api.updatePreRegistro(this.editingPreregistroId, payload).subscribe({
      next: () => {
        this.submittingPreregistroEdit = false;
        this.showEditPreregistroModal = false;
        this.preregistroEditData = null;
        this.editingPreregistroId = null;
        this.loadPreregistros();
      },
      error: (err) => {
        this.submittingPreregistroEdit = false;
        this.preregistroEditError = err?.error?.detail || 'Error al actualizar pre-registro.';
        console.error('Error al actualizar pre-registro:', err);
      }
    });
  }

  private toInputDate(value: string | null | undefined): string {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value;
  }

  // ──────────── Exportar Excel (RF-RB-07) ────────────

  exportarCSV(): void {
    const filters: any = {};
    if (this.searchTerm) filters.busqueda = this.searchTerm;
    this.api.exportarBeneficiariosExcel(filters).subscribe({
      next: (blob) => this.descargarArchivo(blob, `beneficiarios_${new Date().toISOString().slice(0, 10)}.xlsx`),
      error: () => alert('Error al exportar'),
    });
  }

  // ──────────── Credencial (RF-RB-06) ────────────

  get credencialPadecimiento(): string {
    const tipos = this.credencialBeneficiario?.tiposEspina;
    if (!tipos || tipos.length === 0) return '-';
    return tipos.map(t => t.nombre).join(', ');
  }

  verCredencial(b: Beneficiario): void {
    this.credencialBeneficiario = b;
    this.showCredencialModal = true;
  }

  descargarCredencial(folio: string): void {
    this.api.exportarCredencialPdf(folio).subscribe({
      next: (blob) => this.descargarArchivo(blob, `credencial_${folio}.pdf`),
      error: () => alert('Error al generar credencial'),
    });
  }

  // ──────────── Descargar expediente PDF (RF-ER-06) ────────────

  descargarExpediente(folio: string): void {
    this.api.exportarBeneficiarioPdf(folio).subscribe({
      next: (blob) => this.descargarArchivo(blob, `expediente_${folio}.pdf`),
      error: () => alert('Error al generar expediente'),
    });
  }

  private descargarArchivo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ──────────── Pagination ────────────

  get beneficiariosStart(): number {
    return (this.beneficiariosPage - 1) * this.pageSize;
  }

  get beneficiariosEnd(): number {
    return Math.min(this.beneficiariosStart + this.pageSize, this.filteredBeneficiarios.length);
  }

  get beneficiariosTotalPages(): number {
    return Math.ceil(this.filteredBeneficiarios.length / this.pageSize) || 1;
  }

  get paginatedBeneficiarios(): Beneficiario[] {
    const sorted = this.sortRows(
      this.filteredBeneficiarios,
      this.beneficiariosSort,
      (b, key) => this.getBeneficiarioSortValue(b, key),
    );
    return sorted.slice(this.beneficiariosStart, this.beneficiariosEnd);
  }

  get preregistrosStart(): number {
    return (this.preregistrosPage - 1) * this.pageSize;
  }

  get preregistrosEnd(): number {
    return Math.min(this.preregistrosStart + this.pageSize, this.filteredPreregistros.length);
  }

  get preregistrosTotalPages(): number {
    return Math.ceil(this.filteredPreregistros.length / this.pageSize) || 1;
  }

  get paginatedPreregistros(): Preregistro[] {
    const sorted = this.sortRows(
      this.filteredPreregistros,
      this.preregistrosSort,
      (p, key) => this.getPreregistroSortValue(p, key),
    );
    return sorted.slice(this.preregistrosStart, this.preregistrosEnd);
  }

  filterData(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredBeneficiarios = this.beneficiarios.filter(b =>
      b.nombre.toLowerCase().includes(term) ||
      b.apellidoPaterno.toLowerCase().includes(term) ||
      b.apellidoMaterno.toLowerCase().includes(term) ||
      b.folio.toLowerCase().includes(term) ||
      b.curp.toLowerCase().includes(term) ||
      b.membresiaEstatus.toLowerCase().includes(term) ||
      b.tipoCuota.toLowerCase().includes(term)
    );
    this.filteredPreregistros = this.preregistros.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.apellidoPaterno.toLowerCase().includes(term) ||
      p.apellidoMaterno.toLowerCase().includes(term) ||
      p.id.toString().includes(term) ||
      p.curp.toLowerCase().includes(term) ||
      p.tipoCuota.toLowerCase().includes(term)
    );
    this.beneficiariosPage = 1;
    this.preregistrosPage = 1;
  }

  changeBeneficiariosPage(page: number): void {
    this.beneficiariosPage = page;
  }

  changePreregistrosPage(page: number): void {
    this.preregistrosPage = page;
  }

  toggleBeneficiariosSort(key: string): void {
    if (this.beneficiariosSort.key === key) {
      this.beneficiariosSort.direction = this.beneficiariosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.beneficiariosSort = { key, direction: 'asc' };
    }
    this.beneficiariosPage = 1;
  }

  togglePreregistrosSort(key: string): void {
    if (this.preregistrosSort.key === key) {
      this.preregistrosSort.direction = this.preregistrosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.preregistrosSort = { key, direction: 'asc' };
    }
    this.preregistrosPage = 1;
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  private sortRows<T>(rows: T[], sort: TableSortState, valueGetter: (row: T, key: string) => unknown): T[] {
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = valueGetter(a, sort.key);
      const right = valueGetter(b, sort.key);

      const leftComparable = this.toComparableValue(left);
      const rightComparable = this.toComparableValue(right);

      if (leftComparable < rightComparable) return -1 * direction;
      if (leftComparable > rightComparable) return 1 * direction;
      return 0;
    });
  }

  private toComparableValue(value: unknown): number | string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();

    const text = String(value).trim();
    const maybeDate = Date.parse(text);
    if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) {
      return maybeDate;
    }

    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text !== '') {
      return maybeNumber;
    }

    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private getBeneficiarioSortValue(b: Beneficiario, key: string): unknown {
    switch (key) {
      case 'folio':
        return b.folio;
      case 'nombre':
        return `${b.nombre} ${b.apellidoPaterno} ${b.apellidoMaterno}`;
      case 'tipoEspina':
        return (b.tiposEspina || []).map((te) => te.nombre).join(', ');
      case 'cuota':
        return this.cuotaShortLabel(b.tipoCuota);
      case 'membresia':
        return `${b.membresiaEstatus} ${b.fechaVencimientoMembresia || ''}`;
      case 'fechaAlta':
        return b.fechaAlta;
      default:
        return b.folio;
    }
  }

  private getPreregistroSortValue(p: Preregistro, key: string): unknown {
    switch (key) {
      case 'id':
        return p.id;
      case 'nombre':
        return `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`;
      case 'estatus':
        return p.estatus;
      case 'cuota':
        return this.cuotaShortLabel(p.tipoCuota);
      case 'fechaSolicitud':
        return p.fechaSolicitud;
      default:
        return p.id;
    }
  }

  cuotaShortLabel(cuota: string): string {
    return (cuota || '').replace(/cuota\s*/i, '').trim() || cuota;
  }

  getCuotaBadgeClass(cuota: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const letter = this.cuotaShortLabel(cuota).toUpperCase();
    if (letter === 'A') return `${base} bg-emerald-100 text-emerald-800`;
    if (letter === 'B') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  getMembresiaBadgeClass(membresia: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (membresia === 'ACTIVO') return `${base} bg-green-100 text-green-800`;
    if (membresia === 'VENCIDO') return `${base} bg-red-100 text-red-800`;
    if (membresia === 'SUSPENDIDO') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);
    if (Number.isNaN(amount)) return '$0.00';
    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  hasPendingAmount(value: number | string | null | undefined): boolean {
    const amount = Number(value ?? 0);
    if (Number.isNaN(amount)) return false;
    return amount > 0;
  }

  getCitaStatusLabel(status: string | null | undefined): string {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'PROGRAMADA') return 'Programada';
    if (normalized === 'COMPLETADA') return 'Completada';
    if (normalized === 'CANCELADA') return 'Cancelada';
    return normalized || 'Sin estatus';
  }

  getCitaStatusClass(status: string | null | undefined): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'COMPLETADA') return `${base} bg-emerald-100 text-emerald-700`;
    if (normalized === 'CANCELADA') return `${base} bg-red-100 text-red-700`;
    if (normalized === 'PROGRAMADA') return `${base} bg-blue-100 text-blue-700`;
    return `${base} bg-slate-100 text-slate-700`;
  }

  getPagoStatusLabel(pago: any): string {
    if (pago?.cancelada === 'S') return 'Cancelado';
    if (Number(pago?.saldo_pendiente || 0) > 0) return 'Con saldo';
    return 'Pagado';
  }

  getPagoStatusClass(pago: any): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (pago?.cancelada === 'S') return `${base} bg-red-100 text-red-700`;
    if (Number(pago?.saldo_pendiente || 0) > 0) return `${base} bg-amber-100 text-amber-700`;
    return `${base} bg-emerald-100 text-emerald-700`;
  }

  getComodatoStatusLabel(status: string | null | undefined): string {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ACTIVO') return 'Activo';
    if (normalized === 'DEVUELTO') return 'Devuelto';
    if (normalized === 'VENCIDO') return 'Vencido';
    return normalized || 'Sin estatus';
  }

  getComodatoStatusClass(status: string | null | undefined): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'DEVUELTO') return `${base} bg-emerald-100 text-emerald-700`;
    if (normalized === 'VENCIDO') return `${base} bg-red-100 text-red-700`;
    if (normalized === 'ACTIVO') return `${base} bg-amber-100 text-amber-700`;
    return `${base} bg-slate-100 text-slate-700`;
  }

  abrirModalAprobacion(p: Preregistro): void {
    this.preregistroAProbar = p;
    this.aprobarCuotaSeleccionada = p.tipoCuota || '';
    this.submittingAprobacion = false;
    this.showAprobarModal = true;
  }

  confirmarAprobacion(): void {
    if (!this.preregistroAProbar || !this.aprobarCuotaSeleccionada) return;
    this.submittingAprobacion = true;
    this.api.aprobarPreRegistro(this.preregistroAProbar.id, this.aprobarCuotaSeleccionada).subscribe({
      next: () => {
        this.showAprobarModal = false;
        this.preregistros = this.preregistros.filter(item => item.id !== this.preregistroAProbar!.id);
        this.preregistroAProbar = null;
        this.filterData();
        this.loadBeneficiarios();
      },
      error: (err) => {
        console.error('Error al aprobar:', err);
        this.submittingAprobacion = false;
      }
    });
  }

  aprobarPreregistro(p: Preregistro): void {
    this.abrirModalAprobacion(p);
  }

  rechazarPreregistro(p: Preregistro): void {
    this.api.rechazarPreRegistro(p.id).subscribe({
      next: () => {
        this.preregistros = this.preregistros.filter(item => item.id !== p.id);
        this.filterData();
      },
      error: (err) => console.error('Error al rechazar:', err)
    });
  }

  // ──────────── Historial Beneficiario ────────────

  verHistorialBeneficiario(b: Beneficiario): void {
    this.historialData = null;
    this.historialLoading = true;
    this.historialTab = 'citas';
    this.showHistorialModal = true;
    this.api.getBeneficiarioHistorial(b.folio).subscribe({
      next: (data) => {
        this.historialData = data;
        this.historialLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.historialLoading = false;
        this.historialData = { nombre: b.nombre + ' ' + b.apellidoPaterno, citas: [], pagos: [], comodatos: [] };
      },
    });
  }

  // ──────────── Editar Beneficiario ────────────

  editarBeneficiario(b: Beneficiario): void {
    this.editFolio = b.folio;
    this.editFormData = {
      nombre: b.nombre,
      apellido_paterno: b.apellidoPaterno,
      apellido_materno: b.apellidoMaterno || '',
      genero: b.genero,
      fecha_nacimiento: b.fechaNacimiento ? b.fechaNacimiento.split('T')[0] : '',
      curp: b.curp,
      nombre_padre_madre: b.nombrePadreMadre || '',
      direccion: b.direccion || '',
      colonia: b.colonia || '',
      ciudad: b.ciudad || '',
      estado: b.estado || '',
      codigo_postal: b.codigoPostal || '',
      telefono_casa: b.telefonoCasa || '',
      telefono_celular: b.telefonoCelular || '',
      correo_electronico: b.correoElectronico || '',
      en_emergencia_avisar_a: b.enEmergenciaAvisarA || '',
      telefono_emergencia: b.telefonoEmergencia || '',
      tipo_sangre: b.tipoSangre || '',
      notas_adicionales: b.notasAdicionales || '',
      membresia_estatus: b.membresiaEstatus || 'ACTIVO',
      tipo_cuota: b.tipoCuota || 'CUOTA A',
    };
    this.editFormDataUsaValvula = b.usaValvula === 'S';
    this.editFormDataTiposEspina = (b.tiposEspina || []).map((te: any) => te.idTipoEspina);
    this.editFotoFile = null;
    this.editFotoPreviewUrl = b.fotoUrl || null;
    this.editError = '';
    if (this.tiposDocumentoCatalogo.length === 0) {
      this.loadTiposDocumentoCatalogo();
    }
    if (this.tiposEspinaCatalogo.length === 0) {
      this.api.getTiposEspina().subscribe({
        next: (data: any[]) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {}
      });
    }
    this.showEditModal = true;
  }

  onFotoBeneficiarioSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.editError = 'Selecciona un archivo de imagen valido.';
      input.value = '';
      return;
    }

    this.editError = '';
    this.editFotoFile = file;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.editFotoPreviewUrl);
    }
    this.editFotoPreviewUrl = URL.createObjectURL(file);
  }

  private finalizarEdicionBeneficiario(): void {
    this.submittingEdit = false;
    this.showEditModal = false;
    this.editFotoFile = null;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.editFotoPreviewUrl);
    }
    this.editFotoPreviewUrl = null;
    this.loadBeneficiarios();
  }

  guardarEdicionBeneficiario(): void {
    if (!this.editFormData.nombre || !this.editFormData.apellido_paterno || !this.editFormData.genero ||
        !this.editFormData.fecha_nacimiento || !this.editFormData.curp) {
      this.editError = 'Por favor completa todos los campos obligatorios.';
      return;
    }

    const beneficiario = this.beneficiarios.find((item) => item.folio === this.editFolio);
    if (!beneficiario) {
      this.editError = 'No se encontro el beneficiario a actualizar.';
      return;
    }

    this.submittingEdit = true;
    this.editError = '';

    const payload = { ...this.editFormData };
    payload.usa_valvula = this.editFormDataUsaValvula ? 'S' : 'N';
    payload.tipos_espina = this.editFormDataTiposEspina;

    this.api.updateBeneficiario(this.editFolio, payload).subscribe({
      next: () => {
        if (!this.editFotoFile) {
          this.finalizarEdicionBeneficiario();
          return;
        }

        const tipoDocFoto = this.getTipoDocumentoFotoUploadId();
        if (!tipoDocFoto) {
          this.submittingEdit = false;
          this.editError = 'No se pudo preparar la carga de la foto. Recarga la página e intenta nuevamente.';
          return;
        }

        this.api.uploadDocumento(beneficiario.idPaciente, tipoDocFoto, this.editFotoFile).subscribe({
          next: (resp: any) => {
            const idDocumento = Number(resp?.id_documento || 0);
            if (idDocumento > 0) {
              this.actualizarFotoEnVistas(
                beneficiario.idPaciente,
                this.api.getDocumentoArchivoUrl(beneficiario.idPaciente, idDocumento)
              );
            }
            this.finalizarEdicionBeneficiario();
          },
          error: (err) => {
            this.submittingEdit = false;
            this.editError = err?.error?.detail || 'Los datos se guardaron, pero no se pudo cargar la foto.';
            console.error('Error uploading beneficiario photo:', err);
            this.loadBeneficiarios();
          }
        });
      },
      error: (err) => {
        this.submittingEdit = false;
        this.editError = err?.error?.detail || 'Error al actualizar el beneficiario.';
        console.error('Error updating beneficiario:', err);
      }
    });
  }

  // ──────────── Desactivar Beneficiario ────────────

  confirmarDesactivar(b: Beneficiario): void {
    this.beneficiarioADesactivar = b;
    this.showConfirmDesactivar = true;
  }

  desactivarBeneficiario(): void {
    if (!this.beneficiarioADesactivar) return;
    this.api.deleteBeneficiario(this.beneficiarioADesactivar.folio).subscribe({
      next: () => {
        this.showConfirmDesactivar = false;
        this.beneficiarioADesactivar = null;
        this.loadBeneficiarios();
      },
      error: (err) => {
        console.error('Error al desactivar beneficiario:', err);
        this.showConfirmDesactivar = false;
      }
    });
  }

  // ──────────── Membresía ────────────

  private loadAlertasMembresia(): void {
    this.api.getMembresiasProximasAVencer(30).subscribe({
      next: (data: any[]) => { this.membresiasProximasCount = data.length; },
      error: () => { this.membresiasProximasCount = 0; }
    });
  }

  getDiasParaVencer(b: Beneficiario): number {
    if (!b.fechaVencimientoMembresia) return 999;
    const venc = new Date(b.fechaVencimientoMembresia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  getMembresiaVencimientoClass(b: Beneficiario): string {
    if (b.membresiaEstatus === 'VENCIDO') return 'text-red-600';
    const dias = this.getDiasParaVencer(b);
    if (dias <= 30) return 'text-amber-600';
    return 'text-slate-400';
  }

  abrirRenovarModal(b: Beneficiario): void {
    this.beneficiarioARenovar = b;
    this.renovarMonto = 0;
    this.renovarExento = 'N';
    this.renovarMetodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    this.renovarError = '';
    this.renovarSubmitting = false;
    if (this.renovarMetodosCatalogo.length === 0) {
      this.api.getMetodosPago().subscribe({
        next: (data: any[]) => {
          this.renovarMetodosCatalogo = data.map((m: any) => ({ id: m.id_metodo_pago || m.id, nombre: m.nombre }));
        },
        error: () => {}
      });
    }
    this.showRenovarModal = true;
  }

  confirmarRenovacion(): void {
    if (!this.beneficiarioARenovar) return;
    if (!this.renovarMonto || this.renovarMonto <= 0) {
      this.renovarError = 'El monto debe ser mayor a 0.';
      return;
    }
    const metodosValidos = this.renovarMetodosPago.filter(m => m.id_metodo_pago > 0 && m.monto > 0);
    if (this.renovarExento !== 'S' && metodosValidos.length === 0) {
      this.renovarError = 'Agrega al menos un método de pago.';
      return;
    }

    this.renovarSubmitting = true;
    this.renovarError = '';
    const payload = {
      monto_total: this.renovarMonto,
      exento_pago: this.renovarExento,
      metodos_pago: this.renovarExento === 'S' ? [] : metodosValidos,
    };
    this.api.renovarMembresia(this.beneficiarioARenovar.folio, payload).subscribe({
      next: (res: any) => {
        this.renovarSubmitting = false;
        this.showRenovarModal = false;
        this.beneficiarioARenovar = null;
        this.loadBeneficiarios();
        this.loadAlertasMembresia();
        if (res?.folio_venta) {
          alert(`Membresía renovada. Cobro generado: ${res.folio_venta}`);
        }
      },
      error: (err: any) => {
        this.renovarSubmitting = false;
        this.renovarError = err?.error?.detail || 'Error al renovar la membresía.';
      }
    });
  }

  // ──────────── Menú contextual ────────────

  private getActionMenuPosition(triggerRect: DOMRect): { top: number; left: number } {
    const viewportPadding = this.actionMenuViewportPadding;
    const preferredTop = triggerRect.bottom + this.actionMenuGap;
    const maxTop = Math.max(viewportPadding, window.innerHeight - this.actionMenuEstimatedHeight - viewportPadding);

    // Mantener el menú lo más abajo posible dentro del viewport para evitar que se vea "demasiado arriba".
    let top = Math.min(preferredTop, maxTop);
    top = Math.max(viewportPadding, top);

    const preferredLeft = triggerRect.right - this.actionMenuWidth;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - this.actionMenuWidth - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);

    return { top, left };
  }

  private repositionOpenActionMenu(): void {
    if (!this.openActionMenu || !this.actionMenuTriggerElement) {
      return;
    }

    if (!document.body.contains(this.actionMenuTriggerElement)) {
      this.closeActionMenu();
      return;
    }

    this.menuPosition = this.getActionMenuPosition(this.actionMenuTriggerElement.getBoundingClientRect());
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.repositionOpenActionMenu();
  }

  toggleActionMenu(b: Beneficiario, event: MouseEvent): void {
    if (this.openActionMenu === b.folio) {
      this.closeActionMenu();
      return;
    }
    this.actionMenuTriggerElement = event.currentTarget as HTMLElement;
    const rect = this.actionMenuTriggerElement.getBoundingClientRect();
    this.menuPosition = this.getActionMenuPosition(rect);
    this.openActionMenu = b.folio;
    this.menuBeneficiario = b;
    event.stopPropagation();
  }

  closeActionMenu(): void {
    this.openActionMenu = null;
    this.menuBeneficiario = null;
    this.actionMenuTriggerElement = null;
  }

  // ──────────── Tipos Espina helpers ────────────

  isNuevoEspinaSelected(id: number): boolean {
    return this.formDataTiposEspina.includes(id);
  }

  toggleNuevoEspina(id: number): void {
    const idx = this.formDataTiposEspina.indexOf(id);
    if (idx >= 0) this.formDataTiposEspina.splice(idx, 1);
    else this.formDataTiposEspina.push(id);
  }

  isEditEspinaSelected(id: number): boolean {
    return this.editFormDataTiposEspina.includes(id);
  }

  toggleEditEspina(id: number): void {
    const idx = this.editFormDataTiposEspina.indexOf(id);
    if (idx >= 0) this.editFormDataTiposEspina.splice(idx, 1);
    else this.editFormDataTiposEspina.push(id);
  }
}
