import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface MetodoPagoItem {
  idMetodoPago: number;
  nombre: string; // EFECTIVO / TRANSFERENCIA / TARJETA / EXENTO
  monto: number;
}

interface Recibo {
  idVenta: number;
  folioVenta: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaVenta: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string; // S / N
  cancelada: string; // S / N
  motivoCancelacion: string | null;
  metodosPago: MetodoPagoItem[];
}

interface MetodoPagoCatalogo {
  id: number;
  nombre: string;
}

interface BeneficiarioOption {
  id: number;
  folio: string;
  nombre: string;
  tipoCuota: string;
}

interface MetodoPagoRow {
  id_metodo_pago: number;
  monto: number;
}

interface ConceptoCobroOption {
  id: number;
  nombre: string;
  tipo: 'SERVICIO' | 'PRODUCTO';
  precioA: number;
  precioB: number;
  precioDefault: number;
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-recibos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-[#b9e5fb]/30 via-white to-[#e0f2ff]/50">
      <app-navbar></app-navbar>
      <main class="flex-1 min-h-0 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
    
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <!-- Receipt icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                  <path d="M12 17.5v.5"/>
                  <path d="M12 6v.5"/>
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-black text-slate-900">Recibos</h1>
                <p class="text-sm text-slate-600">Gesti&oacute;n de cobros unificados</p>
              </div>
            </div>
            <button (click)="openNuevoCobro()" class="flex items-center gap-2 px-5 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
              </svg>
              Nuevo Cobro
            </button>
          </div>
    
          <!-- Filters -->
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-slate-100">
            <div class="grid grid-cols-5 gap-4">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input type="text" placeholder="Buscar por folio..." [(ngModel)]="filtroFolio" (input)="filtrarRecibos()" class="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
              </div>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" placeholder="Buscar por beneficiario..." [(ngModel)]="filtroBeneficiario" (input)="filtrarRecibos()" class="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <input type="date" [(ngModel)]="filtroFechaInicio" (change)="filtrarRecibos()" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="Fecha inicio" />
              </div>
              <div>
                <input type="date" [(ngModel)]="filtroFechaFin" (change)="filtrarRecibos()" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="Fecha fin" />
              </div>
              <button (click)="limpiarFiltros()" class="w-full py-2.5 px-4 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Limpiar
              </button>
            </div>
          </div>
    
          <!-- Loading Skeleton -->
          @if (loading) {
            <div class="bg-white rounded-xl shadow-lg border-2 border-slate-100 p-6 min-h-[320px]">
              <div class="animate-pulse space-y-4">
                @for (_ of [1,2,3,4,5]; track _) {
                  <div class="flex items-center gap-4 py-3">
                    <div class="h-4 bg-slate-200 rounded w-24"></div>
                    <div class="flex-1 space-y-2">
                      <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                    </div>
                    <div class="h-4 bg-slate-200 rounded w-20"></div>
                    <div class="h-6 bg-slate-200 rounded-full w-16"></div>
                  </div>
                }
              </div>
            </div>
          }
    
          <!-- Table -->
          @if (!loading) {
            <div class="bg-white rounded-xl shadow-lg border-2 border-slate-100 overflow-auto max-h-[calc(100vh-430px)] min-h-[320px]">
              <table class="w-full">
                <thead class="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('folioVenta')" class="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
                        <span>Folio</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'folioVenta') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('nombrePaciente')" class="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>Beneficiario</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'nombrePaciente') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('fechaVenta')" class="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <span>Fecha</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'fechaVenta') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('montoTotal')" class="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        <span>Monto Total</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'montoTotal') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('montoPagado')" class="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        <span>Pagado</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'montoPagado') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('saldoPendiente')" class="flex items-center gap-1 hover:text-slate-900 transition-colors">
                        <span>Saldo</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'saldoPendiente') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('pago')" class="flex items-center gap-1 hover:text-slate-900 transition-colors">
                        <span>Pago</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'pago') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      <button type="button" (click)="toggleRecibosSort('estado')" class="flex items-center gap-1 hover:text-slate-900 transition-colors">
                        <span>Estado</span>
                        <span class="text-[10px] font-black leading-none">{{ getSortIndicator(recibosSort, 'estado') }}</span>
                      </button>
                    </th>
                    <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                      Acci&oacute;n
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (recibo of recibosFiltrados; track recibo; let i = $index) {
                    <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td class="px-5 py-4">
                        <span class="font-mono text-sm font-bold text-emerald-600">{{ recibo.folioVenta }}</span>
                      </td>
                      <td class="px-5 py-4 text-sm text-slate-700">{{ recibo.nombrePaciente }}</td>
                      <td class="px-5 py-4 text-sm text-slate-600">{{ recibo.fechaVenta }}</td>
                      <td class="px-5 py-4 text-sm font-bold text-slate-900">\${{ recibo.montoTotal | number:'1.2-2' }}</td>
                      <td class="px-5 py-4 text-sm font-bold text-slate-900">\${{ recibo.montoPagado | number:'1.2-2' }}</td>
                      <td class="px-5 py-4 text-sm font-semibold" [ngClass]="recibo.saldoPendiente > 0 ? 'text-amber-600' : 'text-slate-500'">\${{ recibo.saldoPendiente | number:'1.2-2' }}</td>
                      <td class="px-5 py-4">
                        <span class="text-sm font-semibold" [ngClass]="getPagoLabelClass(recibo)">
                          {{ getPagoLabel(recibo) }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                    [ngClass]="{
                      'bg-red-100 text-red-700': recibo.cancelada === 'S',
                      'bg-emerald-100 text-emerald-700': recibo.cancelada !== 'S' && recibo.saldoPendiente === 0,
                      'bg-amber-100 text-amber-700': recibo.cancelada !== 'S' && recibo.saldoPendiente > 0
                    }">
                          {{ recibo.cancelada === 'S' ? 'Cancelada' : (recibo.saldoPendiente === 0 ? 'Pagada' : 'Pendiente') }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-1">
                          <button (click)="verDetalle(recibo)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-all cursor-pointer" title="Ver detalle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          @if (recibo.cancelada !== 'S') {
                            <button (click)="confirmarCancelarRecibo(recibo)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-all cursor-pointer" title="Cancelar recibo">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                              </svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                  @if (recibosFiltrados.length === 0) {
                    <tr>
                      <td colspan="9" class="text-center py-8 text-slate-400 text-sm">No se encontraron recibos</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
    
          <!-- Stats (below table) -->
          @if (!loading) {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div class="bg-white rounded-xl border-2 border-slate-100 shadow-lg p-5">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Total Facturado</p>
                <p class="text-2xl font-black text-slate-900">\${{ montoTotal | number:'1.2-2' }}</p>
              </div>
              <div class="bg-white rounded-xl border-2 border-slate-100 shadow-lg p-5">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Efectivo</p>
                <p class="text-2xl font-black text-emerald-600">\${{ montoEfectivo | number:'1.2-2' }}</p>
              </div>
              <div class="bg-white rounded-xl border-2 border-slate-100 shadow-lg p-5">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Tarjeta</p>
                <p class="text-2xl font-black text-blue-600">\${{ montoTarjeta | number:'1.2-2' }}</p>
              </div>
              <div class="bg-white rounded-xl border-2 border-slate-100 shadow-lg p-5">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Transferencia</p>
                <p class="text-2xl font-black text-purple-600">\${{ montoTransferencia | number:'1.2-2' }}</p>
              </div>
            </div>
          }
    
        </div>
      </main>
    </div>
    
    <!-- Detail Modal -->
    @if (showDetalle && reciboSeleccionado) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="closeDetalle()">
        <div class="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                  <path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
                </svg>
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-900">Detalle de Recibo</h2>
                <p class="text-xs text-slate-500">{{ reciboSeleccionado.folioVenta }}</p>
              </div>
            </div>
            <button (click)="closeDetalle()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Modal Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- Info Row -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Folio</p>
                <p class="font-mono text-sm font-bold text-emerald-600">{{ reciboSeleccionado.folioVenta }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha</p>
                <p class="text-sm text-slate-700">{{ reciboSeleccionado.fechaVenta }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Beneficiario</p>
                <p class="text-sm text-slate-700 font-medium">{{ reciboSeleccionado.nombrePaciente }}</p>
              </div>
            </div>
            <!-- Patient Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Folio Paciente</p>
                <p class="font-mono text-sm text-slate-700">{{ reciboSeleccionado.folioPaciente }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Exento de Pago</p>
                <p class="text-sm text-slate-700 font-medium">{{ reciboSeleccionado.exentoPago === 'S' ? 'S&iacute;' : 'No' }}</p>
              </div>
            </div>
            <!-- Payment Methods -->
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">M&eacute;todos de Pago</p>
              <div class="space-y-2">
                @for (mp of reciboSeleccionado.metodosPago; track mp) {
                  <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span class="text-sm font-semibold"
                  [ngClass]="{
                    'text-emerald-600': mp.nombre === 'EFECTIVO',
                    'text-blue-600': mp.nombre === 'TARJETA',
                    'text-purple-600': mp.nombre === 'TRANSFERENCIA',
                    'text-slate-500': mp.nombre === 'EXENTO',
                    'text-amber-600': mp.nombre === 'PENDIENTE'
                  }">
                      {{ mp.nombre }}
                    </span>
                    <span class="text-sm font-bold text-slate-900">\${{ mp.monto | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            </div>
            <!-- Cancellation info -->
            @if (reciboSeleccionado.cancelada === 'S') {
              <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                <p class="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Cancelada</p>
                <p class="text-sm text-red-700">{{ reciboSeleccionado.motivoCancelacion }}</p>
              </div>
            }
            <!-- Totals -->
            <div class="space-y-2">
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span class="text-sm font-semibold text-slate-600">Monto Total</span>
                <span class="text-sm font-bold text-slate-900">\${{ reciboSeleccionado.montoTotal | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span class="text-sm font-semibold text-slate-600">Monto Pagado</span>
                <span class="text-sm font-bold text-slate-900">\${{ reciboSeleccionado.montoPagado | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between p-4 bg-gradient-to-r rounded-xl"
                [ngClass]="reciboSeleccionado.saldoPendiente > 0 ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600'">
                <span class="text-white font-bold text-lg">Saldo Pendiente</span>
                <span class="text-white font-black text-2xl">\${{ reciboSeleccionado.saldoPendiente | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- Nuevo Cobro Modal -->
    @if (showNuevoCobro) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeNuevoCobro()">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-slate-900">Nuevo Cobro</h2>
            </div>
            <button (click)="closeNuevoCobro()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          <!-- Error message -->
          @if (nuevoCobroError) {
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {{ nuevoCobroError }}
            </div>
          }
          <!-- Form -->
          <div class="space-y-5">
            <!-- Paciente -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Paciente</label>
              <div class="relative">
                <input type="text"
                  [(ngModel)]="beneficiarioBusqueda"
                  (input)="filtrarBeneficiariosCobro()"
                  (focus)="onBeneficiarioBusquedaFocus()"
                  (blur)="onBeneficiarioBusquedaBlur()"
                  placeholder="Buscar por nombre o folio..."
                  class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  [ngClass]="nuevoCobro.id_paciente ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 focus:border-[#00328b]'" />
                <!-- Clear selection button -->
                @if (nuevoCobro.id_paciente) {
                  <button type="button"
                    (click)="limpiarSeleccionBeneficiario()"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-300 hover:bg-slate-400 text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                }
                <!-- Dropdown list -->
                @if (showBeneficiarioDropdown) {
                  <div
                    class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                    @for (b of beneficiariosFiltradosCobro; track b) {
                      <button type="button"
                        (mousedown)="seleccionarBeneficiarioCobro(b)"
                        class="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-center gap-3">
                        <span class="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">{{ b.folio }}</span>
                        <span class="text-sm text-slate-700 truncate">{{ b.nombre }}</span>
                      </button>
                    }
                    @if (beneficiariosFiltradosCobro.length === 0) {
                      <div class="px-4 py-3 text-sm text-slate-400 text-center">
                        Sin resultados
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            <!-- Producto / Servicio -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Producto o Servicio a Cobrar</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select [(ngModel)]="nuevoConcepto.tipo" (ngModelChange)="onTipoConceptoChange()"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                  <option value="SERVICIO">Servicio</option>
                  <option value="PRODUCTO">Producto</option>
                </select>
                <select [(ngModel)]="nuevoConcepto.id" (ngModelChange)="onConceptoSeleccionadoChange()"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                  <option [ngValue]="0" disabled>
                    {{ nuevoConcepto.tipo === 'SERVICIO' ? 'Seleccionar servicio...' : 'Seleccionar producto...' }}
                  </option>
                  @for (item of conceptosDisponibles; track item) {
                    <option [ngValue]="item.id">{{ item.nombre }}</option>
                  }
                </select>
                <input type="number" [(ngModel)]="nuevoConcepto.cantidad" (ngModelChange)="onCantidadConceptoChange()" min="1" step="1"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="Cantidad" />
              </div>
              @if (conceptoPrecioUnitario > 0) {
                <p class="mt-2 text-xs font-semibold text-slate-600">
                  Precio unitario (cuota {{ tipoCuotaBeneficiarioSeleccionado }}):
                  <span class="text-emerald-700">\${{ conceptoPrecioUnitario | number:'1.2-2' }}</span>
                  &middot; Total sugerido:
                  <span class="text-emerald-700">\${{ (conceptoPrecioUnitario * nuevoConcepto.cantidad) | number:'1.2-2' }}</span>
                </p>
              }
            </div>
            <!-- Monto Total -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Monto Total</label>
              <input type="number" [(ngModel)]="nuevoCobro.monto_total" (ngModelChange)="calcularSaldoCobro()" min="0" step="0.01"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                placeholder="0.00" />
            </div>
            <!-- Exento de Pago -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Exento de Pago</label>
              <select [(ngModel)]="nuevoCobro.exento_pago" (ngModelChange)="onExentoPagoChange()"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                <option value="N">No</option>
                <option value="S">S&iacute;</option>
              </select>
            </div>
            <!-- Metodos de Pago -->
            @if (nuevoCobro.exento_pago !== 'S') {
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold text-slate-700">M&eacute;todos de Pago</label>
                  <button (click)="agregarMetodoPago()" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                    </svg>
                    Agregar
                  </button>
                </div>
                <div class="space-y-2">
                  @for (mp of nuevoCobro.metodos_pago; track mp; let i = $index) {
                    <div class="flex items-center gap-3">
                      <select [(ngModel)]="mp.id_metodo_pago"
                        class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                        <option [ngValue]="0" disabled>Seleccionar...</option>
                        @for (m of metodosPagoCatalogo; track m) {
                          <option [ngValue]="m.id">{{ m.nombre }}</option>
                        }
                      </select>
                      <input type="number" [(ngModel)]="mp.monto" (ngModelChange)="calcularSaldoCobro()" min="0" step="0.01"
                        class="w-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        placeholder="0.00" />
                      @if (nuevoCobro.metodos_pago.length > 1) {
                        <button (click)="removerMetodoPago(i)"
                          class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            <!-- Totals summary -->
            <div class="bg-slate-50 rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600 font-semibold">Monto Total</span>
                <span class="font-bold text-slate-900">\${{ nuevoCobro.monto_total | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600 font-semibold">Monto Pagado</span>
                <span class="font-bold text-emerald-600">\${{ nuevoCobroMontoPagado | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span class="font-bold" [ngClass]="nuevoCobroSaldoPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'">Saldo Pendiente</span>
                <span class="font-black text-lg" [ngClass]="nuevoCobroSaldoPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'">\${{ nuevoCobroSaldoPendiente | number:'1.2-2' }}</span>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex gap-3 pt-2">
              <button (click)="guardarCobro()" [disabled]="guardandoCobro"
                class="flex-1 px-6 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {{ guardandoCobro ? 'Guardando...' : 'Guardar Cobro' }}
              </button>
              <button (click)="closeNuevoCobro()"
                class="px-6 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- Cancel Confirmation Modal -->
    @if (showConfirmCancelarRecibo && reciboACancelar) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="showConfirmCancelarRecibo = false">
        <div class="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-slate-900">Cancelar Recibo</h2>
            <button (click)="showConfirmCancelarRecibo = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p class="text-center text-slate-700 text-lg font-semibold mb-1">&iquest;Cancelar este recibo?</p>
          <p class="text-center text-slate-500 text-sm mb-4">Recibo <span class="font-mono font-bold text-emerald-600">{{ reciboACancelar.folioVenta }}</span> por <span class="font-bold">\${{ reciboACancelar.montoTotal | number:'1.2-2' }}</span></p>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de cancelaci&oacute;n</label>
            <textarea [(ngModel)]="motivoCancelacion" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-sm resize-none" placeholder="Describe el motivo de la cancelaci&oacute;n..."></textarea>
          </div>
          <div class="flex gap-3 mt-4">
            <button (click)="cancelarRecibo()" [disabled]="cancelandoRecibo"
              class="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {{ cancelandoRecibo ? 'Cancelando...' : 'Confirmar Cancelaci\u00f3n' }}
            </button>
            <button (click)="showConfirmCancelarRecibo = false"
              class="px-6 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
              Volver
            </button>
          </div>
        </div>
      </div>
    }
    
    <app-footer></app-footer>
    `,
  styles: []
})
export class RecibosComponent implements OnInit {
  filtroFolio = '';
  filtroBeneficiario = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  loading = true;
  recibos: Recibo[] = [];
  recibosFiltrados: Recibo[] = [];
  recibosSort: TableSortState = { key: 'fechaVenta', direction: 'desc' };

  montoTotal = 0;
  montoEfectivo = 0;
  montoTarjeta = 0;
  montoTransferencia = 0;

  showDetalle = false;
  reciboSeleccionado: Recibo | null = null;

  // Cancel recibo state
  showConfirmCancelarRecibo = false;
  reciboACancelar: Recibo | null = null;
  motivoCancelacion = '';
  cancelandoRecibo = false;

  // Nuevo Cobro modal state
  showNuevoCobro = false;
  guardandoCobro = false;
  nuevoCobroError = '';
  beneficiariosList: BeneficiarioOption[] = [];
  // Beneficiario combobox state
  beneficiarioBusqueda = '';
  showBeneficiarioDropdown = false;
  beneficiariosFiltradosCobro: BeneficiarioOption[] = [];
  metodosPagoCatalogo: MetodoPagoCatalogo[] = [];
  serviciosCatalogo: ConceptoCobroOption[] = [];
  productosCatalogo: ConceptoCobroOption[] = [];
  nuevoCobroMontoPagado = 0;
  nuevoCobroSaldoPendiente = 0;
  conceptoPrecioUnitario = 0;

  nuevoConcepto = {
    tipo: 'SERVICIO' as 'SERVICIO' | 'PRODUCTO',
    id: 0,
    cantidad: 1
  };

  nuevoCobro = {
    id_paciente: 0,
    monto_total: 0,
    exento_pago: 'N',
    metodos_pago: [{ id_metodo_pago: 0, monto: 0 }] as MetodoPagoRow[]
  };

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.cargarRecibos();
    this.cargarStats();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nuevo') {
        setTimeout(() => this.openNuevoCobro(), 0);
      }
    });
  }

  private cargarRecibos(): void {
    this.loading = true;
    this.api.getRecibos().subscribe({
      next: (data: any[]) => {
        this.recibos = data.map((r: any) => ({
          idVenta: r.id_venta,
          folioVenta: r.folio_venta,
          idPaciente: r.id_paciente,
          nombrePaciente: r.nombre_paciente,
          folioPaciente: r.folio_paciente,
          fechaVenta: r.fecha_venta,
          montoTotal: r.monto_total,
          montoPagado: r.monto_pagado,
          saldoPendiente: r.saldo_pendiente,
          exentoPago: r.exento_pago,
          cancelada: r.cancelada,
          motivoCancelacion: r.motivo_cancelacion,
          metodosPago: (r.metodos_pago || []).map((mp: any) => ({
            idMetodoPago: mp.id_metodo_pago,
            nombre: mp.nombre,
            monto: mp.monto
          }))
        }));
        this.recibosFiltrados = this.sortRows(this.recibos, this.recibosSort, (recibo, key) => this.getReciboSortValue(recibo, key));
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar recibos:', err);
        this.loading = false;
      }
    });
  }

  private cargarStats(): void {
    this.api.getRecibosStats().subscribe({
      next: (stats: any) => {
        this.montoTotal = stats.monto_total_sum ?? 0;
        this.montoEfectivo = stats.monto_efectivo ?? 0;
        this.montoTarjeta = stats.monto_tarjeta ?? 0;
        this.montoTransferencia = stats.monto_transferencia ?? 0;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas de recibos:', err);
      }
    });
  }

  filtrarRecibos(): void {
    const filtrados = this.recibos.filter(r => {
      const matchFolio = !this.filtroFolio ||
        r.folioVenta.toLowerCase().includes(this.filtroFolio.toLowerCase());
      const matchBeneficiario = !this.filtroBeneficiario ||
        r.nombrePaciente.toLowerCase().includes(this.filtroBeneficiario.toLowerCase());
      let matchFechaInicio = true;
      let matchFechaFin = true;
      if (this.filtroFechaInicio && r.fechaVenta) {
        matchFechaInicio = r.fechaVenta.slice(0, 10) >= this.filtroFechaInicio;
      }
      if (this.filtroFechaFin && r.fechaVenta) {
        matchFechaFin = r.fechaVenta.slice(0, 10) <= this.filtroFechaFin;
      }
      return matchFolio && matchBeneficiario && matchFechaInicio && matchFechaFin;
    });
    this.recibosFiltrados = this.sortRows(filtrados, this.recibosSort, (recibo, key) => this.getReciboSortValue(recibo, key));
  }

  limpiarFiltros(): void {
    this.filtroFolio = '';
    this.filtroBeneficiario = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.recibosFiltrados = this.sortRows(this.recibos, this.recibosSort, (recibo, key) => this.getReciboSortValue(recibo, key));
  }

  toggleRecibosSort(key: string): void {
    if (this.recibosSort.key === key) {
      this.recibosSort.direction = this.recibosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.recibosSort = { key, direction: 'asc' };
    }
    this.filtrarRecibos();
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  private getReciboSortValue(recibo: Recibo, key: string): unknown {
    switch (key) {
      case 'folioVenta':
        return recibo.folioVenta;
      case 'nombrePaciente':
        return recibo.nombrePaciente;
      case 'fechaVenta':
        return recibo.fechaVenta;
      case 'montoTotal':
        return recibo.montoTotal;
      case 'montoPagado':
        return recibo.montoPagado;
      case 'saldoPendiente':
        return recibo.saldoPendiente;
      case 'pago':
        return this.getPagoLabel(recibo);
      case 'estado':
        return recibo.cancelada === 'S' ? 'cancelada' : (recibo.saldoPendiente === 0 ? 'pagada' : 'pendiente');
      default:
        return recibo.fechaVenta;
    }
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

  calcularEstadisticas(): void {
    this.montoTotal = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.montoTotal, 0);
    this.montoEfectivo = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'EFECTIVO').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTarjeta = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TARJETA').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTransferencia = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TRANSFERENCIA').reduce((s, mp) => s + mp.monto, 0), 0);
  }

  openNuevoCobro(): void {
    this.nuevoCobroError = '';
    this.guardandoCobro = false;
    this.nuevoCobro = {
      id_paciente: 0,
      monto_total: 0,
      exento_pago: 'N',
      metodos_pago: [{ id_metodo_pago: 0, monto: 0 }]
    };
    this.nuevoCobroMontoPagado = 0;
    this.nuevoCobroSaldoPendiente = 0;
    this.conceptoPrecioUnitario = 0;
    this.nuevoConcepto = { tipo: 'SERVICIO', id: 0, cantidad: 1 };
    this.beneficiarioBusqueda = '';
    this.showBeneficiarioDropdown = false;
    this.beneficiariosFiltradosCobro = [];

    // Load beneficiarios and metodos de pago
    this.api.getBeneficiarios().subscribe({
      next: (data: any[]) => {
        this.beneficiariosList = data.map((b: any) => ({
          id: b.id_paciente,
          folio: b.folio_paciente || b.folio,
          nombre: b.nombre_completo || ((b.nombre || '') + ' ' + (b.apellido_paterno || '') + ' ' + (b.apellido_materno || '')).trim(),
          tipoCuota: b.tipo_cuota || 'A'
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err)
    });

    this.api.getMetodosPago().subscribe({
      next: (data: any[]) => {
        this.metodosPagoCatalogo = data.map((m: any) => ({
          id: m.id_metodo_pago || m.id,
          nombre: m.nombre
        }));
      },
      error: (err) => console.error('Error al cargar metodos de pago:', err)
    });

    this.cargarCatalogoCobros();

    this.showNuevoCobro = true;
  }

  private cargarCatalogoCobros(): void {
    this.api.getServicios({ activo: 'S' }).subscribe({
      next: (data: any[]) => {
        this.serviciosCatalogo = data.map((s: any) => ({
          id: s.id_servicio,
          nombre: s.nombre,
          tipo: 'SERVICIO',
          precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
          precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
          precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? s.precio_cuota_b ?? 0),
        }));
      },
      error: (err) => console.error('Error al cargar servicios para cobro:', err)
    });

    this.api.getProductos({ activo: 'S' }).subscribe({
      next: (data: any[]) => {
        this.productosCatalogo = data.map((p: any) => ({
          id: p.id_producto,
          nombre: p.nombre,
          tipo: 'PRODUCTO',
          precioA: Number(p.precio_cuota_a ?? 0),
          precioB: Number(p.precio_cuota_b ?? 0),
          precioDefault: Number(p.precio_cuota_a ?? p.precio_cuota_b ?? 0),
        }));
      },
      error: (err) => console.error('Error al cargar productos para cobro:', err)
    });
  }

  get conceptosDisponibles(): ConceptoCobroOption[] {
    return this.nuevoConcepto.tipo === 'SERVICIO' ? this.serviciosCatalogo : this.productosCatalogo;
  }

  get tipoCuotaBeneficiarioSeleccionado(): string {
    const b = this.beneficiariosList.find(item => item.id === this.nuevoCobro.id_paciente);
    return b?.tipoCuota === 'B' ? 'B' : 'A';
  }

  onTipoConceptoChange(): void {
    this.nuevoConcepto.id = 0;
    this.nuevoConcepto.cantidad = 1;
    this.conceptoPrecioUnitario = 0;
  }

  onConceptoSeleccionadoChange(): void {
    this.recalcularMontoDesdeConcepto();
  }

  onCantidadConceptoChange(): void {
    if (!this.nuevoConcepto.cantidad || this.nuevoConcepto.cantidad < 1) {
      this.nuevoConcepto.cantidad = 1;
    }
    this.recalcularMontoDesdeConcepto();
  }

  onPacienteCobroChange(): void {
    this.recalcularMontoDesdeConcepto();
  }

  // ── Beneficiario combobox ──

  filtrarBeneficiariosCobro(): void {
    const q = this.beneficiarioBusqueda.toLowerCase().trim();
    this.nuevoCobro.id_paciente = 0; // clear selection while typing
    if (!q) {
      this.beneficiariosFiltradosCobro = this.beneficiariosList.slice(0, 10);
    } else {
      this.beneficiariosFiltradosCobro = this.beneficiariosList
        .filter(b =>
          b.nombre.toLowerCase().includes(q) ||
          (b.folio || '').toLowerCase().includes(q)
        )
        .slice(0, 20);
    }
    this.showBeneficiarioDropdown = true;
  }

  onBeneficiarioBusquedaFocus(): void {
    const q = this.beneficiarioBusqueda.toLowerCase().trim();
    this.beneficiariosFiltradosCobro = q
      ? this.beneficiariosList.filter(b => b.nombre.toLowerCase().includes(q) || (b.folio || '').toLowerCase().includes(q)).slice(0, 20)
      : this.beneficiariosList.slice(0, 10);
    this.showBeneficiarioDropdown = true;
  }

  onBeneficiarioBusquedaBlur(): void {
    setTimeout(() => { this.showBeneficiarioDropdown = false; }, 200);
  }

  seleccionarBeneficiarioCobro(b: BeneficiarioOption): void {
    this.nuevoCobro.id_paciente = b.id;
    this.beneficiarioBusqueda = `${b.folio} - ${b.nombre}`;
    this.showBeneficiarioDropdown = false;
    this.onPacienteCobroChange();
  }

  limpiarSeleccionBeneficiario(): void {
    this.nuevoCobro.id_paciente = 0;
    this.beneficiarioBusqueda = '';
    this.beneficiariosFiltradosCobro = this.beneficiariosList.slice(0, 10);
    this.recalcularMontoDesdeConcepto();
  }

  private recalcularMontoDesdeConcepto(): void {
    const selected = this.conceptosDisponibles.find(item => item.id === this.nuevoConcepto.id);
    if (!selected) {
      this.conceptoPrecioUnitario = 0;
      return;
    }

    const cuota = this.tipoCuotaBeneficiarioSeleccionado;
    let precio = cuota === 'B' ? selected.precioB : selected.precioA;
    if (!precio || precio <= 0) {
      precio = selected.precioDefault || 0;
    }

    this.conceptoPrecioUnitario = precio;
    const cantidad = this.nuevoConcepto.cantidad || 1;
    this.nuevoCobro.monto_total = Number((precio * cantidad).toFixed(2));
    this.calcularSaldoCobro();
  }

  closeNuevoCobro(): void {
    this.showNuevoCobro = false;
  }

  agregarMetodoPago(): void {
    this.nuevoCobro.metodos_pago.push({ id_metodo_pago: 0, monto: 0 });
  }

  removerMetodoPago(index: number): void {
    this.nuevoCobro.metodos_pago.splice(index, 1);
    this.calcularSaldoCobro();
  }

  calcularSaldoCobro(): void {
    this.nuevoCobroMontoPagado = this.nuevoCobro.metodos_pago.reduce((sum, mp) => sum + (mp.monto || 0), 0);
    this.nuevoCobroSaldoPendiente = (this.nuevoCobro.monto_total || 0) - this.nuevoCobroMontoPagado;
    if (this.nuevoCobroSaldoPendiente < 0) {
      this.nuevoCobroSaldoPendiente = 0;
    }
  }

  guardarCobro(): void {
    // Validation
    if (!this.nuevoCobro.id_paciente) {
      this.nuevoCobroError = 'Selecciona un paciente.';
      return;
    }
    if (!this.nuevoCobro.monto_total || this.nuevoCobro.monto_total <= 0) {
      this.nuevoCobroError = 'El monto total debe ser mayor a 0.';
      return;
    }
    const metodosValidos = this.nuevoCobro.metodos_pago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (this.nuevoCobro.exento_pago !== 'S' && metodosValidos.length === 0) {
      this.nuevoCobroError = 'Agrega al menos un metodo de pago con monto.';
      return;
    }

    this.nuevoCobroError = '';
    this.guardandoCobro = true;

    const payload = {
      id_paciente: this.nuevoCobro.id_paciente,
      monto_total: this.nuevoCobro.monto_total,
      monto_pagado: this.nuevoCobroMontoPagado,
      saldo_pendiente: this.nuevoCobroSaldoPendiente,
      exento_pago: this.nuevoCobro.exento_pago,
      metodos_pago: metodosValidos.map(mp => ({
        id_metodo_pago: mp.id_metodo_pago,
        monto: mp.monto
      }))
    };

    this.api.createRecibo(payload).subscribe({
      next: () => {
        this.guardandoCobro = false;
        this.showNuevoCobro = false;
        this.cargarRecibos();
        this.cargarStats();
      },
      error: (err) => {
        this.guardandoCobro = false;
        this.nuevoCobroError = err?.error?.detail || 'Error al crear el recibo. Intenta de nuevo.';
        console.error('Error al crear recibo:', err);
      }
    });
  }

  verDetalle(recibo: Recibo): void {
    this.reciboSeleccionado = recibo;
    this.showDetalle = true;
  }

  closeDetalle(): void {
    this.showDetalle = false;
    this.reciboSeleccionado = null;
  }

  confirmarCancelarRecibo(recibo: Recibo): void {
    this.reciboACancelar = recibo;
    this.motivoCancelacion = '';
    this.cancelandoRecibo = false;
    this.showConfirmCancelarRecibo = true;
  }

  cancelarRecibo(): void {
    if (!this.reciboACancelar) return;
    this.cancelandoRecibo = true;
    this.api.cancelarRecibo(this.reciboACancelar.idVenta, this.motivoCancelacion || undefined).subscribe({
      next: () => {
        this.cancelandoRecibo = false;
        this.showConfirmCancelarRecibo = false;
        this.reciboACancelar = null;
        this.cargarRecibos();
        this.cargarStats();
      },
      error: (err) => {
        this.cancelandoRecibo = false;
        console.error('Error al cancelar recibo:', err);
      }
    });
  }

  onExentoPagoChange(): void {
    if (this.nuevoCobro.exento_pago === 'S') {
      // Auto-select EXENTO method covering the full amount
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      if (exentoMethod) {
        this.nuevoCobro.metodos_pago = [{ id_metodo_pago: exentoMethod.id, monto: this.nuevoCobro.monto_total || 0 }];
      } else {
        this.nuevoCobro.metodos_pago = [];
      }
    } else {
      // Restore a blank payment slot
      this.nuevoCobro.metodos_pago = [{ id_metodo_pago: 0, monto: 0 }];
    }
    this.calcularSaldoCobro();
  }

  getPagoLabel(recibo: Recibo): string {
    if (!recibo.metodosPago || recibo.metodosPago.length === 0) return '\u2014';
    if (recibo.metodosPago.length === 1) return recibo.metodosPago[0].nombre;
    // Mixed payment: prefer EFECTIVO as the primary label, add "+" indicator
    const primary = recibo.metodosPago.find(mp => mp.nombre === 'EFECTIVO')
      || recibo.metodosPago.find(mp => mp.nombre !== 'EXENTO' && mp.nombre !== 'PENDIENTE')
      || recibo.metodosPago[0];
    return primary.nombre + ' +';
  }

  getPagoLabelClass(recibo: Recibo): string {
    const label = this.getPagoLabel(recibo).replace(' +', '');
    const map: Record<string, string> = {
      'EFECTIVO': 'text-emerald-600',
      'TARJETA': 'text-blue-600',
      'TRANSFERENCIA': 'text-purple-600',
      'EXENTO': 'text-slate-500',
      'PENDIENTE': 'text-amber-600',
    };
    return map[label] || 'text-slate-700';
  }
}
