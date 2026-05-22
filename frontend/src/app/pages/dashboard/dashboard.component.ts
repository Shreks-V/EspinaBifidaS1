import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface VentaLineaForm {
  tipo: 'SERVICIO' | 'PRODUCTO';
  id: number;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

interface CatalogoItem {
  id: number;
  nombre: string;
  tipo: 'SERVICIO' | 'PRODUCTO';
  precioA: number;
  precioB: number;
  precioDefault: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  todayFormatted = '';
  pacientes: any[] = [];

  statCobros = 0;
  statPendientes = 0;
  statCitas = 0;
  statBajoStock = 0;
  statBeneficiariosActivos = 0;
  statComodatosActivos = 0;
  deltaBeneficiarios = 0;
  deltaCitas = 0;
  deltaRecibos = 0;
  resumenSemanaLabel = '';
  resumenNuevosBeneficiarios = 0;
  resumenCitasCompletadas = 0;
  resumenRecibosGenerados = 0;
  resumenMontoRecaudado = 0;

  doctorNombre = 'Sin doctor asignado';
  doctorEspecialidad = '';
  doctorIniciales = '--';
  doctorAtendidos = 0;
  doctorTotalHoy = 0;
  doctorHorario = '—';

  // Modal: atención sin cita
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

  // Modal: recibo post-cita
  showReciboModal = false;
  reciboModalPaciente: { idPaciente: number; nombre: string; folio: string; tipoCuota: string } | null = null;
  reciboModalItems: VentaLineaForm[] = [];
  reciboModalMetodosPago: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  reciboModalExento = 'N';
  reciboModalTotal = 0;
  reciboModalMontoPagado = 0;
  reciboModalSaldoPendiente = 0;
  reciboModalError = '';
  guardandoRecibo = false;
  reciboStagingTipo: 'SERVICIO' | 'PRODUCTO' = 'SERVICIO';
  reciboStagingId = 0;
  reciboStagingCantidad = 1;
  reciboStagingPrecioHint = 0;
  metodosPagoCatalogo: { id: number; nombre: string }[] = [];
  reciboServicios: CatalogoItem[] = [];
  reciboProductos: CatalogoItem[] = [];

  private colors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400',
    'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
    'bg-cyan-400', 'bg-indigo-400', 'bg-teal-400',
  ];

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.todayFormatted = today.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    this.todayFormatted = this.todayFormatted.charAt(0).toUpperCase() + this.todayFormatted.slice(1);

    forkJoin({
      citasHoy: this.api.getCitasHoy(),
      recibosStats: this.api.getRecibosStats(),
      citasStats: this.api.getCitasStats(),
      almacenStats: this.api.getAlmacenStats(),
      doctor: this.api.getDoctorHoy(),
      benefStats: this.api.getDashboardStats(),
      resumen: this.api.getReporteConsolidadoMensual(today.getMonth() + 1, today.getFullYear()),
    }).subscribe({
      next: (res) => {
        this.processCitasHoy(res.citasHoy);
        this.processRecibosStats(res.recibosStats);
        this.processCitasStats(res.citasStats);
        this.processAlmacenStats(res.almacenStats);
        this.processDoctor(res.doctor);
        this.processBenefStats(res.benefStats);
        this.processResumen(res.resumen);
        this.loading = false;
      },
      error: () => { this.loading = false; },
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
      .filter((c: any) => c.estatus === 'PROGRAMADA' || c.estatus === 'EN_CURSO')
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
        return {
          idCita: cita.id_cita,
          idPaciente: cita.id_paciente,
          nombre,
          apellido,
          folio: cita.folio_paciente || '',
          tipoCuota: cita.tipo_cuota || 'A',
          hora,
          iniciales,
          servicio: cita.servicios?.[0]?.nombre || 'Consulta',
          idServicio: cita.servicios?.[0]?.id_servicio || null,
          color: this.colors[i % this.colors.length],
          estado: cita.estatus === 'EN_CURSO' ? 'EN_CURSO' : 'PROGRAMADA',
        };
      });
  }

  private processRecibosStats(stats: any): void {
    this.statCobros = stats.total_hoy ?? stats.total ?? 0;
    this.statPendientes = stats.pendientes ?? 0;
    this.deltaRecibos = this.statCobros - (stats.total_ayer ?? 0);
  }

  private processCitasStats(stats: any): void {
    this.statCitas = stats.total_hoy ?? stats.total ?? 0;
    this.deltaCitas = this.statCitas - (stats.total_ayer ?? 0);
  }

  private processAlmacenStats(stats: any): void {
    this.statBajoStock = (stats.alertas_stock_bajo ?? 0) + (stats.alertas_caducidad ?? 0);
    this.statComodatosActivos = stats.comodatos_activos ?? 0;
  }

  private processBenefStats(stats: any): void {
    this.statBeneficiariosActivos = stats.activos ?? stats.total ?? 0;
    this.deltaBeneficiarios = (stats.nuevos_esta_semana ?? 0) - (stats.nuevos_semana_anterior ?? 0);
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

  // ──── Estado de citas ────

  iniciarAtencion(paciente: any): void {
    if (!paciente.idCita) return;
    paciente.estado = 'EN_CURSO';
    this.api.iniciarCita(paciente.idCita).subscribe({
      error: () => { paciente.estado = 'PROGRAMADA'; },
    });
  }

  marcarAtendido(paciente: any): void {
    if (!paciente.idCita) return;
    const backup = [...this.pacientes];
    this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
    this.doctorAtendidos++;
    this.api.completarCita(paciente.idCita).subscribe({
      next: () => { this.abrirReciboModal(paciente); },
      error: () => {
        this.pacientes = backup;
        this.doctorAtendidos = Math.max(0, this.doctorAtendidos - 1);
      },
    });
  }

  // ──── Modal Recibo post-cita ────

  private cargarCatalogosRecibo(): void {
    if (this.metodosPagoCatalogo.length === 0) {
      this.api.getMetodosPago().subscribe({
        next: (data: any[]) => {
          this.metodosPagoCatalogo = data.map((m: any) => ({ id: m.id_metodo_pago || m.id, nombre: m.nombre }));
        },
      });
    }
    if (this.reciboServicios.length === 0) {
      this.api.getServicios({ activo: 'S' }).subscribe({
        next: (data: any[]) => {
          this.reciboServicios = data.map((s: any) => ({
            id: s.id_servicio,
            nombre: s.nombre,
            tipo: 'SERVICIO',
            precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
            precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
            precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? 0),
          }));
        },
      });
    }
    if (this.reciboProductos.length === 0) {
      this.api.getProductos({ activo: 'S' }).subscribe({
        next: (data: any[]) => {
          this.reciboProductos = data.map((p: any) => ({
            id: p.id_producto,
            nombre: p.nombre,
            tipo: 'PRODUCTO',
            precioA: Number(p.precio_cuota_a ?? 0),
            precioB: Number(p.precio_cuota_b ?? 0),
            precioDefault: Number(p.precio_cuota_a ?? 0),
          }));
        },
      });
    }
  }

  abrirReciboModal(paciente: any): void {
    this.reciboModalPaciente = {
      idPaciente: paciente.idPaciente,
      nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
      folio: paciente.folio,
      tipoCuota: paciente.tipoCuota || 'A',
    };
    this.reciboModalItems = [];
    this.reciboModalMetodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    this.reciboModalExento = 'N';
    this.reciboModalTotal = 0;
    this.reciboModalMontoPagado = 0;
    this.reciboModalSaldoPendiente = 0;
    this.reciboModalError = '';
    this.guardandoRecibo = false;
    this.reciboStagingTipo = 'SERVICIO';
    this.reciboStagingId = 0;
    this.reciboStagingCantidad = 1;
    this.reciboStagingPrecioHint = 0;

    this.cargarCatalogosRecibo();

    // Pre-add the service from the cita once the catalog is available
    if (paciente.idServicio) {
      const preAdd = () => {
        const found = this.reciboServicios.find(s => s.id === paciente.idServicio);
        if (found) {
          const tipoCuota = this.reciboModalPaciente?.tipoCuota || 'A';
          let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
          if (!precio || precio <= 0) precio = found.precioDefault || 0;
          this.reciboModalItems = [{
            tipo: 'SERVICIO',
            id: found.id,
            descripcion: found.nombre,
            precio_unitario: precio,
            cantidad: 1,
            subtotal: Number(precio.toFixed(2)),
          }];
          this.reciboRecalcularTotal();
        } else if (this.reciboServicios.length === 0) {
          // Catalog not yet loaded — add with placeholder price using cita name
          this.reciboModalItems = [{
            tipo: 'SERVICIO',
            id: paciente.idServicio,
            descripcion: paciente.servicio || 'Consulta',
            precio_unitario: 0,
            cantidad: 1,
            subtotal: 0,
          }];
        }
      };

      if (this.reciboServicios.length > 0) {
        preAdd();
      } else {
        // Wait for services catalog then pre-add
        this.api.getServicios({ activo: 'S' }).subscribe({
          next: (data: any[]) => {
            this.reciboServicios = data.map((s: any) => ({
              id: s.id_servicio,
              nombre: s.nombre,
              tipo: 'SERVICIO',
              precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
              precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
              precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? 0),
            }));
            preAdd();
          },
        });
      }
    }

    this.showReciboModal = true;
  }

  cerrarReciboModal(): void {
    this.showReciboModal = false;
    this.reciboModalPaciente = null;
    this.reciboModalItems = [];
  }

  get reciboConceptosDisponibles(): CatalogoItem[] {
    return this.reciboStagingTipo === 'SERVICIO' ? this.reciboServicios : this.reciboProductos;
  }

  onReciboTipoChange(): void {
    this.reciboStagingId = 0;
    this.reciboStagingCantidad = 1;
    this.reciboStagingPrecioHint = 0;
  }

  onReciboItemChange(): void {
    const found = this.reciboConceptosDisponibles.find(c => c.id === this.reciboStagingId);
    if (!found) { this.reciboStagingPrecioHint = 0; return; }
    const tipoCuota = this.reciboModalPaciente?.tipoCuota || 'A';
    let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
    if (!precio || precio <= 0) precio = found.precioDefault || 0;
    this.reciboStagingPrecioHint = precio;
    if (this.reciboStagingTipo === 'SERVICIO') this.reciboStagingCantidad = 1;
  }

  reciboAgregarItem(): void {
    if (this.reciboStagingId === 0) return;
    const found = this.reciboConceptosDisponibles.find(c => c.id === this.reciboStagingId);
    if (!found) return;
    const tipoCuota = this.reciboModalPaciente?.tipoCuota || 'A';
    let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
    if (!precio || precio <= 0) precio = found.precioDefault || 0;
    const cantidad = this.reciboStagingTipo === 'SERVICIO' ? 1 : (this.reciboStagingCantidad || 1);
    const subtotal = Number((precio * cantidad).toFixed(2));
    this.reciboModalItems.push({
      tipo: this.reciboStagingTipo,
      id: found.id,
      descripcion: found.nombre,
      precio_unitario: precio,
      cantidad,
      subtotal,
    });
    this.reciboStagingId = 0;
    this.reciboStagingCantidad = 1;
    this.reciboStagingPrecioHint = 0;
    this.reciboRecalcularTotal();
  }

  reciboRemoverItem(index: number): void {
    this.reciboModalItems.splice(index, 1);
    this.reciboRecalcularTotal();
  }

  reciboRecalcularTotal(): void {
    this.reciboModalTotal = Number(this.reciboModalItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    this.reciboRecalcularSaldo();
  }

  reciboRecalcularSaldo(): void {
    this.reciboModalMontoPagado = this.reciboModalMetodosPago.reduce((s, mp) => s + (mp.monto || 0), 0);
    this.reciboModalSaldoPendiente = Math.max(0, this.reciboModalTotal - this.reciboModalMontoPagado);
  }

  reciboAgregarMetodo(): void {
    this.reciboModalMetodosPago.push({ id_metodo_pago: 0, monto: 0 });
  }

  reciboRemoverMetodo(index: number): void {
    this.reciboModalMetodosPago.splice(index, 1);
    this.reciboRecalcularSaldo();
  }

  onReciboExentoChange(): void {
    if (this.reciboModalExento === 'S') {
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      this.reciboModalMetodosPago = exentoMethod
        ? [{ id_metodo_pago: exentoMethod.id, monto: this.reciboModalTotal }]
        : [];
    } else {
      this.reciboModalMetodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    }
    this.reciboRecalcularSaldo();
  }

  guardarRecibo(): void {
    if (!this.reciboModalPaciente || this.reciboModalItems.length === 0) return;
    const metodosValidos = this.reciboModalMetodosPago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (this.reciboModalExento !== 'S' && metodosValidos.length === 0) {
      this.reciboModalError = 'Agrega al menos un método de pago con monto.';
      return;
    }
    this.reciboModalError = '';
    this.guardandoRecibo = true;
    const payload = {
      id_paciente: this.reciboModalPaciente.idPaciente,
      monto_total: this.reciboModalTotal,
      monto_pagado: this.reciboModalMontoPagado,
      saldo_pendiente: this.reciboModalSaldoPendiente,
      exento_pago: this.reciboModalExento,
      metodos_pago: metodosValidos.map(mp => ({ id_metodo_pago: mp.id_metodo_pago, monto: mp.monto })),
      items: this.reciboModalItems.map(item => ({
        tipo: item.tipo,
        id_referencia: item.id,
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
      })),
    };
    this.api.createRecibo(payload).subscribe({
      next: () => {
        this.guardandoRecibo = false;
        this.cerrarReciboModal();
      },
      error: (err) => {
        this.guardandoRecibo = false;
        this.reciboModalError = err?.error?.detail || 'Error al guardar el recibo.';
      },
    });
  }

  // ──── Walk-in ────

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
        next: (data) => { this.walkInAllBeneficiarios = data || []; },
        error: () => { this.walkInError = 'No se pudieron cargar los beneficiarios'; },
      });
    }
    if (this.walkInServicios.length === 0) {
      this.api.getServicios().subscribe({
        next: (data) => {
          this.walkInServicios = (data || []).filter((s: any) => String(s?.activo ?? 'S').toUpperCase() === 'S');
          this.setDefaultWalkInServicio();
        },
        error: () => { this.walkInError = 'No se pudieron cargar los servicios'; },
      });
    } else {
      this.setDefaultWalkInServicio();
    }
  }

  private setDefaultWalkInServicio(): void {
    const consulta = this.walkInServicios.find((s: any) => {
      const n = (s.nombre ?? '').toLowerCase();
      return n.includes('consulta') && (n.includes('médica') || n.includes('medica'));
    }) ?? this.walkInServicios.find((s: any) => (s.nombre ?? '').toLowerCase().includes('consulta'));
    if (consulta) this.walkInServicioSeleccionadoId = consulta.id_servicio ?? null;
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
    if (!term) { this.walkInResults = []; return; }
    this.walkInResults = this.walkInAllBeneficiarios
      .filter((b: any) => {
        const fullName = `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.toLowerCase();
        return fullName.includes(term) || (b.folio || '').toLowerCase().includes(term);
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
      servicios: [{ id_servicio: servicioId, cantidad }],
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
