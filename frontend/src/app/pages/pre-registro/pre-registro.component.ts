import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';

interface DocumentoPendiente {
  id: number;
  tipoId: number;
  file: File | null;
}

@Component({
  selector: 'app-pre-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pre-registro.component.html',
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
  documentosPendientes: DocumentoPendiente[] = [{ id: 1, tipoId: 0, file: null }];
  private siguienteDocumentoPendienteId = 2;
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

    // Step 1: CURP must match official Mexican CURP format
    if (step === 1 && this.formData.curp) {
      const curpRegex = /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
      if (!curpRegex.test(this.formData.curp.trim().toUpperCase())) {
        this.invalidFields.push('curp');
        this.stepError = 'El CURP no tiene el formato correcto (18 caracteres con el patrón oficial).';
      }
    }

    if (this.invalidFields.length > 0) {
      if (!this.stepError) {
        this.stepError = 'Por favor completa todos los campos obligatorios marcados con *';
      }
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
      tipo_cuota: 'CUOTA A',
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
        const detail = err?.error?.detail;
        if (detail && detail.includes('folio o CURP')) {
          this.stepError = 'Ya existe un registro con ese CURP. Si ya enviaste un pre-registro, cont\u00e1ctanos.';
        } else {
          this.stepError = detail || 'Ocurri\u00f3 un error al guardar. Intenta de nuevo.';
        }
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

  get hayDocumentosListos(): boolean {
    return this.documentosPendientes.some((doc) => doc.tipoId !== 0 && !!doc.file);
  }

  agregarDocumentoPendiente(): void {
    this.documentosPendientes.push({
      id: this.siguienteDocumentoPendienteId++,
      tipoId: 0,
      file: null,
    });
  }

  quitarDocumentoPendiente(id: number): void {
    if (this.documentosPendientes.length === 1) return;
    this.documentosPendientes = this.documentosPendientes.filter((doc) => doc.id !== id);
  }

  onDocFileSelected(event: Event, doc: DocumentoPendiente): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      doc.file = input.files[0];
    }
    input.value = '';
  }

  subirDocumentosPendientes(): void {
    if (!this.createdPacienteId) return;
    const docsListos = this.documentosPendientes.filter((doc) => doc.tipoId !== 0 && doc.file);
    if (docsListos.length === 0) return;
    this.subiendoDoc = true;
    const uploads = docsListos.map((doc) => this.api.uploadDocumento(this.createdPacienteId!, doc.tipoId, doc.file!));
    forkJoin(uploads).subscribe({
      next: () => {
        this.subiendoDoc = false;
        this.documentosPendientes = [{ id: this.siguienteDocumentoPendienteId++, tipoId: 0, file: null }];
        this.cargarDocumentos();
      },
      error: (err) => {
        console.error('Error al subir documentos:', err);
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
