import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
  templateUrl: './beneficiarios.component.html',
})
export class BeneficiariosComponent implements OnInit, OnDestroy {
  currentTab: 'activos' | 'preregistros' = 'activos';
  searchTermBeneficiarios = '';
  searchTermPreregistros = '';

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

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  constructor(private api: ApiService, private route: ActivatedRoute, private auth: AuthService) {}

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

  private readonly CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

  submitNuevoBeneficiario(): void {
    if (!this.formData.nombre || !this.formData.apellido_paterno || !this.formData.genero ||
        !this.formData.fecha_nacimiento || !this.formData.curp || !this.formData.tipo_cuota ||
        !this.formData.membresia_estatus) {
      this.nuevoError = 'Por favor completa todos los campos obligatorios marcados con *.';
      return;
    }
    if (!this.CURP_REGEX.test(this.formData.curp.trim().toUpperCase())) {
      this.nuevoError = 'El CURP no tiene el formato correcto (18 caracteres con el patrón oficial mexicano).';
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
    if (this.searchTermBeneficiarios) filters.busqueda = this.searchTermBeneficiarios;
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 150);
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

  filterBeneficiarios(): void {
    const term = this.searchTermBeneficiarios.toLowerCase().trim();
    this.filteredBeneficiarios = this.beneficiarios.filter(b =>
      b.nombre.toLowerCase().includes(term) ||
      b.apellidoPaterno.toLowerCase().includes(term) ||
      b.apellidoMaterno.toLowerCase().includes(term) ||
      b.folio.toLowerCase().includes(term) ||
      b.curp.toLowerCase().includes(term) ||
      b.membresiaEstatus.toLowerCase().includes(term) ||
      b.tipoCuota.toLowerCase().includes(term)
    );
    this.beneficiariosPage = 1;
  }

  filterPreregistros(): void {
    const term = this.searchTermPreregistros.toLowerCase().trim();
    this.filteredPreregistros = this.preregistros.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.apellidoPaterno.toLowerCase().includes(term) ||
      p.apellidoMaterno.toLowerCase().includes(term) ||
      p.id.toString().includes(term) ||
      p.curp.toLowerCase().includes(term) ||
      p.tipoCuota.toLowerCase().includes(term)
    );
    this.preregistrosPage = 1;
  }

  filterData(): void {
    this.filterBeneficiarios();
    this.filterPreregistros();
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
    if (!this.CURP_REGEX.test(this.editFormData.curp.trim().toUpperCase())) {
      this.editError = 'El CURP no tiene el formato correcto (18 caracteres con el patrón oficial mexicano).';
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
