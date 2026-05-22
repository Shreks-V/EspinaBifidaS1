import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface MetodoPagoItem {
  idMetodoPago: number;
  nombre: string;
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
  exentoPago: string;
  cancelada: string;
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

interface VentaLineaForm {
  tipo: 'SERVICIO' | 'PRODUCTO';
  id: number;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
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
  templateUrl: './recibos.component.html',
  styles: []
})
export class RecibosComponent implements OnInit {
  filtroFolio = '';
  filtroBeneficiario = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroSoloAdeudos = false;

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
  reciboItems: any[] = [];
  loadingItems = false;

  showConfirmCancelarRecibo = false;
  reciboACancelar: Recibo | null = null;
  motivoCancelacion = '';
  cancelandoRecibo = false;

  showNuevoCobro = false;
  guardandoCobro = false;
  nuevoCobroError = '';
  beneficiariosList: BeneficiarioOption[] = [];
  beneficiarioBusqueda = '';
  showBeneficiarioDropdown = false;
  beneficiariosFiltradosCobro: BeneficiarioOption[] = [];
  metodosPagoCatalogo: MetodoPagoCatalogo[] = [];
  serviciosCatalogo: ConceptoCobroOption[] = [];
  productosCatalogo: ConceptoCobroOption[] = [];
  nuevoCobroMontoPagado = 0;
  nuevoCobroSaldoPendiente = 0;
  conceptoPrecioUnitario = 0;
  itemsNuevoCobro: VentaLineaForm[] = [];

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
      if (params['filter'] === 'pendientes') {
        this.filtroSoloAdeudos = true;
        this.filtrarRecibos();
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
        this.filtrarRecibos();
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
      const matchAdeudo = !this.filtroSoloAdeudos || (r.saldoPendiente > 0 && r.cancelada !== 'S');
      return matchFolio && matchBeneficiario && matchFechaInicio && matchFechaFin && matchAdeudo;
    });
    this.recibosFiltrados = this.sortRows(filtrados, this.recibosSort, (recibo, key) => this.getReciboSortValue(recibo, key));
  }

  limpiarFiltros(): void {
    this.filtroFolio = '';
    this.filtroBeneficiario = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroSoloAdeudos = false;
    this.filtrarRecibos();
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
      case 'folioVenta': return recibo.folioVenta;
      case 'nombrePaciente': return recibo.nombrePaciente;
      case 'fechaVenta': return recibo.fechaVenta;
      case 'montoTotal': return recibo.montoTotal;
      case 'montoPagado': return recibo.montoPagado;
      case 'saldoPendiente': return recibo.saldoPendiente;
      case 'pago': return this.getPagoLabel(recibo);
      case 'estado': return recibo.cancelada === 'S' ? 'cancelada' : (recibo.saldoPendiente === 0 ? 'pagada' : 'pendiente');
      default: return recibo.fechaVenta;
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
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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
    this.itemsNuevoCobro = [];
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
    this.actualizarPrecioHint();
    if (this.nuevoConcepto.tipo === 'SERVICIO') {
      this.nuevoConcepto.cantidad = 1;
    }
  }

  onCantidadConceptoChange(): void {
    if (!this.nuevoConcepto.cantidad || this.nuevoConcepto.cantidad < 1) {
      this.nuevoConcepto.cantidad = 1;
    }
    this.actualizarPrecioHint();
  }

  onPacienteCobroChange(): void {
    this.actualizarPrecioHint();
    // Recalculate subtotals if items are already added (price tier may change)
    if (this.itemsNuevoCobro.length > 0) {
      this.recalcularTotalDesdeItems();
    }
  }

  private actualizarPrecioHint(): void {
    const selected = this.conceptosDisponibles.find(item => item.id === this.nuevoConcepto.id);
    if (!selected) {
      this.conceptoPrecioUnitario = 0;
      return;
    }
    const cuota = this.tipoCuotaBeneficiarioSeleccionado;
    let precio = cuota === 'B' ? selected.precioB : selected.precioA;
    if (!precio || precio <= 0) precio = selected.precioDefault || 0;
    this.conceptoPrecioUnitario = precio;
  }

  agregarItemALista(): void {
    if (this.nuevoConcepto.id === 0) return;
    const found = this.conceptosDisponibles.find(c => c.id === this.nuevoConcepto.id);
    if (!found) return;

    const cuota = this.tipoCuotaBeneficiarioSeleccionado;
    let precio = cuota === 'B' ? found.precioB : found.precioA;
    if (!precio || precio <= 0) precio = found.precioDefault || 0;

    const cantidad = this.nuevoConcepto.tipo === 'SERVICIO' ? 1 : (this.nuevoConcepto.cantidad || 1);
    const subtotal = Number((precio * cantidad).toFixed(2));

    this.itemsNuevoCobro.push({
      tipo: this.nuevoConcepto.tipo,
      id: found.id,
      descripcion: found.nombre,
      precio_unitario: precio,
      cantidad,
      subtotal
    });

    this.nuevoConcepto.id = 0;
    this.nuevoConcepto.cantidad = 1;
    this.conceptoPrecioUnitario = 0;

    this.recalcularTotalDesdeItems();
  }

  removerItem(index: number): void {
    this.itemsNuevoCobro.splice(index, 1);
    this.recalcularTotalDesdeItems();
  }

  recalcularTotalDesdeItems(): void {
    this.nuevoCobro.monto_total = Number(
      this.itemsNuevoCobro.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
    );
    this.calcularSaldoCobro();
  }

  // ── Beneficiario combobox ──

  filtrarBeneficiariosCobro(): void {
    const q = this.beneficiarioBusqueda.toLowerCase().trim();
    this.nuevoCobro.id_paciente = 0;
    if (!q) {
      this.beneficiariosFiltradosCobro = this.beneficiariosList.slice(0, 10);
    } else {
      this.beneficiariosFiltradosCobro = this.beneficiariosList
        .filter(b => b.nombre.toLowerCase().includes(q) || (b.folio || '').toLowerCase().includes(q))
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
    this.actualizarPrecioHint();
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
    this.nuevoCobroSaldoPendiente = Math.max(0, (this.nuevoCobro.monto_total || 0) - this.nuevoCobroMontoPagado);
  }

  guardarCobro(): void {
    if (!this.nuevoCobro.id_paciente) {
      this.nuevoCobroError = 'Selecciona un paciente.';
      return;
    }
    if (this.nuevoCobro.monto_total <= 0) {
      this.nuevoCobroError = 'El monto total debe ser mayor a 0.';
      return;
    }
    if (this.itemsNuevoCobro.length === 0) {
      this.nuevoCobroError = 'Agrega al menos un concepto al cobro.';
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
      })),
      items: this.itemsNuevoCobro.map(item => ({
        tipo: item.tipo,
        id_referencia: item.id,
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad
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
    this.reciboItems = [];
    this.loadingItems = true;
    this.showDetalle = true;

    this.api.getReciboItems(recibo.idVenta).subscribe({
      next: (items: any[]) => {
        this.reciboItems = items;
        this.loadingItems = false;
      },
      error: () => {
        this.loadingItems = false;
      }
    });
  }

  closeDetalle(): void {
    this.showDetalle = false;
    this.reciboSeleccionado = null;
    this.reciboItems = [];
  }

  printRecibo(): void {
    if (!this.reciboSeleccionado) return;
    const r = this.reciboSeleccionado;
    const items = this.reciboItems;

    const fmtMoney = (n: number) => `$${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

    const itemsRows = items.map(item => `
      <tr>
        <td>${item.tipo === 'PRODUCTO' ? 'Producto' : 'Servicio'}</td>
        <td>${item.descripcion ?? ''}</td>
        <td class="right">${fmtMoney(item.precio_unitario)}</td>
        <td class="right">${item.cantidad}</td>
        <td class="right bold">${fmtMoney(item.subtotal)}</td>
      </tr>`).join('');

    const metodosRows = (r.metodosPago ?? []).map(mp => `
      <tr>
        <td>${mp.nombre}</td>
        <td class="right bold">${fmtMoney(mp.monto)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Comprobante ${r.folioVenta}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e293b;padding:32px;max-width:720px;margin:auto}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #e2e8f0}
        .org{font-size:20px;font-weight:900;color:#00328b}
        .org-sub{font-size:12px;color:#64748b;margin-top:2px}
        .folio{font-size:24px;font-weight:900;color:#10b981;text-align:right}
        .folio-date{font-size:11px;color:#94a3b8;text-align:right;margin-top:2px}
        .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .info-box .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:2px}
        .info-box .val{font-size:13px;font-weight:700}
        h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:20px 0 10px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:10px;text-transform:uppercase;padding:6px 8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;color:#64748b}
        td{padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .right{text-align:right}
        .bold{font-weight:700}
        .totals{margin-top:16px}
        .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
        .saldo{font-size:18px;font-weight:900;padding:10px 0;border-top:2px solid #e2e8f0;margin-top:6px;color:${r.saldoPendiente > 0 ? '#d97706' : '#10b981'}}
        .cancelada{margin-top:20px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#b91c1c;font-size:12px}
        @media print{@page{margin:18mm}body{padding:0}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="org">EBIF</div>
          <div class="org-sub">Asociaci&oacute;n de Espina B&iacute;fida</div>
          <div class="org-sub" style="margin-top:6px;font-weight:700">Comprobante de Pago</div>
        </div>
        <div>
          <div class="folio">${r.folioVenta}</div>
          <div class="folio-date">${r.fechaVenta}</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="lbl">Beneficiario</div><div class="val">${r.nombrePaciente}</div></div>
        <div class="info-box"><div class="lbl">Folio Paciente</div><div class="val" style="font-family:monospace">${r.folioPaciente}</div></div>
        <div class="info-box"><div class="lbl">Exento de Pago</div><div class="val">${r.exentoPago === 'S' ? 'S&iacute;' : 'No'}</div></div>
      </div>
      <h2>Conceptos</h2>
      ${items.length > 0 ? `<table><thead><tr><th>Tipo</th><th>Descripci&oacute;n</th><th class="right">P.Unit</th><th class="right">Cant.</th><th class="right">Subtotal</th></tr></thead><tbody>${itemsRows}</tbody></table>` : '<p style="color:#94a3b8;font-style:italic;font-size:12px">Sin conceptos registrados.</p>'}
      <h2>M&eacute;todos de Pago</h2>
      <table><thead><tr><th>M&eacute;todo</th><th class="right">Monto</th></tr></thead><tbody>${metodosRows}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>Monto Total</span><span>${fmtMoney(r.montoTotal)}</span></div>
        <div class="total-row"><span>Monto Pagado</span><span>${fmtMoney(r.montoPagado)}</span></div>
        <div class="total-row saldo"><span>Saldo Pendiente</span><span>${fmtMoney(r.saldoPendiente)}</span></div>
      </div>
      ${r.cancelada === 'S' ? `<div class="cancelada"><strong>CANCELADA</strong> — ${r.motivoCancelacion ?? ''}</div>` : ''}
    </body></html>`;

    const win = window.open('', '_blank', 'width=820,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    }
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
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      if (exentoMethod) {
        this.nuevoCobro.metodos_pago = [{ id_metodo_pago: exentoMethod.id, monto: this.nuevoCobro.monto_total || 0 }];
      } else {
        this.nuevoCobro.metodos_pago = [];
      }
    } else {
      this.nuevoCobro.metodos_pago = [{ id_metodo_pago: 0, monto: 0 }];
    }
    this.calcularSaldoCobro();
  }

  getPagoLabel(recibo: Recibo): string {
    if (!recibo.metodosPago || recibo.metodosPago.length === 0) return '—';
    if (recibo.metodosPago.length === 1) return recibo.metodosPago[0].nombre;
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
