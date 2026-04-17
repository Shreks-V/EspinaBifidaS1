import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-pre-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] py-8 px-4">
      <div class="max-w-4xl mx-auto">
    
        <!-- Back button -->
        <button (click)="router.navigate(['/'])" class="flex items-center gap-2 text-slate-600 hover:text-[#00328b] mb-6 font-semibold transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Volver al inicio
        </button>
    
        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
          <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          </div>
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">Pre-registro de Beneficiario</h1>
            <p class="text-slate-600 font-semibold">Completa el formulario para solicitar tu registro</p>
          </div>
        </div>
    
        <!-- Success Screen -->
        @if (submitted) {
          <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-12 text-center">
            <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 class="text-3xl font-black text-slate-900 mb-3">&iexcl;Pre-registro Enviado!</h2>
            <p class="text-slate-600 text-lg mb-8 max-w-md mx-auto">Tu solicitud ha sido recibida. Un administrador revisar&aacute; tu informaci&oacute;n y te contactar&aacute; pronto.</p>
            <button (click)="router.navigate(['/'])" class="px-8 py-3 bg-[#00328b] hover:bg-[#00246d] text-white rounded-2xl font-bold shadow-lg transition-all">
              Volver al Inicio
            </button>
          </div>
        }
    
        <!-- Form -->
        @if (!submitted) {
          <div>
            <!-- Progress Steps -->
            <div class="flex items-center justify-between mb-8 px-4">
              @for (s of steps; track s; let i = $index) {
                <div class="flex flex-col items-center" [class.flex-1]="true">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                     [ngClass]="{
                       'bg-emerald-500 text-white': currentStep > i + 1,
                       'bg-[#00328b] text-white shadow-lg scale-110': currentStep === i + 1,
                       'bg-slate-200 text-slate-500': currentStep < i + 1
                     }">
                    @if (currentStep > i + 1) {
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    }
                    @if (currentStep <= i + 1) {
                      <span>{{ i + 1 }}</span>
                    }
                  </div>
                  <span class="text-xs font-semibold mt-2 text-center" [ngClass]="currentStep >= i + 1 ? 'text-[#00328b]' : 'text-slate-400'">{{ s }}</span>
                </div>
                @if (i < steps.length - 1) {
                  <div class="flex-1 h-1 rounded-full mx-2 mt-[-20px]"
                  [ngClass]="currentStep > i + 1 ? 'bg-emerald-400' : 'bg-slate-200'"></div>
                }
              }
            </div>
            <!-- Validation Error -->
            @if (stepError) {
              <div class="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span class="text-sm font-semibold text-red-700">{{ stepError }}</span>
              </div>
            }
            <!-- Step Content Card -->
            <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-8">
              <!-- Step 1: Datos Personales -->
              @if (currentStep === 1) {
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Datos Personales
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.nombre" [class]="getFieldClass('nombre')" placeholder="Nombre(s)">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Apellido Paterno <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.apellidoPaterno" [class]="getFieldClass('apellidoPaterno')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Apellido Materno <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.apellidoMaterno" [class]="getFieldClass('apellidoMaterno')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento <span class="text-red-500">*</span></label>
                      <input type="date" [(ngModel)]="formData.fechaNacimiento" [class]="getFieldClass('fechaNacimiento')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Sexo <span class="text-red-500">*</span></label>
                      <select [(ngModel)]="formData.sexo" [class]="getFieldClass('sexo') + ' bg-white'">
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">CURP <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.curp" [class]="getFieldClass('curp') + ' uppercase'" maxlength="18" placeholder="18 caracteres">
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Nombre del Padre/Madre <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.nombrePadreMadre" [class]="getFieldClass('nombrePadreMadre')">
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Fotograf&iacute;a</label>
                      <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#00328b] transition-colors cursor-pointer" (click)="fileInput.click()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        @if (!fotografiaName) {
                          <p class="text-sm text-slate-500 font-semibold">Haz clic para subir una fotograf&iacute;a</p>
                        }
                        @if (fotografiaName) {
                          <p class="text-sm text-emerald-600 font-bold">{{ fotografiaName }}</p>
                        }
                        <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)">
                      </div>
                    </div>
                  </div>
                </div>
              }
              <!-- Step 2: Direcci&oacute;n -->
              @if (currentStep === 2) {
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Direcci&oacute;n
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Calle <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.calle" [class]="getFieldClass('calle')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">N&uacute;mero Exterior <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.numeroExterior" [class]="getFieldClass('numeroExterior')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">N&uacute;mero Interior</label>
                      <input type="text" [(ngModel)]="formData.numeroInterior" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Colonia <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.colonia" [class]="getFieldClass('colonia')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Municipio <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.municipio" [class]="getFieldClass('municipio')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Ciudad <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.ciudad" [class]="getFieldClass('ciudad')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Estado <span class="text-red-500">*</span></label>
                      <select [(ngModel)]="formData.estado" [class]="getFieldClass('estado') + ' bg-white'">
                        <option value="">Seleccionar...</option>
                        @for (e of estados; track e) {
                          <option [value]="e">{{ e }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">C&oacute;digo Postal <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.codigoPostal" [class]="getFieldClass('codigoPostal')" maxlength="5">
                    </div>
                  </div>
                </div>
              }
              <!-- Step 3: Contacto y Emergencia -->
              @if (currentStep === 3) {
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Contacto y Emergencia
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Tel&eacute;fono Casa</label>
                      <input type="tel" [(ngModel)]="formData.telefonoCasa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Tel&eacute;fono Celular <span class="text-red-500">*</span></label>
                      <input type="tel" [(ngModel)]="formData.telefonoCelular" [class]="getFieldClass('telefonoCelular')">
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Correo Electr&oacute;nico</label>
                      <input type="email" [(ngModel)]="formData.correoElectronico" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                    </div>
                    <div class="md:col-span-2 border-t-2 border-slate-100 pt-5 mt-2">
                      <h3 class="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                        Contacto de Emergencia
                      </h3>
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">En Emergencia Avisar a <span class="text-red-500">*</span></label>
                      <input type="text" [(ngModel)]="formData.enEmergenciaAvisarA" [class]="getFieldClass('enEmergenciaAvisarA')">
                    </div>
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Tel&eacute;fono de Emergencia <span class="text-red-500">*</span></label>
                      <input type="tel" [(ngModel)]="formData.telefonoEmergencia" [class]="getFieldClass('telefonoEmergencia')">
                    </div>
                    <div class="md:col-span-2 mt-4">
                      <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" [(ngModel)]="formData.requiereTutor" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]">
                        <span class="text-sm font-bold text-slate-700">&iquest;Requiere tutor?</span>
                      </label>
                    </div>
                    @if (formData.requiereTutor) {
                      <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Nombre del Tutor <span class="text-red-500">*</span></label>
                        <input type="text" [(ngModel)]="formData.nombreTutor" [class]="getFieldClass('nombreTutor')">
                      </div>
                      <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Tel&eacute;fono del Tutor <span class="text-red-500">*</span></label>
                        <input type="tel" [(ngModel)]="formData.telefonoTutor" [class]="getFieldClass('telefonoTutor')">
                      </div>
                      <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Relaci&oacute;n con el beneficiario <span class="text-red-500">*</span></label>
                        <input type="text" [(ngModel)]="formData.relacionTutor" [class]="getFieldClass('relacionTutor')" placeholder="Ej: Padre, Madre, T&iacute;o...">
                      </div>
                    }
                  </div>
                </div>
              }
              <!-- Step 4: Informaci&oacute;n M&eacute;dica -->
              @if (currentStep === 4) {
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    Informaci&oacute;n M&eacute;dica
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-1">Tipo de Sangre <span class="text-red-500">*</span></label>
                      <select [(ngModel)]="formData.tipoSangre" [class]="getFieldClass('tipoSangre') + ' bg-white'">
                        <option value="">Seleccionar...</option>
                        @for (t of tiposSangre; track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="flex items-center gap-3 cursor-pointer mt-7">
                        <input type="checkbox" [(ngModel)]="formData.usaValvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]">
                        <span class="text-sm font-bold text-slate-700">&iquest;Usa v&aacute;lvula?</span>
                      </label>
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-2">Tipo(s) de Espina B&iacute;fida <span class="text-red-500">*</span></label>
                      <p class="text-xs text-slate-500 mb-3">Puedes seleccionar uno o m&aacute;s tipos</p>
                      @if (tiposEspinaList.length > 0) {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          @for (tipo of tiposEspinaList; track tipo) {
                            <label
                              class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                              [ngClass]="isEspinaSelected(tipo.id_tipo_espina) ? 'border-[#00328b] bg-blue-50' : 'border-slate-200 hover:border-slate-300'">
                              <input type="checkbox"
                                [checked]="isEspinaSelected(tipo.id_tipo_espina)"
                                (change)="toggleEspina(tipo.id_tipo_espina)"
                                class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]">
                              <div>
                                <span class="text-sm font-bold text-slate-800">{{ tipo.nombre }}</span>
                                @if (tipo.descripcion) {
                                  <p class="text-xs text-slate-500">{{ tipo.descripcion }}</p>
                                }
                              </div>
                            </label>
                          }
                        </div>
                      }
                      @if (tiposEspinaList.length === 0) {
                        <p class="text-sm text-slate-400 italic">Cargando tipos...</p>
                      }
                      @if (validationAttempted && formData.tiposEspinaIds.length === 0) {
                        <p class="text-xs text-red-500 font-semibold mt-2">Selecciona al menos un tipo de espina b&iacute;fida</p>
                      }
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Alergias</label>
                      <textarea [(ngModel)]="formData.alergias" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Describe alergias conocidas..."></textarea>
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Medicamentos Actuales</label>
                      <textarea [(ngModel)]="formData.medicamentosActuales" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Lista de medicamentos que toma actualmente..."></textarea>
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-sm font-bold text-slate-700 mb-1">Notas Adicionales</label>
                      <textarea [(ngModel)]="formData.notasAdicionales" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Informaci&oacute;n adicional relevante..."></textarea>
                    </div>
                  </div>
                </div>
              }
              <!-- Step 5: Documentos -->
              @if (currentStep === 5) {
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Documentos
                  </h2>
                  <p class="text-sm text-slate-600 mb-6">Sube los documentos requeridos para completar tu pre-registro. Puedes subir m&uacute;ltiples archivos.</p>
                  <!-- Uploaded Documents List -->
                  @if (documentosSubidos.length > 0) {
                    <div class="mb-6 space-y-3">
                      <h3 class="text-sm font-bold text-slate-700 mb-2">Documentos subidos</h3>
                      @for (doc of documentosSubidos; track doc) {
                        <div class="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div>
                              <p class="text-sm font-bold text-slate-800">{{ doc.nombre_archivo }}</p>
                              <p class="text-xs text-slate-500">{{ doc.tipo_nombre || 'Documento' }} &middot; {{ doc.formato_archivo }}</p>
                            </div>
                          </div>
                          <button (click)="eliminarDocumento(doc)" class="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      }
                    </div>
                  }
                  <!-- Upload New Document -->
                  <div class="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
                    <h3 class="text-sm font-bold text-slate-700 mb-4">Subir nuevo documento</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Tipo de Documento</label>
                        <select [(ngModel)]="nuevoDocTipoId" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-all text-sm bg-white">
                          <option [ngValue]="0">Seleccionar tipo...</option>
                          @for (td of tiposDocumento; track td) {
                            <option [ngValue]="td.id_tipo_documento">{{ td.nombre }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Archivo</label>
                        <div class="flex items-center gap-3">
                          <button (click)="docFileInput.click()" class="flex-1 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-[#00328b] hover:text-[#00328b] transition-all text-left truncate">
                            {{ nuevoDocFile ? nuevoDocFile.name : 'Seleccionar archivo...' }}
                          </button>
                          <input #docFileInput type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" (change)="onDocFileSelected($event)">
                        </div>
                      </div>
                    </div>
                    <button (click)="subirDocumento()" [disabled]="subiendoDoc || !nuevoDocFile || nuevoDocTipoId === 0"
                      class="px-6 py-2.5 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {{ subiendoDoc ? 'Subiendo...' : 'Subir Documento' }}
                    </button>
                  </div>
                  <p class="text-xs text-slate-400 mt-4 italic">Formatos aceptados: PDF, JPG, PNG, DOC, DOCX. Este paso es opcional, puedes enviar el pre-registro sin documentos.</p>
                </div>
              }
              <!-- Navigation Buttons -->
              <div class="flex justify-between mt-8 pt-6 border-t-2 border-slate-100">
                @if (currentStep > 1) {
                  <button (click)="prevStep()"
                    class="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    Anterior
                  </button>
                }
                @if (currentStep === 1) {
                  <div></div>
                }
                @if (currentStep < 5) {
                  <button (click)="nextStep()"
                    class="px-8 py-3 bg-[#00328b] hover:bg-[#00246d] text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                    Siguiente
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                }
                @if (currentStep === 5) {
                  <button (click)="submitForm()" [disabled]="submitting"
                    class="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {{ submitting ? 'Enviando...' : 'Enviar Pre-registro' }}
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
    `,
  styles: []
})
export class PreRegistroComponent implements OnInit {
  router = inject(Router);
  private api = inject(ApiService);
  currentStep = 1;
  submitted = false;
  submitting = false;
  fotografiaName = '';
  stepError = '';
  validationAttempted = false;
  invalidFields: string[] = [];

  // Created paciente ID (for document upload in step 5)
  createdPacienteId: number | null = null;

  steps = ['Datos Personales', 'Direcci\u00f3n', 'Contacto', 'Info. M\u00e9dica', 'Documentos'];

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  tiposEspinaList: any[] = [];
  tiposDocumento: any[] = [];

  estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Ciudad de M\u00e9xico', 'Coahuila', 'Colima', 'Durango', 'Estado de M\u00e9xico', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'Michoac\u00e1n', 'Morelos', 'Nayarit', 'Nuevo Le\u00f3n',
    'Oaxaca', 'Puebla', 'Quer\u00e9taro', 'Quintana Roo', 'San Luis Potos\u00ed', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucat\u00e1n', 'Zacatecas'
  ];

  formData: any = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', sexo: '', curp: '', nombrePadreMadre: '',
    calle: '', numeroExterior: '', numeroInterior: '',
    colonia: '', municipio: '', ciudad: '', estado: '', codigoPostal: '',
    telefonoCasa: '', telefonoCelular: '', correoElectronico: '',
    enEmergenciaAvisarA: '', telefonoEmergencia: '',
    requiereTutor: false, nombreTutor: '', telefonoTutor: '', relacionTutor: '',
    tipoSangre: '', usaValvula: false,
    tiposEspinaIds: [] as number[],
    alergias: '', medicamentosActuales: '', notasAdicionales: ''
  };

  // Document upload state
  documentosSubidos: any[] = [];
  nuevoDocTipoId = 0;
  nuevoDocFile: File | null = null;
  subiendoDoc = false;

  // Validation rules per step
  private requiredByStep: { [step: number]: string[] } = {
    1: ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'curp', 'nombrePadreMadre'],
    2: ['calle', 'numeroExterior', 'colonia', 'municipio', 'ciudad', 'estado', 'codigoPostal'],
    3: ['telefonoCelular', 'enEmergenciaAvisarA', 'telefonoEmergencia'],
    4: ['tipoSangre'],
  };

  ngOnInit(): void {
    this.api.getTiposEspinaPublic().subscribe({
      next: (data) => { this.tiposEspinaList = data; },
      error: (err) => console.error('Error cargando tipos de espina:', err),
    });
    this.api.getTiposDocumentoPublic().subscribe({
      next: (data) => { this.tiposDocumento = data; },
      error: (err) => console.error('Error cargando tipos de documento:', err),
    });
  }

  getFieldClass(field: string): string {
    const base = 'w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition-all';
    if (this.invalidFields.includes(field)) {
      return `${base} border-red-400 focus:border-red-500 focus:ring-red-100`;
    }
    return `${base} border-slate-200 focus:border-[#00328b] focus:ring-[#00328b]/10`;
  }

  isEspinaSelected(id: number): boolean {
    return this.formData.tiposEspinaIds.includes(id);
  }

  toggleEspina(id: number): void {
    const idx = this.formData.tiposEspinaIds.indexOf(id);
    if (idx >= 0) {
      this.formData.tiposEspinaIds.splice(idx, 1);
    } else {
      this.formData.tiposEspinaIds.push(id);
    }
  }

  validateStep(step: number): boolean {
    this.invalidFields = [];
    this.stepError = '';
    this.validationAttempted = true;

    const required = this.requiredByStep[step] || [];
    for (const field of required) {
      const val = this.formData[field];
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        this.invalidFields.push(field);
      }
    }

    // Step 3: tutor fields if requiereTutor
    if (step === 3 && this.formData.requiereTutor) {
      for (const f of ['nombreTutor', 'telefonoTutor', 'relacionTutor']) {
        if (!this.formData[f] || this.formData[f].trim() === '') {
          this.invalidFields.push(f);
        }
      }
    }

    // Step 4: at least one tipo de espina
    if (step === 4 && this.formData.tiposEspinaIds.length === 0) {
      this.invalidFields.push('tiposEspinaIds');
    }

    // Step 1: CURP must be 18 chars
    if (step === 1 && this.formData.curp && this.formData.curp.trim().length !== 18) {
      this.invalidFields.push('curp');
    }

    if (this.invalidFields.length > 0) {
      this.stepError = 'Por favor completa todos los campos obligatorios marcados con *';
      return false;
    }

    return true;
  }

  nextStep(): void {
    if (!this.validateStep(this.currentStep)) return;
    this.validationAttempted = false;
    this.invalidFields = [];
    this.stepError = '';

    // After step 4 (medical info), create the pre-registro first so step 5 can upload docs
    if (this.currentStep === 4 && !this.createdPacienteId) {
      this.crearPreRegistroParaDocumentos();
      return;
    }

    if (this.currentStep < 5) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private crearPreRegistroParaDocumentos(): void {
    this.submitting = true;
    const notasParts = [];
    if (this.formData.alergias) notasParts.push(`Alergias: ${this.formData.alergias}`);
    if (this.formData.medicamentosActuales) notasParts.push(`Medicamentos: ${this.formData.medicamentosActuales}`);
    if (this.formData.notasAdicionales) notasParts.push(this.formData.notasAdicionales);

    const payload = {
      nombre: this.formData.nombre,
      apellido_paterno: this.formData.apellidoPaterno,
      apellido_materno: this.formData.apellidoMaterno,
      fecha_nacimiento: this.formData.fechaNacimiento,
      genero: this.formData.sexo,
      curp: this.formData.curp,
      estado_nacimiento: this.formData.estado,
      hospital_nacimiento: '',
      nombre_padre_madre: this.formData.nombrePadreMadre,
      direccion: [this.formData.calle, this.formData.numeroExterior, this.formData.numeroInterior].filter(Boolean).join(' '),
      colonia: this.formData.colonia,
      ciudad: this.formData.ciudad,
      estado: this.formData.estado,
      codigo_postal: this.formData.codigoPostal,
      telefono_casa: this.formData.telefonoCasa,
      telefono_celular: this.formData.telefonoCelular,
      correo_electronico: this.formData.correoElectronico,
      en_emergencia_avisar_a: this.formData.enEmergenciaAvisarA,
      telefono_emergencia: this.formData.telefonoEmergencia,
      tipo_sangre: this.formData.tipoSangre,
      usa_valvula: this.formData.usaValvula ? 'S' : 'N',
      tipo_cuota: 'A',
      notas_adicionales: notasParts.join(' | '),
      paso_actual: 5,
      tipos_espina: this.formData.tiposEspinaIds,
    };

    this.api.createPreRegistro(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.createdPacienteId = res.id_paciente;
        if (res.preregistro_token) {
          sessionStorage.setItem('preregistro_token', res.preregistro_token);
        }
        this.currentStep = 5;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Error al crear pre-registro:', err);
        this.stepError = 'Ocurri\u00f3 un error al guardar. Intenta de nuevo.';
      },
    });
  }

  prevStep(): void {
    this.stepError = '';
    this.invalidFields = [];
    this.validationAttempted = false;
    if (this.currentStep > 1) this.currentStep--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fotografiaName = input.files[0].name;
    }
  }

  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.nuevoDocFile = input.files[0];
    }
  }

  subirDocumento(): void {
    if (!this.nuevoDocFile || this.nuevoDocTipoId === 0 || !this.createdPacienteId) return;
    this.subiendoDoc = true;
    this.api.uploadDocumento(this.createdPacienteId, this.nuevoDocTipoId, this.nuevoDocFile).subscribe({
      next: () => {
        this.subiendoDoc = false;
        this.nuevoDocFile = null;
        this.nuevoDocTipoId = 0;
        this.cargarDocumentos();
      },
      error: (err) => {
        console.error('Error al subir documento:', err);
        this.subiendoDoc = false;
      },
    });
  }

  eliminarDocumento(doc: any): void {
    if (!this.createdPacienteId) return;
    this.api.deleteDocumento(this.createdPacienteId, doc.id_documento).subscribe({
      next: () => this.cargarDocumentos(),
      error: (err) => console.error('Error al eliminar documento:', err),
    });
  }

  private cargarDocumentos(): void {
    if (!this.createdPacienteId) return;
    this.api.getDocumentos(this.createdPacienteId).subscribe({
      next: (data) => { this.documentosSubidos = data; },
      error: (err) => console.error('Error al cargar documentos:', err),
    });
  }

  submitForm(): void {
    // Pre-registro was already created when moving from step 4 to 5
    this.submitted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
