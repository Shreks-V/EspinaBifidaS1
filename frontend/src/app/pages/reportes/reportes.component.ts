import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface CrossTabRow {
  etapa: string;
  total?: number;
  [key: string]: string | number | undefined;
}

interface CrossTab {
  titulo: string;
  cols: string[];
  rows: CrossTabRow[];
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './reportes.component.html',
  styles: [`
    @media print {
      app-navbar, app-footer, button { display: none !important; }
    }
  `]
})
export class ReportesComponent implements OnInit {
  // ─── Section 1 state ───
  sec1FechaInicio = '';
  sec1FechaFin = '';
  sec1Loading = false;
  sec1Error = '';
  sec1Loaded = false;
  sec1Credenciales = 0;
  sec1TotalServicios = 0;
  sec1Exentos = 0;
  sec1Cuotas = 0;
  sec1Hombres = 0;
  sec1Mujeres = 0;
  sec1Nl = 0;
  sec1Foraneos = 0;
  sec1Lactantes = 0;
  sec1Ninos = 0;
  sec1Adolescentes = 0;
  sec1Adultos = 0;
  sec1ServiciosList: { nombre: string; cantidad: number }[] = [];
  sec1CiudadesList: { nombre: string; estado: string; cantidad: number }[] = [];
  sec1EstudiosList: { nombre: string; cantidad: number }[] = [];

  // ─── Section 2 state ───
  indicPeriodo = '3m';
  indicFechaInicio = '';
  indicFechaFin = '';
  indicLoading = false;
  indicError = '';
  indicLoaded = false;
  indicActivos = 0;
  indicNuevos = 0;
  indicHombres = 0;
  indicMujeres = 0;
  indicMunicipios: { label: string; value: number }[] = [];
  indicTables: CrossTab[] = [];

  indicPeriodos = [
    { id: '3m', label: '3 meses' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
  ];

  // ─── Section 3: Segmentación demográfica ───
  seg3FechaInicio = '';
  seg3FechaFin = '';
  seg3Loading = false;
  seg3Error = '';
  seg3Loaded = false;
  seg3Genero: { label: string; value: number }[] = [];
  seg3EtapaVida: { label: string; value: number }[] = [];
  seg3TipoEspina: { label: string; value: number }[] = [];
  seg3Estado: { label: string; value: number }[] = [];

  // ─── Section 4: Consolidado mensual ───
  currentYear = new Date().getFullYear();
  consol4Mes = new Date().getMonth() + 1;
  consol4Anio = new Date().getFullYear();
  consol4Loading = false;
  consol4Error = '';
  consol4Loaded = false;
  consol4Data: any = null;
  consol4Meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.sec1FechaInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.sec1FechaFin = lastDay.toISOString().slice(0, 10);
    this.setIndicPeriod('3m');
  }

  setIndicPeriod(period: string): void {
    this.indicPeriodo = period;
    const today = new Date();
    const inicio = new Date(today);
    if (period === '3m') inicio.setMonth(today.getMonth() - 3);
    else if (period === '6m') inicio.setMonth(today.getMonth() - 6);
    else if (period === '1y') inicio.setFullYear(today.getFullYear() - 1);
    this.indicFechaInicio = inicio.toISOString().slice(0, 10);
    this.indicFechaFin = today.toISOString().slice(0, 10);
  }

