import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './citas.component.html',
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
  nuevaCitaIdDoctor: number | null = null;
  nuevaCitaServiciosFiltrados: any[] = [];
  nuevaCitaLoadingServicios = false;
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

  // Disponibilidad especial
  disponibilidadEspecial: any[] = [];
  guardandoDispEspecial = false;
  dispEspecialError = '';
  nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };

  diasSemana = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miercoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sabado' },
    { num: 7, nombre: 'Domingo' },
  ];

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  constructor(private api: ApiService, private route: ActivatedRoute, private auth: AuthService) {}

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
    this.nuevaCitaIdDoctor = null;
    this.nuevaCitaServiciosFiltrados = this.serviciosList;
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

  onDoctorNuevaCitaChange(): void {
    this.nuevaCita.servicios.forEach((s: any) => { s.id_servicio = null; s.monto_pagado = 0; });
    if (!this.nuevaCitaIdDoctor) {
      this.nuevaCitaServiciosFiltrados = this.serviciosList;
      return;
    }
    this.nuevaCitaLoadingServicios = true;
    this.api.getDoctorServicios(this.nuevaCitaIdDoctor).subscribe({
      next: (doctorServs: any[]) => {
        const ids = new Set(doctorServs.map((s: any) => s.id_servicio));
        this.nuevaCitaServiciosFiltrados = this.serviciosList.filter(s => ids.has(s.id_servicio));
        this.nuevaCitaLoadingServicios = false;
      },
      error: () => {
        this.nuevaCitaServiciosFiltrados = this.serviciosList;
        this.nuevaCitaLoadingServicios = false;
      },
    });
  }

  onServicioNuevaCitaChange(srv: any): void {
    if (!srv.id_servicio) { srv.monto_pagado = 0; return; }
    const found = this.serviciosList.find((s: any) => s.id_servicio === srv.id_servicio);
    if (found) {
      srv.monto_pagado = found.cuota_recuperacion ?? found.precio_cuota_a ?? 0;
    }
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
          id_doctor: this.nuevaCitaIdDoctor ?? null,
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 150);
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
    this.disponibilidadEspecial = [];
    this.disponibilidadError = '';
    this.dispEspecialError = '';
    this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
    this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
    this.showDisponibilidadModal = true;
    this.cargarDisponibilidad(medico.idDoctor);
    this.cargarDisponibilidadEspecial(medico.idDoctor);
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

  cargarDisponibilidadEspecial(idDoctor: number): void {
    this.api.getDoctorDisponibilidadEspecial(idDoctor).subscribe({
      next: (data) => { this.disponibilidadEspecial = data; },
      error: (err) => console.error('Error al cargar disponibilidad especial:', err),
    });
  }

  tipoRecurrenciaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'UNICA': 'Única vez',
      'QUINCENAL': 'Quincenal',
      'CADA_3_SEMANAS': 'Cada 3 sem.',
      'MENSUAL': 'Mensual',
    };
    return labels[tipo] || tipo;
  }

  agregarDispEspecial(): void {
    if (!this.nuevoDispEspecial.fecha_inicio || !this.nuevoDispEspecial.hora_inicio || !this.nuevoDispEspecial.hora_fin) return;
    this.dispEspecialError = '';
    if (this.nuevoDispEspecial.hora_inicio >= this.nuevoDispEspecial.hora_fin) {
      this.dispEspecialError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    this.guardandoDispEspecial = true;
    const payload = {
      fecha_inicio: this.nuevoDispEspecial.fecha_inicio,
      hora_inicio: this.nuevoDispEspecial.hora_inicio,
      hora_fin: this.nuevoDispEspecial.hora_fin,
      tipo_recurrencia: this.nuevoDispEspecial.tipo_recurrencia,
      descripcion: this.nuevoDispEspecial.descripcion || null,
    };
    this.api.createDoctorDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor, payload).subscribe({
      next: () => {
        this.guardandoDispEspecial = false;
        this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
        this.cargarDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor);
      },
      error: (err) => {
        this.guardandoDispEspecial = false;
        this.dispEspecialError = err?.error?.detail || 'Error al guardar la disponibilidad especial.';
      },
    });
  }

  eliminarDispEspecial(de: any): void {
    if (!this.disponibilidadDoctor) return;
    this.api.deleteDoctorDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor, de.id_disp_especial).subscribe({
      next: () => { this.cargarDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor); },
      error: (err) => { console.error('Error al eliminar disponibilidad especial:', err); },
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
