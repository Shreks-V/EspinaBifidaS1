import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

interface ProductoItem {
  idProducto: number;
  claveInterna: string;
  nombre: string;
  descripcion: string;
  tipoProducto: string; // MEDICAMENTO / EQUIPO
  precioA: number | null;
  precioB: number | null;
  activo: string;
  // Subtype fields
  presentacion?: string; // medicamento
  dosis?: string; // medicamento
  requiereCaducidad?: string; // medicamento
  numeroSerie?: string; // equipo
  marca?: string; // equipo
  modelo?: string; // equipo
  estatusEquipo?: string; // equipo
  observaciones?: string; // equipo
  // Existencia
  cantidadDisponible: number | null;
  nivelMinimo: number | null;
  unidadMedida: string;
  fechaCaducidad?: string | null;
}

interface ServicioItem {
  idServicio: number;
  nombre: string;
  descripcion: string;
  cuotaRecuperacion: number;
  precioA: number | null;
  precioB: number | null;
  activo: string;
}

interface ComodatoItem {
  idComodato: number;
  folioComodato: string;
  idEquipo: number;
  nombreEquipo: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  estatus: string; // PRESTADO / DEVUELTO / CANCELADO
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string;
  notas?: string;
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './almacen.component.html',
  styles: [`
    @media print {
      app-navbar, app-footer, main, .fixed { display: none !important; }
      #print-comodato { display: block !important; }
    }
  `],
})
export class AlmacenComponent implements OnInit {
  activeTab: 'inventario' | 'servicios' | 'comodatos' = 'inventario';
  selectedCategory: string | null = null;
  quickInventoryFilter: 'none' | 'existencias-bajas' | 'proximos-vencer' = 'none';
  searchInventario = '';
  searchServicios = '';
  searchComodatos = '';

  loading = true;
  productos: ProductoItem[] = [];
  servicios: ServicioItem[] = [];
  comodatos: ComodatoItem[] = [];
  alertasCaducidad = 0;
  private stockBajoProductoIds = new Set<number>();
  private proximosVencerProductoIds = new Set<number>();
  inventarioSort: TableSortState = { key: 'id', direction: 'asc' };
  comodatosSort: TableSortState = { key: 'fechaPrestamo', direction: 'desc' };

  // Modal state
  showNuevoProductoModal = false;
  showNuevoComodatoModal = false;
  showConfirmDeleteModal = false;
  editingProduct: ProductoItem | null = null;
  productoToDelete: { id: number; nombre: string; categoria: string } | null = null;

  // Submission flags
  submittingProducto = false;
  submittingDelete = false;
  submittingComodato = false;

  // Print
  printingComodato: ComodatoItem | null = null;

  // Producto form
  productoForm = this.getEmptyProductoForm();

  // Comodato form
  comodatoForm = this.getEmptyComodatoForm();

  // Data for comodato selects
  beneficiariosList: { id: number; nombre: string }[] = [];
  equiposList: ProductoItem[] = [];

  get isAdmin(): boolean { return this.auth.isAdmin(); }
  get isAdminOrAlmacen(): boolean { return this.auth.hasRole('ADMINISTRADOR', 'ENCARGADO_ALMACEN'); }
  get debugMode(): boolean { return this.config.debug; }

  constructor(private api: ApiService, private route: ActivatedRoute, private auth: AuthService, private config: ConfigService) {}

