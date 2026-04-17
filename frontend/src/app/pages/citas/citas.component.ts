import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar></app-navbar>
    
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
    
          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-black text-slate-900 tracking-tight">Hoja de Nuevos - Agenda de Citas</h1>
              <p class="text-slate-600 font-semibold">Programaci&oacute;n y gesti&oacute;n de citas m&eacute;dicas</p>
            </div>
          </div>
    
          <!-- Tabs -->
          <div class="flex gap-2 border-b border-slate-200">
            <button
              (click)="activeTab = 'citas'"
              class="px-4 py-2 text-sm font-semibold transition-colors"
              [ngClass]="activeTab === 'citas' ? 'text-[#00328b] border-b-2 border-[#00328b]' : 'text-slate-600 hover:text-slate-800'"
              >
              Agenda de Citas
            </button>
            <button
              (click)="activeTab = 'medicos'"
              class="px-4 py-2 text-sm font-semibold transition-colors"
              [ngClass]="activeTab === 'medicos' ? 'text-[#00328b] border-b-2 border-[#00328b]' : 'text-slate-600 hover:text-slate-800'"
              >
              M&eacute;dicos
            </button>
          </div>
    
          <!-- Tab: Agenda de Citas -->
          @if (activeTab === 'citas') {
            <div class="bg-white rounded-xl shadow-sm border border-slate-200">
              <!-- Card Header -->
              <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 class="text-lg font-bold text-slate-900 tracking-wide">CITAS</h2>
                <button (click)="abrirNuevaCita()" class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/>
                    <line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Nueva Cita
                </button>
              </div>
              <!-- Search + Filters -->
              <div class="px-6 py-4 space-y-4">
                <!-- Search -->
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre de paciente..."
                    [(ngModel)]="searchCitas"
                    (input)="filtrarCitas()"
                    class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                    />
                </div>
                <!-- Date filter + Estado filters -->
                <div class="flex items-center gap-4 flex-wrap">
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-semibold text-slate-500">Fecha:</label>
                    <button (click)="filtroFecha = todayStr; filtrarCitas()"
                      class="px-3 py-2 text-xs font-semibold rounded-lg transition-all"
                      [ngClass]="filtroFecha === todayStr ? 'bg-[#00328b] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'">
                      Hoy
                    </button>
                    <button (click)="filtroFecha = ''; filtrarCitas()"
                      class="px-3 py-2 text-xs font-semibold rounded-lg transition-all"
                      [ngClass]="!filtroFecha ? 'bg-[#00328b] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'">
                      Todas
                    </button>
                    <input
                      type="date"
                      [(ngModel)]="filtroFecha"
                      (change)="filtrarCitas()"
                      class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                      />
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (estado of estadoFilters; track estado) {
                      <button
                        (click)="filtroEstado = estado; filtrarCitas()"
                        class="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                        [ngClass]="filtroEstado === estado ? 'bg-[#00328b] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                        >
                        {{ estado }}
                      </button>
                    }
                  </div>
                </div>
                <!-- Tipo consulta filters -->
                <div class="flex flex-wrap gap-2">
                  @for (tipo of tipoFilters; track tipo) {
                    <button
                      (click)="filtroTipo = tipo; filtrarCitas()"
                      class="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                      [ngClass]="filtroTipo === tipo ? 'bg-[#f3ad1c] text-slate-900 shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                      >
                      {{ tipo }}
                    </button>
                  }
                </div>
              </div>
              <!-- Loading Skeleton -->
              @if (loading) {
                <div class="p-6">
                  <div class="animate-pulse space-y-4">
                    @for (_ of [1,2,3,4,5]; track _) {
                      <div class="flex items-center gap-4 py-3">
                        <div class="w-10 h-10 bg-slate-200 rounded-full"></div>
                        <div class="flex-1 space-y-2">
                          <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                          <div class="h-3 bg-slate-100 rounded w-1/4"></div>
                        </div>
                        <div class="h-6 bg-slate-200 rounded-full w-20"></div>
                      </div>
                    }
                  </div>
                </div>
              }
              <!-- Table -->
              @if (!loading) {
                <div>
                  <table class="w-full text-sm">
                    <thead class="sticky top-0 z-10 shadow-sm">
                      <tr class="border-t border-slate-200 bg-slate-50">
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <button type="button" (click)="toggleCitasSort('fechaHora')" class="flex items-center gap-1.5 hover:text-slate-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                              <line x1="16" x2="16" y1="2" y2="6"/>
                              <line x1="8" x2="8" y1="2" y2="6"/>
                              <line x1="3" x2="21" y1="10" y2="10"/>
                            </svg>
                            <span>Fecha / Hora</span>
                            <span class="text-[10px] font-black leading-none">{{ getSortIndicator(citasSort, 'fechaHora') }}</span>
                          </button>
                        </th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <button type="button" (click)="toggleCitasSort('paciente')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            <span>Paciente</span>
                            <span class="text-[10px] font-black leading-none">{{ getSortIndicator(citasSort, 'paciente') }}</span>
                          </button>
                        </th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <button type="button" (click)="toggleCitasSort('tipoConsulta')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            <span>Tipo de Consulta</span>
                            <span class="text-[10px] font-black leading-none">{{ getSortIndicator(citasSort, 'tipoConsulta') }}</span>
                          </button>
                        </th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <button type="button" (click)="toggleCitasSort('estado')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            <span>Estado</span>
                            <span class="text-[10px] font-black leading-none">{{ getSortIndicator(citasSort, 'estado') }}</span>
                          </button>
                        </th>
                        <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (cita of citasFiltradas; track cita) {
                        <tr class="group hover:bg-slate-50 transition-colors">
                          <td class="px-6 py-4 font-medium text-slate-900">
                            <div>{{ getFecha(cita.fechaHora) }}</div>
                            <div class="text-xs text-slate-500">{{ getHora(cita.fechaHora) }}</div>
                          </td>
                          <td class="px-6 py-4 text-slate-700">{{ cita.nombrePaciente }}</td>
                          <td class="px-6 py-4 text-slate-700">{{ cita.servicios[0]?.nombre || 'N/A' }}</td>
                          <td class="px-6 py-4">
                            <span
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                              [ngClass]="getEstadoBadgeClass(cita.estatus)"
                              >
                              {{ cita.estatus }}
                            </span>
                          </td>
                          <td class="px-6 py-4">
                            <button (click)="toggleCitaMenu(cita, $event)"
                              class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                        [ngClass]="openCitaMenu === cita.idCita
                          ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600 hover:bg-slate-50'">
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      }
                      @if (citasFiltradas.length === 0) {
                        <tr>
                          <td colspan="5" class="px-6 py-12 text-center text-slate-400 text-sm">
                            No se encontraron citas con los filtros seleccionados.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
    
          <!-- Tab: Medicos -->
          @if (activeTab === 'medicos') {
            <div class="bg-white rounded-xl shadow-sm border border-slate-200">
              <!-- Card Header -->
              <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 class="text-lg font-bold text-slate-900 tracking-wide">M&Eacute;DICOS</h2>
                <button (click)="abrirNuevoMedico()" class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/>
                    <line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Agregar M&eacute;dico
                </button>
              </div>
              <!-- Search -->
              <div class="px-6 py-4">
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar m&eacute;dico por nombre o especialidad..."
                    [(ngModel)]="searchMedicos"
                    (input)="filtrarMedicos()"
                    class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                    />
                </div>
              </div>
              <!-- Table -->
              <div>
                <table class="w-full text-sm">
                  <thead class="sticky top-0 z-10 shadow-sm">
                    <tr class="border-t border-slate-200 bg-slate-50">
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button type="button" (click)="toggleMedicosSort('nombre')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                          <span>Nombre</span>
                          <span class="text-[10px] font-black leading-none">{{ getSortIndicator(medicosSort, 'nombre') }}</span>
                        </button>
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button type="button" (click)="toggleMedicosSort('especialidad')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                          <span>Especialidad</span>
                          <span class="text-[10px] font-black leading-none">{{ getSortIndicator(medicosSort, 'especialidad') }}</span>
                        </button>
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button type="button" (click)="toggleMedicosSort('contacto')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                          <span>Contacto</span>
                          <span class="text-[10px] font-black leading-none">{{ getSortIndicator(medicosSort, 'contacto') }}</span>
                        </button>
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button type="button" (click)="toggleMedicosSort('servicios')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                          <span>Servicios</span>
                          <span class="text-[10px] font-black leading-none">{{ getSortIndicator(medicosSort, 'servicios') }}</span>
                        </button>
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <button type="button" (click)="toggleMedicosSort('estado')" class="flex items-center gap-1 hover:text-slate-700 transition-colors">
                          <span>Estado</span>
                          <span class="text-[10px] font-black leading-none">{{ getSortIndicator(medicosSort, 'estado') }}</span>
                        </button>
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (medico of medicosFiltrados; track medico) {
                      <tr class="group hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-xs font-bold">
                              {{ medico.iniciales }}
                            </div>
                            <span class="font-medium text-slate-900">Dr(a). {{ medico.nombre }} {{ medico.apellidoPaterno }}</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            {{ medico.especialidad }}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex flex-col gap-0.5">
                            <span class="text-slate-700 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              {{ medico.telefono }}
                            </span>
                            <span class="text-slate-500 text-xs flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2"/>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                              </svg>
                              {{ medico.correo }}
                            </span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex flex-wrap gap-1">
                            @for (servicio of medico.servicios; track servicio) {
                              <span
                                class="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded border border-amber-200"
                                >
                                {{ servicio.nombre }}
                              </span>
                            }
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                            [ngClass]="medico.activo === 'S' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'"
                            >
                            {{ medico.activo === 'S' ? 'Activo' : 'Inactivo' }}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <button (click)="toggleMedicoMenu(medico, $event)"
                            class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                        [ngClass]="openMedicoMenu === medico.idDoctor
                          ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600 hover:bg-slate-50'">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                    @if (medicosFiltrados.length === 0) {
                      <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
                          No se encontraron m&eacute;dicos con la b&uacute;squeda actual.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
    
        </div>
      </main>
    
      <app-footer></app-footer>
    </div>
    
    <!-- ==================== MENÚ ⋮ CITAS ==================== -->
    @if (openCitaMenu !== null) {
      <div class="fixed inset-0 z-40" (click)="closeCitaMenu()"></div>
    }
    @if (openCitaMenu !== null && menuCita) {
      <div
        class="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 w-48 overflow-hidden"
        [style.top.px]="menuCitaPosition.top"
        [style.left.px]="menuCitaPosition.left"
        (click)="$event.stopPropagation()">
        <button (click)="verDetalleCita(menuCita); closeCitaMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="font-medium">Ver detalle</span>
        </button>
        <button (click)="editarCita(menuCita); closeCitaMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path stroke-linecap="round" stroke-linejoin="round" d="m15 5 4 4"/>
          </svg>
          <span class="font-medium">Editar</span>
        </button>
        @if (menuCita.estatus !== 'COMPLETADA') {
          <button (click)="completarCitaInline(menuCita); closeCitaMenu()"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="font-medium">Marcar completada</span>
          </button>
        }
        @if (menuCita.estatus !== 'CANCELADA') {
          <button (click)="cancelarCitaInline(menuCita); closeCitaMenu()"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="font-medium">Cancelar cita</span>
          </button>
        }
        <button (click)="descargarComprobante(menuCita); closeCitaMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span class="font-medium">Comprobante PDF</span>
        </button>
        <div class="h-px bg-slate-100 my-1"></div>
        <button (click)="confirmarEliminarCita(menuCita); closeCitaMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          <span class="font-medium">Eliminar</span>
        </button>
      </div>
    }
    
    <!-- ==================== MENÚ ⋮ MÉDICOS ==================== -->
    @if (openMedicoMenu !== null) {
      <div class="fixed inset-0 z-40" (click)="closeMedicoMenu()"></div>
    }
    @if (openMedicoMenu !== null && menuMedico) {
      <div
        class="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 w-48 overflow-hidden"
        [style.top.px]="menuMedicoPosition.top"
        [style.left.px]="menuMedicoPosition.left"
        (click)="$event.stopPropagation()">
        <button (click)="verDetalleMedico(menuMedico); closeMedicoMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="font-medium">Ver detalle</span>
        </button>
        <button (click)="editarMedico(menuMedico); closeMedicoMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path stroke-linecap="round" stroke-linejoin="round" d="m15 5 4 4"/>
          </svg>
          <span class="font-medium">Editar</span>
        </button>
        <button (click)="abrirDisponibilidad(menuMedico); closeMedicoMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span class="font-medium">Disponibilidad</span>
        </button>
        <div class="h-px bg-slate-100 my-1"></div>
        <button (click)="toggleActivoMedico(menuMedico); closeMedicoMenu()"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
          [ngClass]="menuMedico.activo === 'S' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" [ngClass]="menuMedico.activo === 'S' ? 'text-red-500' : 'text-emerald-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
          <span class="font-medium">{{ menuMedico.activo === 'S' ? 'Desactivar' : 'Activar' }}</span>
        </button>
      </div>
    }
    
    <!-- ==================== MODAL: Nueva Cita ==================== -->
    @if (showNuevaCitaModal) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showNuevaCitaModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Nueva Cita</h2>
            <button (click)="showNuevaCitaModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarCita()" class="space-y-5">
            <!-- Paciente -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Paciente</label>
              <input
                type="text"
                placeholder="Buscar paciente por folio o nombre..."
                [(ngModel)]="busquedaPaciente"
                (input)="filtrarBeneficiarios()"
                (focus)="showPacienteDropdown = true"
                name="busquedaPaciente"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
                autocomplete="off"
                />
              @if (showPacienteDropdown && beneficiariosFiltrados.length > 0) {
                <div class="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto z-10 relative">
                  @for (b of beneficiariosFiltrados; track b) {
                    <button
                      type="button"
                      (click)="seleccionarPaciente(b)"
                      class="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                      {{ b.folio }} - {{ b.nombre_completo }}
                    </button>
                  }
                </div>
              }
              @if (nuevaCita.id_paciente) {
                <p class="mt-1 text-xs text-emerald-600 font-semibold">Paciente seleccionado: {{ busquedaPaciente }}</p>
              }
            </div>
            <!-- Fecha y Hora -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fecha y Hora</label>
              <input
                type="datetime-local"
                [(ngModel)]="nuevaCitaFechaHora"
                name="fechaHora"
                required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
                />
            </div>
            <!-- Estatus -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estatus</label>
              <select
                [(ngModel)]="nuevaCita.estatus"
                name="estatus"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
                >
                <option value="PROGRAMADA">PROGRAMADA</option>
                <option value="EN_CURSO">EN_CURSO</option>
                <option value="COMPLETADA">COMPLETADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
            <!-- Notas -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Notas</label>
              <textarea
                [(ngModel)]="nuevaCita.notas"
                name="notas"
                rows="3"
                placeholder="Notas adicionales..."
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors resize-none"
              ></textarea>
            </div>
            <!-- Servicios -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-semibold text-slate-700">Servicios</label>
                <button type="button" (click)="agregarServicioCita()" class="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Agregar
                </button>
              </div>
              @for (srv of nuevaCita.servicios; track srv; let i = $index) {
                <div class="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div class="flex-1">
                    <select
                      [(ngModel)]="srv.id_servicio"
                      [name]="'servicio_' + i"
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                      >
                      <option [ngValue]="null" disabled>Seleccionar servicio...</option>
                      @for (s of serviciosList; track s) {
                        <option [ngValue]="s.id_servicio">{{ s.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="w-20">
                    <input
                      type="number"
                      [(ngModel)]="srv.cantidad"
                      [name]="'cantidad_' + i"
                      min="1"
                      placeholder="Cant."
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                      />
                  </div>
                  <div class="w-28">
                    <input
                      type="number"
                      [(ngModel)]="srv.monto_pagado"
                      [name]="'monto_' + i"
                      min="0"
                      step="0.01"
                      placeholder="Monto"
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                      />
                  </div>
                  <button type="button" (click)="quitarServicioCita(i)" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              }
              @if (nuevaCita.servicios.length === 0) {
                <p class="text-xs text-slate-400 italic">No se han agregado servicios.</p>
              }
            </div>
            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" (click)="showNuevaCitaModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" [disabled]="guardandoCita" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
                {{ guardandoCita ? 'Guardando...' : 'Guardar Cita' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Nuevo Medico ==================== -->
    @if (showNuevoMedicoModal) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showNuevoMedicoModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Agregar M&eacute;dico</h2>
            <button (click)="showNuevoMedicoModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarMedico()" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Nombre -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
                <input type="text" [(ngModel)]="nuevoMedico.nombre" name="nombre" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Nombre"/>
              </div>
              <!-- Apellido Paterno -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno</label>
                <input type="text" [(ngModel)]="nuevoMedico.apellido_paterno" name="apellidoPaterno" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Apellido Paterno"/>
              </div>
              <!-- Apellido Materno -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno</label>
                <input type="text" [(ngModel)]="nuevoMedico.apellido_materno" name="apellidoMaterno"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Apellido Materno"/>
              </div>
              <!-- Especialidad -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Especialidad</label>
                <input type="text" [(ngModel)]="nuevoMedico.especialidad" name="especialidad" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Especialidad"/>
              </div>
              <!-- Telefono -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Tel&eacute;fono</label>
                <input type="text" [(ngModel)]="nuevoMedico.telefono" name="telefono"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Tel&eacute;fono"/>
              </div>
              <!-- Correo -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Correo</label>
                <input type="email" [(ngModel)]="nuevoMedico.correo" name="correo"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="correo@ejemplo.com"/>
              </div>
            </div>
            <!-- Activo -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estado</label>
              <select [(ngModel)]="nuevoMedico.activo" name="activo"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors">
                <option value="S">Activo</option>
                <option value="N">Inactivo</option>
              </select>
            </div>
            <!-- Servicios (checkboxes) -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Servicios</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                @for (s of serviciosList; track s) {
                  <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      [checked]="medicoServiciosSeleccionados.includes(s.id_servicio)"
                      (change)="toggleServicioMedico(s.id_servicio)"
                      class="w-4 h-4 rounded border-slate-300 text-[#00328b] focus:ring-[#00328b]"
                      />
                    <span class="text-sm text-slate-700">{{ s.nombre }}</span>
                  </label>
                }
                @if (serviciosList.length === 0) {
                  <p class="text-xs text-slate-400 italic col-span-2">Cargando servicios...</p>
                }
              </div>
            </div>
            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" (click)="showNuevoMedicoModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" [disabled]="guardandoMedico" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
                {{ guardandoMedico ? 'Guardando...' : 'Guardar M&eacute;dico' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Detalle Cita ==================== -->
    @if (showDetalleCitaModal && citaSeleccionada) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showDetalleCitaModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Detalle de Cita</h2>
            <button (click)="showDetalleCitaModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="space-y-5">
            <!-- Paciente info -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-sm font-bold">
                {{ citaSeleccionada.nombrePaciente?.charAt(0) || '?' }}
              </div>
              <div>
                <p class="font-bold text-slate-900">{{ citaSeleccionada.nombrePaciente }}</p>
                <p class="text-sm text-slate-500">Folio: {{ citaSeleccionada.folioPaciente }}</p>
              </div>
            </div>
            <!-- Fecha y Estado -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fecha y Hora</p>
                <p class="font-bold text-slate-900">{{ formatFechaHora(citaSeleccionada.fechaHora) }}</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estatus</p>
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                  [ngClass]="getEstadoBadgeClass(citaSeleccionada.estatus)"
                  >
                  {{ citaSeleccionada.estatus }}
                </span>
              </div>
            </div>
            <!-- Notas -->
            @if (citaSeleccionada.notas) {
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas</p>
                <p class="text-sm text-slate-700">{{ citaSeleccionada.notas }}</p>
              </div>
            }
            <!-- Servicios -->
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Servicios</p>
              @if (citaSeleccionada.servicios.length > 0) {
                <div class="space-y-2">
                  @for (srv of citaSeleccionada.servicios; track srv) {
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p class="font-semibold text-slate-900 text-sm">{{ srv.nombre }}</p>
                        <p class="text-xs text-slate-500">Cantidad: {{ srv.cantidad }}</p>
                      </div>
                      <span class="text-sm font-bold text-emerald-600">\${{ srv.montoPagado | number:'1.2-2' }}</span>
                    </div>
                  }
                </div>
              }
              @if (citaSeleccionada.servicios.length === 0) {
                <p class="text-sm text-slate-400 italic">Sin servicios registrados.</p>
              }
            </div>
            <!-- Close -->
            <div class="flex justify-end pt-4 border-t border-slate-200">
              <button (click)="showDetalleCitaModal = false" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Detalle Medico ==================== -->
    @if (showDetalleMedicoModal && medicoSeleccionado) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showDetalleMedicoModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Detalle del M&eacute;dico</h2>
            <button (click)="showDetalleMedicoModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="space-y-5">
            <!-- Doctor info -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-lg font-bold">
                {{ medicoSeleccionado.iniciales }}
              </div>
              <div>
                <p class="text-lg font-bold text-slate-900">Dr(a). {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellidoPaterno }} {{ medicoSeleccionado.apellidoMaterno }}</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  {{ medicoSeleccionado.especialidad }}
                </span>
              </div>
            </div>
            <!-- Contacto -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tel&eacute;fono</p>
                <p class="font-semibold text-slate-900">{{ medicoSeleccionado.telefono || 'N/A' }}</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo</p>
                <p class="font-semibold text-slate-900 text-sm break-all">{{ medicoSeleccionado.correo || 'N/A' }}</p>
              </div>
            </div>
            <!-- Estado -->
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado</p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                [ngClass]="medicoSeleccionado.activo === 'S' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'"
                >
                {{ medicoSeleccionado.activo === 'S' ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <!-- Servicios -->
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Servicios Asociados</p>
              @if (medicoSeleccionado.servicios.length > 0) {
                <div class="flex flex-wrap gap-2">
                  @for (srv of medicoSeleccionado.servicios; track srv) {
                    <span
                      class="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-lg border border-amber-200"
                      >
                      {{ srv.nombre }}
                    </span>
                  }
                </div>
              }
              @if (medicoSeleccionado.servicios.length === 0) {
                <p class="text-sm text-slate-400 italic">Sin servicios asociados.</p>
              }
            </div>
            <!-- Close -->
            <div class="flex justify-end pt-4 border-t border-slate-200">
              <button (click)="showDetalleMedicoModal = false" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Editar Cita ==================== -->
    @if (showEditCitaModal && editCita) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditCitaModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Editar Cita</h2>
            <button (click)="showEditCitaModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarEdicionCita()" class="space-y-5">
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Paciente</p>
              <p class="font-bold text-slate-900">{{ editCita.nombrePaciente }}</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fecha y Hora</label>
              <input type="datetime-local" [(ngModel)]="editCitaFechaHora" name="editFechaHora" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estatus</label>
              <select [(ngModel)]="editCita.estatus" name="editEstatus"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors">
                <option value="PROGRAMADA">PROGRAMADA</option>
                <option value="EN_CURSO">EN_CURSO</option>
                <option value="COMPLETADA">COMPLETADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Notas</label>
              <textarea [(ngModel)]="editCita.notas" name="editNotas" rows="3" placeholder="Notas adicionales..."
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors resize-none"></textarea>
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-semibold text-slate-700">Servicios</label>
                <button type="button" (click)="agregarServicioEditCita()" class="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Agregar
                </button>
              </div>
              @for (srv of editCita.servicios; track srv; let i = $index) {
                <div class="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div class="flex-1">
                    <select [(ngModel)]="srv.idServicio" [name]="'editServicio_' + i"
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors">
                      <option [ngValue]="null" disabled>Seleccionar servicio...</option>
                      @for (s of serviciosList; track s) {
                        <option [ngValue]="s.id_servicio">{{ s.nombre }}</option>
                      }
                    </select>
                  </div>
                  <div class="w-20">
                    <input type="number" [(ngModel)]="srv.cantidad" [name]="'editCantidad_' + i" min="1" placeholder="Cant."
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"/>
                  </div>
                  <div class="w-28">
                    <input type="number" [(ngModel)]="srv.montoPagado" [name]="'editMonto_' + i" min="0" step="0.01" placeholder="Monto"
                      class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"/>
                  </div>
                  <button type="button" (click)="editCita.servicios.splice(i, 1)" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              }
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" (click)="showEditCitaModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" [disabled]="guardandoEdicionCita" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
                {{ guardandoEdicionCita ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Confirmar Eliminar Cita ==================== -->
    @if (showConfirmDeleteCita) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Eliminar Cita</h3>
          <p class="text-sm text-slate-600 mb-6">Esta acci&oacute;n no se puede deshacer. &iquest;Est&aacute;s seguro?</p>
          <div class="flex gap-3 justify-center">
            <button (click)="showConfirmDeleteCita = false" class="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button (click)="eliminarCita()" class="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Eliminar</button>
          </div>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Editar M&eacute;dico ==================== -->
    @if (showEditMedicoModal && editMedico) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditMedicoModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Editar M&eacute;dico</h2>
            <button (click)="showEditMedicoModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form (ngSubmit)="guardarEdicionMedico()" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
                <input type="text" [(ngModel)]="editMedico.nombre" name="editNombre" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno</label>
                <input type="text" [(ngModel)]="editMedico.apellido_paterno" name="editApPaterno" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno</label>
                <input type="text" [(ngModel)]="editMedico.apellido_materno" name="editApMaterno"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Especialidad</label>
                <input type="text" [(ngModel)]="editMedico.especialidad" name="editEspecialidad" required
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Tel&eacute;fono</label>
                <input type="text" [(ngModel)]="editMedico.telefono" name="editTelefono"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">Correo</label>
                <input type="email" [(ngModel)]="editMedico.correo" name="editCorreo"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"/>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estado</label>
              <select [(ngModel)]="editMedico.activo" name="editActivo"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors">
                <option value="S">Activo</option>
                <option value="N">Inactivo</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Servicios</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                @for (s of serviciosList; track s) {
                  <label class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-white transition-colors">
                    <input type="checkbox" [checked]="editMedicoServiciosSeleccionados.includes(s.id_servicio)" (change)="toggleEditServicioMedico(s.id_servicio)"
                      class="w-4 h-4 rounded border-slate-300 text-[#00328b] focus:ring-[#00328b]"/>
                    <span class="text-sm text-slate-700">{{ s.nombre }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button type="button" (click)="showEditMedicoModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" [disabled]="guardandoEdicionMedico" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
                {{ guardandoEdicionMedico ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
    
    <!-- ==================== MODAL: Disponibilidad Doctor ==================== -->
    @if (showDisponibilidadModal && disponibilidadDoctor) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showDisponibilidadModal = false">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-900">Disponibilidad Semanal - Dr. {{ disponibilidadDoctor.nombre }} {{ disponibilidadDoctor.apellidoPaterno }}</h2>
            <button (click)="showDisponibilidadModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <!-- Weekly grid -->
          <div class="mb-6 space-y-3">
            @for (dia of diasSemana; track dia) {
              <div class="bg-slate-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-bold text-slate-800">{{ dia.nombre }}</h4>
                </div>
                <!-- Slots for this day -->
                @if (getSlotsForDay(dia.num).length === 0) {
                  <div class="text-xs text-slate-400 italic">Sin horario asignado</div>
                }
                @for (slot of getSlotsForDay(dia.num); track slot) {
                  <div class="flex items-center gap-3 mb-1.5">
                    <div class="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span class="text-sm font-semibold text-slate-700">{{ slot.hora_inicio }} - {{ slot.hora_fin }}</span>
                    </div>
                    <!-- Mostrar aviso de conflicto si otro doctor ocupa este día -->
                    @if (getConflictDoctor(dia.num, slot)) {
                      <span class="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                        También: {{ getConflictDoctor(dia.num, slot) }}
                      </span>
                    }
                    <button (click)="eliminarSlotDisponibilidad(slot)" class="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-auto" title="Eliminar">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
          <!-- Error message -->
          @if (disponibilidadError) {
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
              {{ disponibilidadError }}
            </div>
          }
          <!-- Add new slot -->
          <div class="border-t border-slate-200 pt-6">
            <h3 class="text-sm font-bold text-slate-700 mb-3">Agregar Horario</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">D&iacute;a de la Semana</label>
                <select [(ngModel)]="nuevoSlot.dia_semana" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none text-sm transition-colors">
                  <option [ngValue]="0" disabled>Seleccionar...</option>
                  @for (dia of diasSemana; track dia) {
                    <option [ngValue]="dia.num">{{ dia.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Hora Inicio</label>
                <select [(ngModel)]="nuevoSlot.hora_inicio" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none text-sm transition-colors">
                  <option value="" disabled>Seleccionar...</option>
                  @for (h of horasDisponibles; track h) {
                    <option [value]="h">{{ h }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Hora Fin</label>
                <select [(ngModel)]="nuevoSlot.hora_fin" class="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none text-sm transition-colors">
                  <option value="" disabled>Seleccionar...</option>
                  @for (h of horasDisponibles; track h) {
                    <option [value]="h" [disabled]="nuevoSlot.hora_inicio && h <= nuevoSlot.hora_inicio">{{ h }}</option>
                  }
                </select>
              </div>
            </div>
            <button (click)="agregarSlotDisponibilidad()" [disabled]="guardandoSlot || !nuevoSlot.dia_semana || !nuevoSlot.hora_inicio || !nuevoSlot.hora_fin"
              class="px-5 py-2.5 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
              </svg>
              {{ guardandoSlot ? 'Guardando...' : 'Agregar' }}
            </button>
          </div>
        </div>
      </div>
    }
    `
})
export class CitasComponent implements OnInit, OnDestroy {
  activeTab: 'citas' | 'medicos' = 'citas';

  searchCitas = '';
  searchMedicos = '';
  filtroEstado = 'Todas';
  filtroTipo = 'Todas';
  // Usar siempre America/Monterrey (GMT-6) para calcular la fecha local
  todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  filtroFecha = this.todayStr; // default: hoy

  estadoFilters = ['Todas', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];
  tipoFilters = ['Todas', 'Consulta Neurocirugía', 'Consulta Ortopédica', 'Consulta Urológica', 'Fisioterapia', 'Terapia Ocupacional'];

  loading = true;
  citas: any[] = [];
  citasFiltradas: any[] = [];
  medicos: any[] = [];
  medicosFiltrados: any[] = [];
  citasSort: TableSortState = { key: 'fechaHora', direction: 'asc' };
  medicosSort: TableSortState = { key: 'nombre', direction: 'asc' };

  // Modal visibility
  showNuevaCitaModal = false;
  showNuevoMedicoModal = false;
  showDetalleCitaModal = false;
  showDetalleMedicoModal = false;

  // Detail selections
  citaSeleccionada: any = null;
  medicoSeleccionado: any = null;

  // ⋮ menus
  openCitaMenu: number | null = null;
  menuCitaPosition = { top: 0, left: 0 };
  menuCita: any = null;
  openMedicoMenu: number | null = null;
  menuMedicoPosition = { top: 0, left: 0 };
  menuMedico: any = null;
  private citaMenuTriggerElement: HTMLElement | null = null;
  private medicoMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 192; // Tailwind w-48
  private readonly citaMenuEstimatedHeight = 340;
  private readonly medicoMenuEstimatedHeight = 260;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly onViewportGeometryChange = (): void => {
    this.repositionOpenActionMenus();
  };

  // Servicios list (loaded once on init)
  serviciosList: any[] = [];

  // Beneficiarios for patient search
  beneficiariosList: any[] = [];
  beneficiariosFiltrados: any[] = [];
  busquedaPaciente = '';
  showPacienteDropdown = false;

  // Nueva Cita form
  nuevaCita: any = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
  nuevaCitaFechaHora = '';
  guardandoCita = false;

  // Nuevo Medico form
  nuevoMedico: any = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
  medicoServiciosSeleccionados: number[] = [];

  // Edit Cita
  showEditCitaModal = false;
  editCita: any = null;
  editCitaFechaHora = '';
  guardandoEdicionCita = false;
  showConfirmDeleteCita = false;
  citaAEliminar: any = null;

  // Edit Medico
  showEditMedicoModal = false;
  editMedico: any = null;
  editMedicoServiciosSeleccionados: number[] = [];
  guardandoEdicionMedico = false;

  // Disponibilidad
  showDisponibilidadModal = false;
  disponibilidadDoctor: any = null;
  disponibilidadSlots: any[] = [];
  disponibilidadSemana: any[] = []; // all doctors' slots for conflict check
  disponibilidadError = '';
  nuevoSlot: any = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
  horasDisponibles: string[] = (() => {
    const slots: string[] = [];
    for (let h = 7; h <= 21; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 21) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  })();
  guardandoSlot = false;
  guardandoMedico = false;
  diasSemana = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miercoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sabado' },
    { num: 7, nombre: 'Domingo' },
  ];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.cargarCitas();
    this.cargarDoctores();

    // Load servicios once on init
    this.api.getServicios().subscribe({
      next: (data) => {
        this.serviciosList = data;
      },
      error: (err) => console.error('Error al cargar servicios:', err),
    });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nueva') {
        setTimeout(() => this.abrirNuevaCita(), 0);
      }
    });

    window.visualViewport?.addEventListener('resize', this.onViewportGeometryChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewportGeometryChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewportGeometryChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportGeometryChange);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.repositionOpenActionMenus();
  }

  cargarCitas(): void {
    this.loading = true;
    this.api.getCitas().subscribe({
      next: (data) => {
        this.citas = data.map((c: any) => ({
          idCita: c.id_cita,
          idPaciente: c.id_paciente,
          nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente,
          fechaHora: c.fecha_hora,
          estatus: c.estatus,
          notas: c.notas,
          servicios: (c.servicios || []).map((s: any) => ({
            idServicio: s.id_servicio,
            nombre: s.nombre,
            cantidad: s.cantidad,
            montoPagado: s.monto_pagado,
          })),
        }));
        this.filtrarCitas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar citas:', err);
        this.loading = false;
      },
    });
  }

  cargarDoctores(): void {
    this.api.getDoctores().subscribe({
      next: (data) => {
        this.medicos = data.map((d: any) => this.mapDoctorFromApi(d));
        this.filtrarMedicos();
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
  }

  private normalizeActivo(value: unknown): 'S' | 'N' {
    return String(value || '').trim().toUpperCase() === 'S' ? 'S' : 'N';
  }

  private mapDoctorFromApi(d: any): any {
    return {
      idDoctor: d.id_doctor,
      nombre: d.nombre,
      apellidoPaterno: d.apellido_paterno,
      apellidoMaterno: d.apellido_materno,
      especialidad: d.especialidad,
      telefono: d.telefono,
      correo: d.correo,
      activo: this.normalizeActivo(d.activo),
      servicios: (d.servicios || []).map((s: any) => ({
        idServicio: s.id_servicio,
        nombre: s.nombre,
      })),
      iniciales: (d.nombre?.charAt(0) || '') + (d.apellido_paterno?.charAt(0) || ''),
    };
  }

  private replaceMedicoInView(updated: any): void {
    this.medicos = this.medicos.map((m) => (m.idDoctor === updated.idDoctor ? updated : m));
    this.medicosFiltrados = this.medicosFiltrados.map((m) => (m.idDoctor === updated.idDoctor ? updated : m));

    if (this.medicoSeleccionado?.idDoctor === updated.idDoctor) {
      this.medicoSeleccionado = updated;
    }
    if (this.menuMedico?.idDoctor === updated.idDoctor) {
      this.menuMedico = updated;
    }
  }

  // Fuerza GMT-6 (America/Monterrey) para toda presentacion de fechas
  private toMXDate(fechaHora: string): Date {
    // Oracle devuelve sin sufijo de zona; interpretamos como UTC-6 añadiendo el offset
    const clean = fechaHora.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fechaHora)
      ? fechaHora
      : fechaHora + '-06:00';
    return new Date(clean);
  }

  getHora(fechaHora: string): string {
    if (!fechaHora) return '';
    return this.toMXDate(fechaHora)
      .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Monterrey' });
  }

  getFecha(fechaHora: string): string {
    if (!fechaHora) return '';
    return this.toMXDate(fechaHora)
      .toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Monterrey' });
  }

  formatFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    return this.toMXDate(fechaHora)
      .toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Monterrey' });
  }

  getEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'COMPLETADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'EN_CURSO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROGRAMADA': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  filtrarCitas(): void {
    let resultado = [...this.citas];

    if (this.searchCitas) {
      const busqueda = this.searchCitas.toLowerCase();
      resultado = resultado.filter(c =>
        c.nombrePaciente.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroFecha) {
      resultado = resultado.filter(c => {
        if (!c.fechaHora) return false;
        const citaDate = this.toMXDate(c.fechaHora)
          .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
        return citaDate === this.filtroFecha;
      });
    }

    if (this.filtroEstado !== 'Todas') {
      resultado = resultado.filter(c => c.estatus === this.filtroEstado);
    }

    if (this.filtroTipo !== 'Todas') {
      resultado = resultado.filter(c =>
        c.servicios.some((s: any) => s.nombre === this.filtroTipo)
      );
    }

    this.citasFiltradas = this.sortRows(resultado, this.citasSort, (cita, key) => {
      switch (key) {
        case 'fechaHora':
          return cita.fechaHora;
        case 'paciente':
          return cita.nombrePaciente;
        case 'tipoConsulta':
          return cita.servicios?.[0]?.nombre || '';
        case 'estado':
          return cita.estatus;
        default:
          return cita.fechaHora;
      }
    });
  }

  filtrarMedicos(): void {
    if (!this.searchMedicos) {
      this.medicosFiltrados = this.sortRows(this.medicos, this.medicosSort, (medico, key) => {
        switch (key) {
          case 'nombre':
            return `${medico.nombre} ${medico.apellidoPaterno} ${medico.apellidoMaterno || ''}`;
          case 'especialidad':
            return medico.especialidad;
          case 'contacto':
            return `${medico.telefono || ''} ${medico.correo || ''}`;
          case 'servicios':
            return (medico.servicios || []).map((s: any) => s.nombre).join(', ');
          case 'estado':
            return medico.activo;
          default:
            return medico.nombre;
        }
      });
      return;
    }
    const busqueda = this.searchMedicos.toLowerCase();
    const filtrados = this.medicos.filter(m =>
      m.nombre.toLowerCase().includes(busqueda) ||
      m.apellidoPaterno.toLowerCase().includes(busqueda) ||
      m.especialidad.toLowerCase().includes(busqueda)
    );
    this.medicosFiltrados = this.sortRows(filtrados, this.medicosSort, (medico, key) => {
      switch (key) {
        case 'nombre':
          return `${medico.nombre} ${medico.apellidoPaterno} ${medico.apellidoMaterno || ''}`;
        case 'especialidad':
          return medico.especialidad;
        case 'contacto':
          return `${medico.telefono || ''} ${medico.correo || ''}`;
        case 'servicios':
          return (medico.servicios || []).map((s: any) => s.nombre).join(', ');
        case 'estado':
          return medico.activo;
        default:
          return medico.nombre;
      }
    });
  }

  toggleCitasSort(key: string): void {
    if (this.citasSort.key === key) {
      this.citasSort.direction = this.citasSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.citasSort = { key, direction: 'asc' };
    }
    this.filtrarCitas();
  }

  toggleMedicosSort(key: string): void {
    if (this.medicosSort.key === key) {
      this.medicosSort.direction = this.medicosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.medicosSort = { key, direction: 'asc' };
    }
    this.filtrarMedicos();
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  private sortRows<T>(rows: T[], sort: TableSortState, valueGetter: (row: T, key: string) => unknown): T[] {
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = this.toComparableValue(valueGetter(a, sort.key));
      const right = this.toComparableValue(valueGetter(b, sort.key));
      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      return 0;
    });
  }

  private toComparableValue(value: unknown): number | string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;

    const text = String(value).trim();
    const maybeDate = Date.parse(text);
    if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) return maybeDate;

    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text !== '') return maybeNumber;

    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // ──────────────── Nueva Cita ────────────────

  abrirNuevaCita(): void {
    this.nuevaCita = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
    this.nuevaCitaFechaHora = '';
    this.busquedaPaciente = '';
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
    this.showNuevaCitaModal = true;

    // Load beneficiarios on modal open
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id_paciente: b.id_paciente,
          folio: b.folio,
          nombre_completo: `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.trim(),
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err),
    });
  }

  filtrarBeneficiarios(): void {
    this.showPacienteDropdown = true;
    if (!this.busquedaPaciente) {
      this.beneficiariosFiltrados = [];
      this.nuevaCita.id_paciente = null;
      return;
    }
    const term = this.busquedaPaciente.toLowerCase();
    this.beneficiariosFiltrados = this.beneficiariosList.filter(b =>
      b.folio?.toLowerCase().includes(term) || b.nombre_completo.toLowerCase().includes(term)
    ).slice(0, 10);
  }

  seleccionarPaciente(b: any): void {
    this.nuevaCita.id_paciente = b.id_paciente;
    this.busquedaPaciente = `${b.folio} - ${b.nombre_completo}`;
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
  }

  agregarServicioCita(): void {
    this.nuevaCita.servicios.push({ id_servicio: null, cantidad: 1, monto_pagado: 0 });
  }

  quitarServicioCita(index: number): void {
    this.nuevaCita.servicios.splice(index, 1);
  }

  guardarCita(): void {
    if (!this.nuevaCita.id_paciente || !this.nuevaCitaFechaHora) return;

    this.guardandoCita = true;
    const payload = {
      id_paciente: this.nuevaCita.id_paciente,
      fecha_hora: this.nuevaCitaFechaHora.length === 16 ? this.nuevaCitaFechaHora + ':00' : this.nuevaCitaFechaHora,
      estatus: this.nuevaCita.estatus,
      notas: this.nuevaCita.notas,
      servicios: this.nuevaCita.servicios
        .filter((s: any) => s.id_servicio !== null)
        .map((s: any) => ({
          id_servicio: s.id_servicio,
          cantidad: s.cantidad,
          monto_pagado: s.monto_pagado,
        })),
    };

    this.api.createCita(payload).subscribe({
      next: () => {
        this.showNuevaCitaModal = false;
        this.guardandoCita = false;
        this.cargarCitas();
      },
      error: (err) => {
        console.error('Error al crear cita:', err);
        this.guardandoCita = false;
      },
    });
  }

  // ──────────────── Nuevo Medico ────────────────

  abrirNuevoMedico(): void {
    this.nuevoMedico = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
    this.medicoServiciosSeleccionados = [];
    this.showNuevoMedicoModal = true;
  }

  toggleServicioMedico(idServicio: number): void {
    const idx = this.medicoServiciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) {
      this.medicoServiciosSeleccionados.splice(idx, 1);
    } else {
      this.medicoServiciosSeleccionados.push(idServicio);
    }
  }

  guardarMedico(): void {
    if (!this.nuevoMedico.nombre || !this.nuevoMedico.apellido_paterno) return;

    this.guardandoMedico = true;
    const payload = {
      nombre: this.nuevoMedico.nombre,
      apellido_paterno: this.nuevoMedico.apellido_paterno,
      apellido_materno: this.nuevoMedico.apellido_materno,
      especialidad: this.nuevoMedico.especialidad,
      telefono: this.nuevoMedico.telefono,
      correo: this.nuevoMedico.correo,
      activo: this.nuevoMedico.activo,
      servicios: [...this.medicoServiciosSeleccionados],
    };

    this.api.createDoctor(payload).subscribe({
      next: () => {
        this.showNuevoMedicoModal = false;
        this.guardandoMedico = false;
        this.cargarDoctores();
      },
      error: (err) => {
        console.error('Error al crear médico:', err);
        this.guardandoMedico = false;
      },
    });
  }

  // ──────────────── Detalle Cita ────────────────

  verDetalleCita(cita: any): void {
    this.citaSeleccionada = cita;
    this.showDetalleCitaModal = true;
  }

  // ──────────────── Detalle Medico ────────────────

  verDetalleMedico(medico: any): void {
    this.medicoSeleccionado = medico;
    this.showDetalleMedicoModal = true;
  }

  // ──────────────── Editar Cita ────────────────

  editarCita(cita: any): void {
    this.editCita = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      nombrePaciente: cita.nombrePaciente,
      estatus: cita.estatus,
      notas: cita.notas || '',
      servicios: cita.servicios.map((s: any) => ({ ...s })),
    };
    this.editCitaFechaHora = cita.fechaHora ? cita.fechaHora.substring(0, 16) : '';
    this.showEditCitaModal = true;
  }

  agregarServicioEditCita(): void {
    this.editCita.servicios.push({ idServicio: null, cantidad: 1, montoPagado: 0 });
  }

  guardarEdicionCita(): void {
    if (!this.editCitaFechaHora) return;
    this.guardandoEdicionCita = true;
    const payload = {
      id_paciente: this.editCita.idPaciente,
      fecha_hora: this.editCitaFechaHora.length === 16 ? this.editCitaFechaHora + ':00' : this.editCitaFechaHora,
      estatus: this.editCita.estatus,
      notas: this.editCita.notas,
      servicios: this.editCita.servicios
        .filter((s: any) => s.idServicio !== null)
        .map((s: any) => ({
          id_servicio: s.idServicio,
          cantidad: s.cantidad,
          monto_pagado: s.montoPagado,
        })),
    };
    this.api.updateCita(this.editCita.idCita, payload).subscribe({
      next: () => {
        this.showEditCitaModal = false;
        this.guardandoEdicionCita = false;
        this.cargarCitas();
      },
      error: (err) => {
        console.error('Error al actualizar cita:', err);
        this.guardandoEdicionCita = false;
      },
    });
  }

  completarCitaInline(cita: any): void {
    this.api.completarCita(cita.idCita).subscribe({
      next: () => this.cargarCitas(),
      error: (err) => console.error('Error al completar cita:', err),
    });
  }

  cancelarCitaInline(cita: any): void {
    this.api.cancelarCita(cita.idCita).subscribe({
      next: () => this.cargarCitas(),
      error: (err) => console.error('Error al cancelar cita:', err),
    });
  }

  descargarComprobante(cita: any): void {
    this.api.exportarComprobanteCitaPdf(cita.idCita).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprobante_cita_${cita.idCita}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Error al generar comprobante'),
    });
  }

  confirmarEliminarCita(cita: any): void {
    this.citaAEliminar = cita;
    this.showConfirmDeleteCita = true;
  }

  eliminarCita(): void {
    if (!this.citaAEliminar) return;
    this.api.deleteCita(this.citaAEliminar.idCita).subscribe({
      next: () => {
        this.showConfirmDeleteCita = false;
        this.citaAEliminar = null;
        this.cargarCitas();
      },
      error: (err) => {
        console.error('Error al eliminar cita:', err);
        this.showConfirmDeleteCita = false;
      },
    });
  }

  // ──────────────── Editar Médico ────────────────

  editarMedico(medico: any): void {
    this.editMedico = {
      idDoctor: medico.idDoctor,
      nombre: medico.nombre,
      apellido_paterno: medico.apellidoPaterno,
      apellido_materno: medico.apellidoMaterno || '',
      especialidad: medico.especialidad,
      telefono: medico.telefono || '',
      correo: medico.correo || '',
      activo: medico.activo,
    };
    this.editMedicoServiciosSeleccionados = medico.servicios.map((s: any) => s.idServicio);
    this.showEditMedicoModal = true;
  }

  toggleEditServicioMedico(idServicio: number): void {
    const idx = this.editMedicoServiciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) {
      this.editMedicoServiciosSeleccionados.splice(idx, 1);
    } else {
      this.editMedicoServiciosSeleccionados.push(idServicio);
    }
  }

  guardarEdicionMedico(): void {
    if (!this.editMedico.nombre || !this.editMedico.apellido_paterno) return;
    this.guardandoEdicionMedico = true;
    const payload = {
      nombre: this.editMedico.nombre,
      apellido_paterno: this.editMedico.apellido_paterno,
      apellido_materno: this.editMedico.apellido_materno,
      especialidad: this.editMedico.especialidad,
      telefono: this.editMedico.telefono,
      correo: this.editMedico.correo,
      activo: this.editMedico.activo,
      servicios: [...this.editMedicoServiciosSeleccionados],
    };
    this.api.updateDoctor(this.editMedico.idDoctor, payload).subscribe({
      next: () => {
        this.showEditMedicoModal = false;
        this.guardandoEdicionMedico = false;
        this.cargarDoctores();
      },
      error: (err) => {
        console.error('Error al actualizar médico:', err);
        this.guardandoEdicionMedico = false;
      },
    });
  }

  toggleActivoMedico(medico: any): void {
    const previo = this.normalizeActivo(medico.activo);
    const nuevo: 'S' | 'N' = previo === 'S' ? 'N' : 'S';
    medico.activo = nuevo;

    if (nuevo === 'N') {
      this.api.deleteDoctor(medico.idDoctor).subscribe({
        next: () => {
          this.replaceMedicoInView({ ...medico, activo: 'N' });
          this.filtrarMedicos();
        },
        error: (err) => {
          medico.activo = previo;
          console.error('Error al desactivar médico:', err);
          alert(err?.error?.detail || 'No se pudo cambiar el estado del médico.');
        },
      });
      return;
    }

    const payload = {
      nombre: medico.nombre,
      apellido_paterno: medico.apellidoPaterno,
      apellido_materno: medico.apellidoMaterno || '',
      especialidad: medico.especialidad,
      telefono: medico.telefono || '',
      correo: medico.correo || '',
      activo: nuevo,
      servicios: (medico.servicios || []).map((s: any) => s.idServicio),
    };
    this.api.updateDoctor(medico.idDoctor, payload).subscribe({
      next: (response: any) => {
        if (response) {
          this.replaceMedicoInView(this.mapDoctorFromApi(response));
          this.filtrarMedicos();
          return;
        }

        this.replaceMedicoInView({ ...medico, activo: nuevo });
        this.filtrarMedicos();
      },
      error: (err) => {
        medico.activo = previo;
        console.error('Error al cambiar estado del médico:', err);
        alert(err?.error?.detail || 'No se pudo cambiar el estado del médico.');
      },
    });
  }

  // ──────────────── Disponibilidad ────────────────

  abrirDisponibilidad(medico: any): void {
    this.disponibilidadDoctor = medico;
    this.disponibilidadSlots = [];
    this.disponibilidadError = '';
    this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
    this.showDisponibilidadModal = true;
    this.cargarDisponibilidad(medico.idDoctor);
    // Load all doctors' availability for conflict checking
    this.api.getDisponibilidadSemana().subscribe({
      next: (data) => { this.disponibilidadSemana = data; },
      error: () => { this.disponibilidadSemana = []; },
    });
  }

  cargarDisponibilidad(idDoctor: number): void {
    this.api.getDoctorDisponibilidad(idDoctor).subscribe({
      next: (data) => { this.disponibilidadSlots = data; },
      error: (err) => console.error('Error al cargar disponibilidad:', err),
    });
  }

  getSlotsForDay(dia: number): any[] {
    return this.disponibilidadSlots.filter(s => s.dia_semana === dia);
  }

  getConflictDoctor(dia: number, slot: any): string | null {
    const conflict = this.disponibilidadSemana.find(s =>
      s.dia_semana === dia &&
      s.id_doctor !== this.disponibilidadDoctor?.idDoctor &&
      s.hora_inicio < slot.hora_fin &&
      s.hora_fin > slot.hora_inicio
    );
    return conflict ? conflict.nombre_doctor : null;
  }

  agregarSlotDisponibilidad(): void {
    if (!this.nuevoSlot.dia_semana || !this.nuevoSlot.hora_inicio || !this.nuevoSlot.hora_fin) return;
    this.disponibilidadError = '';
    if (this.nuevoSlot.hora_inicio >= this.nuevoSlot.hora_fin) {
      this.disponibilidadError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    this.guardandoSlot = true;
    const payload = {
      dia_semana: this.nuevoSlot.dia_semana,
      hora_inicio: this.nuevoSlot.hora_inicio,
      hora_fin: this.nuevoSlot.hora_fin,
    };
    this.api.createDoctorDisponibilidad(this.disponibilidadDoctor.idDoctor, payload).subscribe({
      next: () => {
        this.guardandoSlot = false;
        this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
        this.cargarDisponibilidad(this.disponibilidadDoctor.idDoctor);
        // Refresh global availability for conflict check
        this.api.getDisponibilidadSemana().subscribe({
          next: (data) => { this.disponibilidadSemana = data; },
        });
      },
      error: (err) => {
        this.guardandoSlot = false;
        this.disponibilidadError = err.error?.detail || 'Error al crear disponibilidad';
      },
    });
  }

  eliminarSlotDisponibilidad(slot: any): void {
    if (!this.disponibilidadDoctor) return;
    this.api.deleteDoctorDisponibilidad(this.disponibilidadDoctor.idDoctor, slot.id_disponibilidad).subscribe({
      next: () => {
        this.cargarDisponibilidad(this.disponibilidadDoctor.idDoctor);
        this.api.getDisponibilidadSemana().subscribe({
          next: (data) => { this.disponibilidadSemana = data; },
        });
      },
      error: (err) => {
        console.error('Error al eliminar disponibilidad:', err);
      },
    });
  }

  formatDispFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDispHora(timestamp: string): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // ──────────────── ⋮ Menús Citas ────────────────

  private getActionMenuPosition(triggerRect: DOMRect, estimatedHeight: number): { top: number; left: number } {
    const viewportPadding = this.actionMenuViewportPadding;
    const preferredTop = triggerRect.bottom + this.actionMenuGap;
    const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);

    // Mantener el menú lo más abajo posible dentro del viewport sin recortarlo.
    let top = Math.min(preferredTop, maxTop);
    top = Math.max(viewportPadding, top);

    const preferredLeft = triggerRect.right - this.actionMenuWidth;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - this.actionMenuWidth - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);

    return { top, left };
  }

  private repositionOpenActionMenus(): void {
    if (this.openCitaMenu !== null && this.citaMenuTriggerElement) {
      if (!document.body.contains(this.citaMenuTriggerElement)) {
        this.closeCitaMenu();
      } else {
        this.menuCitaPosition = this.getActionMenuPosition(
          this.citaMenuTriggerElement.getBoundingClientRect(),
          this.citaMenuEstimatedHeight,
        );
      }
    }

    if (this.openMedicoMenu !== null && this.medicoMenuTriggerElement) {
      if (!document.body.contains(this.medicoMenuTriggerElement)) {
        this.closeMedicoMenu();
      } else {
        this.menuMedicoPosition = this.getActionMenuPosition(
          this.medicoMenuTriggerElement.getBoundingClientRect(),
          this.medicoMenuEstimatedHeight,
        );
      }
    }
  }

  toggleCitaMenu(cita: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openCitaMenu === cita.idCita) {
      this.closeCitaMenu();
      return;
    }
    this.citaMenuTriggerElement = event.currentTarget as HTMLElement;
    this.menuCitaPosition = this.getActionMenuPosition(
      this.citaMenuTriggerElement.getBoundingClientRect(),
      this.citaMenuEstimatedHeight,
    );
    this.menuCita = cita;
    this.openCitaMenu = cita.idCita;
  }

  closeCitaMenu(): void {
    this.openCitaMenu = null;
    this.menuCita = null;
    this.citaMenuTriggerElement = null;
  }

  // ──────────────── ⋮ Menús Médicos ────────────────

  toggleMedicoMenu(medico: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMedicoMenu === medico.idDoctor) {
      this.closeMedicoMenu();
      return;
    }
    this.medicoMenuTriggerElement = event.currentTarget as HTMLElement;
    this.menuMedicoPosition = this.getActionMenuPosition(
      this.medicoMenuTriggerElement.getBoundingClientRect(),
      this.medicoMenuEstimatedHeight,
    );
    this.menuMedico = medico;
    this.openMedicoMenu = medico.idDoctor;
  }

  closeMedicoMenu(): void {
    this.openMedicoMenu = null;
    this.menuMedico = null;
    this.medicoMenuTriggerElement = null;
  }
}