  cargarResumenPeriodo(): void {
    this.sec1Loading = true;
    this.sec1Error = '';
    this.sec1Loaded = false;
    forkJoin({
      servicios: this.api.getReporteServiciosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      pagos: this.api.getReportePagosExentos({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      estudios: this.api.getReporteEstudiosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      stats: this.api.getDashboardStats(),
      ciudades: this.api.getReportePorCiudad(),
    }).subscribe({
      next: ({ servicios, pagos, estudios, stats, ciudades }) => {
        this.sec1Credenciales = stats.activos ?? 0;
        this.sec1TotalServicios = servicios.total ?? 0;
        this.sec1Exentos = pagos.total_exentos ?? 0;
        this.sec1Cuotas = pagos.total_cuotas ?? 0;

        const pg: Record<string, number> = stats.por_genero ?? {};
        const pp: Record<string, number> = stats.por_procedencia ?? {};
        const pe: Record<string, number> = stats.por_etapa_vida ?? {};
        this.sec1Hombres = pg['Masculino'] ?? 0;
        this.sec1Mujeres = pg['Femenino'] ?? 0;
        this.sec1Nl = pp['Nuevo León'] ?? 0;
        this.sec1Foraneos = pp['Foráneos'] ?? 0;
        this.sec1Lactantes = pe['Primera Infancia (0-5)'] ?? 0;
        this.sec1Ninos = pe['Infancia (6-11)'] ?? 0;
        this.sec1Adolescentes = pe['Adolescencia (12-17)'] ?? 0;
        this.sec1Adultos = (pe['Juventud (18-29)'] ?? 0) + (pe['Adultez (30-59)'] ?? 0) + (pe['Adulto Mayor (60+)'] ?? 0);

        const sLabels: string[] = servicios.labels ?? [];
        const sValues: number[] = servicios.values ?? [];
        this.sec1ServiciosList = sLabels.map((nombre, i) => ({ nombre, cantidad: sValues[i] ?? 0 }));

        const cLabels: string[] = ciudades.labels ?? [];
        const cEstados: string[] = ciudades.estados ?? [];
        const cValues: number[] = ciudades.values ?? [];
        this.sec1CiudadesList = cLabels.map((nombre, i) => ({ nombre, estado: cEstados[i] ?? '', cantidad: cValues[i] ?? 0 }));

        const eLabels: string[] = estudios.labels ?? [];
        const eValues: number[] = estudios.values ?? [];
        this.sec1EstudiosList = eLabels.map((nombre, i) => ({ nombre, cantidad: eValues[i] ?? 0 }));

        this.sec1Loaded = true;
        this.sec1Loading = false;
      },
      error: (err: any) => {
        this.sec1Error = err?.error?.detail || 'Error al cargar los datos del resumen.';
        this.sec1Loading = false;
      },
    });
  }

  cargarIndicadores(): void {
    this.indicLoading = true;
    this.indicError = '';
    this.indicLoaded = false;
    this.api.getIndicadoresDesempeno({
      fecha_inicio: this.indicFechaInicio,
      fecha_fin: this.indicFechaFin,
    }).subscribe({
      next: (data: any) => {
        this.indicActivos = data.beneficiarios_activos ?? 0;
        this.indicNuevos = data.nuevos_en_periodo ?? 0;
        this.indicHombres = data.hombres ?? 0;
        this.indicMujeres = data.mujeres ?? 0;
        this.indicMunicipios = data.municipios ?? [];

        const tablas = data.tablas ?? {};
        this.indicTables = [
          { titulo: 'Sujetos de derecho por CURP', cols: ['CURP N.L.', 'CURP Foráneo'], rows: tablas.por_curp ?? [] },
          { titulo: 'Sujetos de derecho por CURP N.L.', cols: ['Hombre', 'Mujer'], rows: tablas.curp_nl_genero ?? [] },
          { titulo: 'Sujetos de derecho foráneos', cols: ['Hombre', 'Mujer'], rows: tablas.curp_foraneo_genero ?? [] },
          { titulo: 'Sujetos de derecho por lugar de residencia', cols: ['Viven en N.L.', 'Viven en otros estados'], rows: tablas.residencia ?? [] },
          { titulo: 'Sujetos de derecho por nacimiento', cols: ['Mexicanos', 'Nac. extranjera'], rows: tablas.nacimiento ?? [] },
          { titulo: 'Sujetos de derecho por etapa de vida', cols: ['Hombre', 'Mujer'], rows: tablas.etapa_vida_genero ?? [] },
        ];

        this.indicLoaded = true;
        this.indicLoading = false;
      },
      error: (err: any) => {
        this.indicError = err?.error?.detail || 'Error al cargar los indicadores.';
        this.indicLoading = false;
      },
    });
  }

  exportarPDFResumen(): void {
    this.api.exportarReportePdf('resumen', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
      .subscribe({
        next: (blob) => this.descargar(blob, `reporte_resumen_${this.sec1FechaInicio}.pdf`),
        error: () => alert('Error al generar PDF'),
      });
  }

  exportarExcelResumen(): void {
    this.api.exportarReporteExcel('all', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
      .subscribe({
        next: (blob) => this.descargar(blob, `reportes_${this.sec1FechaInicio}_${this.sec1FechaFin}.xlsx`),
        error: () => alert('Error al generar Excel'),
      });
  }

  cargarSegmentacion(): void {
    this.seg3Loading = true;
    this.seg3Error = '';
    this.seg3Loaded = false;
    const filters = { fecha_inicio: this.seg3FechaInicio || undefined, fecha_fin: this.seg3FechaFin || undefined };
    forkJoin({
      genero: this.api.getReportePorGenero(filters),
      etapa: this.api.getReportePorEtapaVida(filters),
      espina: this.api.getReportePorTipoEspina(filters),
      estado: this.api.getReportePorEstado(filters),
    }).subscribe({
      next: ({ genero, etapa, espina, estado }) => {
        this.seg3Genero = (genero.labels as string[]).map((l: string, i: number) => ({ label: l, value: (genero.values as number[])[i] ?? 0 }));
        this.seg3EtapaVida = (etapa.labels as string[]).map((l: string, i: number) => ({ label: l, value: (etapa.values as number[])[i] ?? 0 }));
        this.seg3TipoEspina = (espina.labels as string[]).map((l: string, i: number) => ({ label: l, value: (espina.values as number[])[i] ?? 0 }));
        this.seg3Estado = (estado.labels as string[]).map((l: string, i: number) => ({ label: l, value: (estado.values as number[])[i] ?? 0 }));
        this.seg3Loaded = true;
        this.seg3Loading = false;
      },
      error: (err: any) => {
        this.seg3Error = err?.error?.detail || 'Error al cargar la segmentación.';
        this.seg3Loading = false;
      },
    });
  }

  seg3Total(rows: { label: string; value: number }[]): number {
    return rows.reduce((acc, r) => acc + r.value, 0);
  }

  cargarConsolidadoMensual(): void {
    this.consol4Loading = true;
    this.consol4Error = '';
    this.consol4Loaded = false;
    this.consol4Data = null;
    this.api.getReporteConsolidadoMensual(this.consol4Mes, this.consol4Anio).subscribe({
      next: (data: any) => {
        this.consol4Data = data;
        this.consol4Loaded = true;
        this.consol4Loading = false;
      },
      error: (err: any) => {
        this.consol4Error = err?.error?.detail || 'Error al generar el reporte consolidado.';
        this.consol4Loading = false;
      },
    });
  }

  consol4CitasEntries(): { key: string; value: number }[] {
    if (!this.consol4Data?.citas_por_estatus) return [];
    return Object.entries(this.consol4Data.citas_por_estatus).map(([key, value]) => ({ key, value: value as number }));
  }

  consol4GeneroEntries(): { key: string; value: number }[] {
    if (!this.consol4Data?.por_genero) return [];
    return Object.entries(this.consol4Data.por_genero).map(([key, value]) => ({ key, value: value as number }));
  }

  consol4NombreMes(mes: number): string {
    return this.consol4Meses.find(m => m.value === mes)?.label ?? String(mes);
  }

  exportarConsolidadoExcel(): void {
    this.api.exportarReporteExcel('consolidado-mensual', { mes: this.consol4Mes, anio: this.consol4Anio })
      .subscribe({
        next: (blob) => this.descargar(blob, `consolidado_${this.consol4NombreMes(this.consol4Mes)}_${this.consol4Anio}.xlsx`),
        error: () => alert('Error al generar Excel'),
      });
  }

  private descargar(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 150);
  }
}