  ngOnInit(): void {
    this.loadProductos();
    this.loadServicios();
    this.loadComodatos();
    this.loadAlmacenStats();

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'inventario' || tab === 'servicios' || tab === 'comodatos') {
        this.activeTab = tab;
      }
      const filter = String(params['filter'] || '').toLowerCase();
      if (filter === 'alertas') {
        this.quickInventoryFilter = 'existencias-bajas';
        this.activeTab = 'inventario';
      }
      if (filter === 'caducidad') {
        this.quickInventoryFilter = 'proximos-vencer';
        this.activeTab = 'inventario';
      }
      if (params['action'] === 'nuevo') {
        setTimeout(() => {
          if (this.activeTab === 'comodatos') {
            this.openNuevoComodatoModal();
          } else {
            this.openNuevoProductoModal();
          }
        }, 0);
      }
    });
  }

  // ──────────────── Data Loading ────────────────

  loadProductos(): void {
    this.loading = true;
    this.api.getProductos({ activo: 'S' }).subscribe({
      next: (data) => {
        this.productos = data.map((p: any) => ({
          idProducto: Number(p?.id_producto ?? p?.idProducto ?? 0),
          claveInterna: String(p?.clave_interna ?? p?.claveInterna ?? ''),
          nombre: String(p?.nombre ?? ''),
          descripcion: String(p?.descripcion ?? ''),
          tipoProducto: this.normalizeTipoProducto(p?.tipo_producto ?? p?.tipoProducto),
          precioA: this.toNumberOrNull(p?.precio_cuota_a ?? p?.precioA),
          precioB: this.toNumberOrNull(p?.precio_cuota_b ?? p?.precioB),
          activo: String(p?.activo ?? 'S'),
          presentacion: p?.presentacion,
          dosis: p?.dosis,
          requiereCaducidad: p?.requiere_caducidad ?? p?.requiereCaducidad,
          numeroSerie: p?.numero_serie ?? p?.numeroSerie,
          marca: p?.marca,
          modelo: p?.modelo,
          estatusEquipo: p?.estatus_equipo ?? p?.estatusEquipo,
          observaciones: p?.observaciones,
          cantidadDisponible: this.toNumberOrNull(p?.cantidad_disponible ?? p?.cantidadDisponible),
          nivelMinimo: this.toNumberOrNull(p?.nivel_minimo ?? p?.nivelMinimo),
          unidadMedida: String(p?.unidad_medida ?? p?.unidadMedida ?? '\u2014'),
          fechaCaducidad: p?.fecha_caducidad ?? p?.fechaCaducidad ?? null,
        })).filter((p: ProductoItem) => p.idProducto > 0 && !!p.nombre);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading productos:', err);
        this.loading = false;
      },
    });
  }

  loadAlmacenStats(): void {
    this.api.getAlmacenStats().subscribe({
      next: (stats: any) => {
        this.alertasCaducidad = stats.alertas_caducidad ?? 0;
        const stockBajo = Array.isArray(stats?.stock_bajo) ? stats.stock_bajo : [];
        const proximosVencer = Array.isArray(stats?.proximos_vencer) ? stats.proximos_vencer : [];

        this.stockBajoProductoIds = new Set(
          stockBajo
            .map((item: any) => Number(item?.id_producto))
            .filter((id: number) => Number.isInteger(id) && id > 0)
        );
        this.proximosVencerProductoIds = new Set(
          proximosVencer
            .map((item: any) => Number(item?.id_producto))
            .filter((id: number) => Number.isInteger(id) && id > 0)
        );
      },
      error: () => {
        this.alertasCaducidad = 0;
        this.stockBajoProductoIds.clear();
        this.proximosVencerProductoIds.clear();
      },
    });
  }

  loadServicios(): void {
    this.api.getServicios({ activo: 'S' }).subscribe({
      next: (data) => {
        this.servicios = data.map((s: any) => ({
          idServicio: Number(s?.id_servicio ?? s?.idServicio ?? 0),
          nombre: String(s?.nombre ?? ''),
          descripcion: String(s?.descripcion ?? ''),
          cuotaRecuperacion: Number(s?.cuota_recuperacion ?? s?.cuotaRecuperacion ?? 0),
          precioA: this.toNumberOrNull(s?.precio_cuota_a ?? s?.precioA),
          precioB: this.toNumberOrNull(s?.precio_cuota_b ?? s?.precioB),
          activo: String(s?.activo ?? 'S'),
        })).filter((s: ServicioItem) => s.idServicio > 0 && !!s.nombre);
      },
      error: (err) => console.error('Error loading servicios:', err),
    });
  }

  private normalizeTipoProducto(value: unknown): string {
    const tipo = String(value || '').trim().toUpperCase();
    if (tipo === 'EQUIPO_MEDICO') return 'EQUIPO';
    return tipo;
  }

  loadComodatos(): void {
    this.api.getComodatos().subscribe({
      next: (data) => {
        this.comodatos = data.map((c: any) => ({
          idComodato: c.id_comodato,
          folioComodato: c.folio_comodato,
          idEquipo: c.id_equipo,
          nombreEquipo: c.nombre_equipo,
          idPaciente: c.id_paciente,
          nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente,
          fechaPrestamo: c.fecha_prestamo,
          fechaDevolucion: c.fecha_devolucion,
          estatus: c.estatus,
          montoTotal: c.monto_total,
          montoPagado: c.monto_pagado,
          saldoPendiente: c.saldo_pendiente,
          exentoPago: c.exento_pago,
          notas: c.notas,
        }));
      },
      error: (err) => console.error('Error loading comodatos:', err),
    });
  }

  // ──────────────── Form Defaults ────────────────

  getEmptyProductoForm() {
    return {
      clave_interna: '',
      nombre: '',
      descripcion: '',
      tipo_producto: '',
      precio_cuota_a: null as number | null,
      precio_cuota_b: null as number | null,
      activo: 'S',
      presentacion: '',
      dosis: '',
      requiere_caducidad: 'S',
      numero_serie: '',
      marca: '',
      modelo: '',
      estatus_equipo: 'DISPONIBLE',
      observaciones: '',
      cuota_recuperacion: 0,
      cantidad_disponible: 0,
      nivel_minimo: 5,
      unidad_medida: '',
      fecha_caducidad: '',
    };
  }

  getEmptyComodatoForm() {
    return {
      id_paciente: null as number | null,
      id_equipo: null as number | null,
      fecha_prestamo: '',
      fecha_devolucion: '',
      estatus: 'PRESTADO',
      monto_total: 0,
      monto_pagado: 0,
      saldo_pendiente: 0,
      exento_pago: 'N',
      notas: '',
    };
  }

  // ──────────────── Producto Modal ────────────────

  openNuevoProductoModal(): void {
    this.editingProduct = null;
    this.productoForm = this.getEmptyProductoForm();
    this.showNuevoProductoModal = true;
  }

  openEditProductoModal(item: { id: number; categoria: string; nombre: string }): void {
    // Handle servicio edit
    if (item.categoria === 'SERVICIO') {
      this.editarServicio(item);
      return;
    }

    // Find the actual product from the productos array
    const producto = this.productos.find(p => p.idProducto === item.id);
    if (!producto) return;

    this.editingProduct = producto;
    this.productoForm = {
      clave_interna: producto.claveInterna,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      tipo_producto: producto.tipoProducto,
      precio_cuota_a: producto.precioA,
      precio_cuota_b: producto.precioB,
      activo: producto.activo,
      presentacion: producto.presentacion ?? '',
      dosis: producto.dosis ?? '',
      requiere_caducidad: producto.requiereCaducidad ?? 'S',
      numero_serie: producto.numeroSerie ?? '',
      marca: producto.marca ?? '',
      modelo: producto.modelo ?? '',
      estatus_equipo: producto.estatusEquipo ?? 'DISPONIBLE',
      observaciones: producto.observaciones ?? '',
      cuota_recuperacion: 0,
      cantidad_disponible: producto.cantidadDisponible ?? 0,
      nivel_minimo: producto.nivelMinimo ?? 5,
      unidad_medida: producto.unidadMedida,
      fecha_caducidad: producto.fechaCaducidad ? producto.fechaCaducidad.substring(0, 10) : '',
    };
    this.showNuevoProductoModal = true;
  }

  closeProductoModal(): void {
    this.showNuevoProductoModal = false;
    this.editingProduct = null;
  }

  submitProducto(): void {
    if (!this.productoForm.nombre || !this.productoForm.tipo_producto) return;
    if (this.productoForm.tipo_producto !== 'SERVICIO' && !this.productoForm.clave_interna) return;

    this.submittingProducto = true;
    const payload: any = { ...this.productoForm };

    if (payload.tipo_producto === 'SERVICIO') {
      if (this.editingProduct) {
        alert('La edici\u00f3n de servicios se realiza desde la tabla de servicios.');
        this.submittingProducto = false;
        return;
      }

      const servicioPayload = {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        activo: payload.activo,
        precio_cuota_a: payload.precio_cuota_a,
        precio_cuota_b: payload.precio_cuota_b,
        cuota_recuperacion: payload.cuota_recuperacion ?? 0,
      };

      this.api.createServicio(servicioPayload).subscribe({
        next: () => {
          this.loadServicios();
          this.closeProductoModal();
          this.submittingProducto = false;
        },
        error: (err) => {
          console.error('Error creating servicio:', err);
          this.submittingProducto = false;
        },
      });
      return;
    }

    // Clean up type-specific fields
    if (payload.tipo_producto === 'MEDICAMENTO') {
      delete payload.numero_serie;
      delete payload.marca;
      delete payload.modelo;
      delete payload.estatus_equipo;
      delete payload.observaciones;
      delete payload.cuota_recuperacion;
    } else if (payload.tipo_producto === 'EQUIPO') {
      delete payload.presentacion;
      delete payload.dosis;
      delete payload.requiere_caducidad;
      delete payload.fecha_caducidad;
      delete payload.cuota_recuperacion;
    }
    if (payload.fecha_caducidad === '') {
      payload.fecha_caducidad = null;
    }

    if (this.editingProduct) {
      this.api.updateProducto(this.editingProduct.idProducto, payload).subscribe({
        next: () => {
          this.loadProductos();
          this.closeProductoModal();
          this.submittingProducto = false;
        },
        error: (err) => {
          console.error('Error updating producto:', err);
          this.submittingProducto = false;
        },
      });
    } else {
      this.api.createProducto(payload).subscribe({
        next: () => {
          this.loadProductos();
          this.closeProductoModal();
          this.submittingProducto = false;
        },
        error: (err) => {
          console.error('Error creating producto:', err);
          this.submittingProducto = false;
        },
      });
    }
  }

  // ──────────────── Delete Modal ────────────────

  openConfirmDeleteModal(item: { id: number; nombre: string; categoria: string }): void {
    this.productoToDelete = item;
    this.showConfirmDeleteModal = true;
  }

  closeConfirmDeleteModal(): void {
    this.showConfirmDeleteModal = false;
    this.productoToDelete = null;
  }

  confirmDelete(): void {
    if (!this.productoToDelete) return;

    this.submittingDelete = true;
    const isServicio = this.productoToDelete.categoria === 'SERVICIO';
    const deleteObs = isServicio
      ? this.api.deleteServicio(this.productoToDelete.id)
      : this.api.deleteProducto(this.productoToDelete.id);

    deleteObs.subscribe({
      next: () => {
        if (isServicio) {
          this.loadServicios();
        } else {
          this.loadProductos();
        }
        this.closeConfirmDeleteModal();
        this.submittingDelete = false;
      },
      error: (err) => {
        console.error('Error deleting item:', err);
        alert(err?.error?.detail || 'No se pudo eliminar el elemento seleccionado.');
        this.submittingDelete = false;
      },
    });
  }

  // ──────────────── Comodato Modal ────────────────

  openNuevoComodatoModal(): void {
    this.comodatoForm = this.getEmptyComodatoForm();
    this.equiposList = this.productos.filter(p => p.tipoProducto === 'EQUIPO');

    // Load beneficiarios for the select
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id: b.id_paciente ?? b.id,
          nombre: `${b.nombre ?? ''} ${b.apellido_paterno ?? ''} ${b.apellido_materno ?? ''}`.trim() || b.nombre_completo || `Paciente ${b.folio}`,
        }));
      },
      error: (err) => console.error('Error loading beneficiarios:', err),
    });

    this.showNuevoComodatoModal = true;
  }

  closeComodatoModal(): void {
    this.showNuevoComodatoModal = false;
  }

  submitComodato(): void {
    if (!this.comodatoForm.id_paciente || !this.comodatoForm.id_equipo || !this.comodatoForm.fecha_prestamo) return;

    this.submittingComodato = true;
    const payload: any = { ...this.comodatoForm };
    if (!payload.fecha_devolucion) {
      payload.fecha_devolucion = null;
    }

    this.api.createComodato(payload).subscribe({
      next: () => {
        this.loadComodatos();
        this.closeComodatoModal();
        this.submittingComodato = false;
      },
      error: (err) => {
        console.error('Error creating comodato:', err);
        this.submittingComodato = false;
      },
    });
  }

  // ──────────────── Print Comodato ────────────────

  printComodato(com: ComodatoItem): void {
    this.printingComodato = com;
    setTimeout(() => {
      window.print();
      this.printingComodato = null;
    }, 100);
  }

  descargarContratoComodato(com: ComodatoItem): void {
    this.api.exportarContratoComodatoPdf(com.idComodato).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contrato_${com.folioComodato}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 150);
      },
      error: () => alert('Error al generar contrato de comodato'),
    });
  }

  // ──────────────── KPI Helpers ────────────────

  getBajoStockCount(): number {
    return this.productos.filter(p =>
      p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo
    ).length;
  }

  getProximosAVencerCount(): number {
    const calculado = this.productos.filter((p) => this.isCaducidadEnRiesgo(p.fechaCaducidad)).length;
    return Math.max(this.alertasCaducidad, this.proximosVencerProductoIds.size, calculado);
  }

  getComodatosActivosCount(): number {
    return this.comodatos.filter(c => c.estatus === 'PRESTADO').length;
  }

  mostrarInventarioCompleto(): void {
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'none';
    this.selectedCategory = null;
  }

  mostrarExistenciasBajas(): void {
    if (this.getBajoStockCount() === 0 && this.stockBajoProductoIds.size === 0) return;
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'existencias-bajas';
    this.selectedCategory = null;
  }

  mostrarProximosAVencer(): void {
    if (this.getProximosAVencerCount() === 0) return;
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'proximos-vencer';
    this.selectedCategory = null;
  }

  mostrarComodatosActivos(): void {
    if (this.getComodatosActivosCount() === 0) return;
    this.activeTab = 'comodatos';
  }

  limpiarFiltrosInventarioRapidos(): void {
    this.quickInventoryFilter = 'none';
    this.selectedCategory = null;
  }

  getQuickFilterLabel(): string {
    if (this.quickInventoryFilter === 'existencias-bajas') return 'Mostrando: existencias bajas';
    if (this.quickInventoryFilter === 'proximos-vencer') return 'Mostrando: próximos a vencer';
    return '';
  }

  getCategoryCount(categoria: string): number {
    if (categoria === 'Medicamento') {
      return this.productos.filter(p => p.tipoProducto === 'MEDICAMENTO').length;
    }
    if (categoria === 'Servicios') {
      return this.servicios.length;
    }
    if (categoria === 'Equipo') {
      return this.productos.filter(p => p.tipoProducto === 'EQUIPO').length;
    }
    return 0;
  }

  toggleCategory(categoria: string): void {
    this.selectedCategory = this.selectedCategory === categoria ? null : categoria;
  }

  // Unified row type for the inventory table
  filteredInventario(): { id: number; categoria: string; nombre: string; unidadMedida: string; cantidadDisponible: number | null; nivelMinimo: number | null; precioA: number | null; precioB: number | null; estado: string; doctor?: string; horario?: string; fechaCaducidad?: string | null }[] {
    let items: { id: number; categoria: string; nombre: string; unidadMedida: string; cantidadDisponible: number | null; nivelMinimo: number | null; precioA: number | null; precioB: number | null; estado: string; doctor?: string; horario?: string; fechaCaducidad?: string | null }[] = [];

    const showMedicamentos = !this.selectedCategory || this.selectedCategory === 'Medicamento';
    const showEquipos = !this.selectedCategory || this.selectedCategory === 'Equipo';

    if (showMedicamentos) {
      this.productos
        .filter(p => p.tipoProducto === 'MEDICAMENTO')
        .forEach(p => {
          const estado = (p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo)
            ? 'Existencias bajas'
            : (p.cantidadDisponible === 0 ? 'Agotado' : 'Normal');
          items.push({
            id: p.idProducto, categoria: 'MEDICAMENTO', nombre: p.nombre, unidadMedida: p.unidadMedida,
            cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
            precioA: p.precioA, precioB: p.precioB, estado, fechaCaducidad: p.fechaCaducidad
          });
        });
    }

    if (showEquipos) {
      this.productos
        .filter(p => p.tipoProducto === 'EQUIPO')
        .forEach(p => {
          items.push({
            id: p.idProducto, categoria: 'EQUIPO', nombre: p.nombre, unidadMedida: p.unidadMedida,
            cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
            precioA: p.precioA, precioB: p.precioB, estado: p.estatusEquipo ?? 'N/A', fechaCaducidad: p.fechaCaducidad
          });
        });
    }

    if (this.quickInventoryFilter !== 'none') {
      items = items.filter((item) => this.matchesQuickInventoryFilter(item));
    }

    if (this.searchInventario.trim()) {
      const q = this.searchInventario.toLowerCase();
      items = items.filter(i => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q));
    }

    return this.sortRows(items, this.inventarioSort, (item, key) => {
      switch (key) {
        case 'id':
          return item.id;
        case 'categoria':
          return item.categoria;
        case 'nombre':
          return item.nombre;
        case 'unidad':
          return this.unidadCellValue(item);
        case 'horario':
          return item.horario || '';
        case 'stock':
          return item.cantidadDisponible ?? -1;
        case 'precioA':
          return item.precioA ?? -1;
        case 'precioB':
          return item.precioB ?? -1;
        case 'estado':
          return item.estado;
        default:
          return item.id;
      }
    });
  }

  filteredServicios(): ServicioItem[] {
    if (!this.searchServicios.trim()) return this.servicios;
    const q = this.searchServicios.toLowerCase();
    return this.servicios.filter(s =>
      s.nombre.toLowerCase().includes(q) || (s.descripcion || '').toLowerCase().includes(q)
    );
  }

  private matchesQuickInventoryFilter(item: {
    id: number;
    categoria: string;
    cantidadDisponible: number | null;
    nivelMinimo: number | null;
    fechaCaducidad?: string | null;
  }): boolean {
    if (item.categoria === 'SERVICIO') return false;

    if (this.quickInventoryFilter === 'existencias-bajas') {
      if (this.stockBajoProductoIds.size > 0) {
        return this.stockBajoProductoIds.has(item.id);
      }
      return item.cantidadDisponible !== null
        && item.nivelMinimo !== null
        && item.cantidadDisponible < item.nivelMinimo;
    }

    if (this.quickInventoryFilter === 'proximos-vencer') {
      if (this.proximosVencerProductoIds.size > 0) {
        return this.proximosVencerProductoIds.has(item.id);
      }
      return this.isCaducidadEnRiesgo(item.fechaCaducidad);
    }

    return true;
  }

  private isCaducidadEnRiesgo(fechaCaducidad?: string | null): boolean {
    if (!fechaCaducidad) return false;
    const fecha = this.toDateOnly(fechaCaducidad);
    if (!fecha) return false;

    const hoy = new Date();
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const limite = new Date(base);
    limite.setDate(base.getDate() + 30);

    return fecha <= limite;
  }

  private toDateOnly(value: string): Date | null {
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  formatCurrency(value: unknown): string {
    const numeric = this.toNumberOrNull(value);
    if (numeric === null) return '\u2014';
    return `$${numeric.toFixed(2)}`;
  }

  filteredComodatos(): ComodatoItem[] {
    const base = !this.searchComodatos.trim()
      ? this.comodatos
      : this.comodatos.filter(c => {
          const q = this.searchComodatos.toLowerCase();
          return (
      c.nombrePaciente.toLowerCase().includes(q) ||
      c.folioComodato.toLowerCase().includes(q) ||
      c.nombreEquipo.toLowerCase().includes(q)
          );
        });

    return this.sortRows(base, this.comodatosSort, (com, key) => {
      switch (key) {
        case 'folioComodato':
          return com.folioComodato;
        case 'beneficiario':
          return `${com.nombrePaciente} ${com.folioPaciente}`;
        case 'equipo':
          return com.nombreEquipo;
        case 'fechaPrestamo':
          return com.fechaPrestamo;
        case 'fechaDevolucion':
          return com.fechaDevolucion || '';
        case 'estatus':
          return com.estatus;
        default:
          return com.folioComodato;
      }
    });
  }

  toggleInventarioSort(key: string): void {
    if (this.inventarioSort.key === key) {
      this.inventarioSort.direction = this.inventarioSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.inventarioSort = { key, direction: 'asc' };
    }
  }

  toggleComodatosSort(key: string): void {
    if (this.comodatosSort.key === key) {
      this.comodatosSort.direction = this.comodatosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.comodatosSort = { key, direction: 'asc' };
    }
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

  getCategoryIconBg(categoria: string): string {
    switch (categoria) {
      case 'MEDICAMENTO': return 'bg-blue-100';
      case 'SERVICIO': return 'bg-purple-100';
      case 'EQUIPO': return 'bg-green-100';
      default: return 'bg-slate-100';
    }
  }

  unidadColumnLabel(): string {
    if (this.selectedCategory === 'Servicios') return 'Doctor';
    if (this.selectedCategory === 'Equipo') return 'Tamaño';
    return 'Unidad';
  }

  unidadCellValue(item: { categoria: string; unidadMedida: string; doctor?: string }): string {
    if (item.categoria === 'SERVICIO') return item.doctor || '\u2014';
    return item.unidadMedida || '\u2014';
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Normal': return 'bg-green-100 text-green-700';
      case 'DISPONIBLE': return 'bg-green-100 text-green-700';
      case 'Existencias bajas': return 'bg-amber-100 text-amber-700';
      case 'Bajo Stock': return 'bg-amber-100 text-amber-700';
      case 'EN_PRESTAMO': return 'bg-blue-100 text-blue-700';
      case 'Agotado': return 'bg-red-100 text-red-700';
      case 'EN_MANTENIMIENTO': return 'bg-orange-100 text-orange-700';
      case 'N/A': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  getComodatoEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'PRESTADO': return 'bg-green-100 text-green-700';
      case 'DEVUELTO': return 'bg-slate-100 text-slate-600';
      case 'CANCELADO': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  // ──────────────── Editar Servicio ────────────────

  showEditServicioModal = false;
  editServicioForm: any = null;
  editServicioId = 0;
  submittingEditServicio = false;

  editarServicio(item: { id: number }): void {
    const servicio = this.servicios.find(s => s.idServicio === item.id);
    if (!servicio) return;
    this.editServicioId = servicio.idServicio;
    this.editServicioForm = {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio_cuota_a: servicio.precioA,
      precio_cuota_b: servicio.precioB,
      activo: servicio.activo,
    };
    this.showEditServicioModal = true;
  }

  guardarEdicionServicio(): void {
    if (!this.editServicioForm.nombre) return;
    this.submittingEditServicio = true;
    this.api.updateServicio(this.editServicioId, this.editServicioForm).subscribe({
      next: () => {
        this.showEditServicioModal = false;
        this.submittingEditServicio = false;
        this.loadServicios();
      },
      error: (err) => {
        console.error('Error al actualizar servicio:', err);
        this.submittingEditServicio = false;
      },
    });
  }

  // ──────────────── Editar Comodato ────────────────

  showEditComodatoModal = false;
  editComodatoId = 0;
  editComodatoForm: any = {};
  submittingEditComodato = false;
  private editComodatoOriginal: ComodatoItem | null = null;

  // Confirmar devolución
  showConfirmDevolucionModal = false;
  comodatoToDevolver: ComodatoItem | null = null;
  submittingDevolucion = false;

  openEditComodatoModal(com: ComodatoItem): void {
    this.editComodatoOriginal = com;
    this.editComodatoId = com.idComodato;
    this.editComodatoForm = {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo ? com.fechaPrestamo.substring(0, 10) : '',
      fecha_devolucion: com.fechaDevolucion ? com.fechaDevolucion.substring(0, 10) : '',
      estatus: com.estatus,
      monto_total: com.montoTotal,
      monto_pagado: com.montoPagado,
      saldo_pendiente: com.saldoPendiente,
      exento_pago: com.exentoPago,
      notas: com.notas || '',
    };
    this.showEditComodatoModal = true;
  }

  guardarEdicionComodato(): void {
    this.submittingEditComodato = true;
    const payload = { ...this.editComodatoForm };
    if (!payload.fecha_devolucion) payload.fecha_devolucion = null;

    this.api.updateComodato(this.editComodatoId, payload).subscribe({
      next: () => {
        this.showEditComodatoModal = false;
        this.submittingEditComodato = false;
        this.loadComodatos();
      },
      error: (err) => {
        console.error('Error al actualizar comodato:', err);
        this.submittingEditComodato = false;
      },
    });
  }

  // ──────────────── Devolver Comodato ────────────────

  openConfirmDevolucionModal(com: ComodatoItem): void {
    this.comodatoToDevolver = com;
    this.submittingDevolucion = false;
    this.showConfirmDevolucionModal = true;
  }

  closeConfirmDevolucionModal(): void {
    this.showConfirmDevolucionModal = false;
    this.comodatoToDevolver = null;
  }

  confirmDevolucion(): void {
    const com = this.comodatoToDevolver;
    if (!com) return;
    this.submittingDevolucion = true;
    const today = new Date().toISOString().split('T')[0];
    this.api.updateComodato(com.idComodato, {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo ? com.fechaPrestamo.substring(0, 10) : today,
      fecha_devolucion: today,
      estatus: 'DEVUELTO',
      monto_total: com.montoTotal,
      monto_pagado: com.montoPagado,
      saldo_pendiente: com.saldoPendiente,
      exento_pago: com.exentoPago,
      notas: com.notas || null,
    }).subscribe({
      next: () => {
        this.submittingDevolucion = false;
        this.closeConfirmDevolucionModal();
        this.loadComodatos();
      },
      error: (err) => {
        console.error('Error al registrar devolución:', err);
        this.submittingDevolucion = false;
      },
    });
  }
}
