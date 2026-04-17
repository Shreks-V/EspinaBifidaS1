import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ──────────────── Beneficiarios ────────────────

  getBeneficiarios(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/beneficiarios`, { params });
  }

  getBeneficiario(folio: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/${folio}`);
  }

  createBeneficiario(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/beneficiarios`, data);
  }

  updateBeneficiario(folio: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/beneficiarios/${folio}`, data);
  }

  deleteBeneficiario(folio: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/beneficiarios/${folio}`);
  }

  getBeneficiarioHistorial(folio: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/${folio}/historial`);
  }

  getBeneficiariosStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/stats`);
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/stats/dashboard`);
  }

  getTiposEspina(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/beneficiarios/tipos-espina`);
  }

  getNotificaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notificaciones`);
  }

  getMembresiasProximasAVencer(dias: number = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/beneficiarios/membresias/proximas-a-vencer?dias=${dias}`);
  }

  renovarMembresia(folio: string, data: { monto_total: number; exento_pago: string; metodos_pago: { id_metodo_pago: number; monto: number }[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/beneficiarios/${folio}/renovar-membresia`, data);
  }

  // ──────────────── Citas ────────────────

  getCitas(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/citas`, { params });
  }

  getCita(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/${id}`);
  }

  createCita(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas`, data);
  }

  updateCita(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/citas/${id}`, data);
  }

  completarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/citas/${id}/completar`, {});
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/citas/${id}/cancelar`, {});
  }

  deleteCita(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/citas/${id}`);
  }

  getCitasStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/stats`);
  }

  getCitasHoy(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/hoy`);
  }

  // ──────────────── Doctores ────────────────

  getDoctores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctores`);
  }

  getDoctorHoy(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/doctores/hoy`);
  }

  getDoctor(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/doctores/${id}`);
  }

  createDoctor(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/doctores`, data);
  }

  updateDoctor(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/doctores/${id}`, data);
  }

  deleteDoctor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/doctores/${id}`);
  }

  getDoctorDisponibilidad(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctores/${id}/disponibilidad`);
  }

  getDisponibilidadSemana(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctores/disponibilidad/semana`);
  }

  createDoctorDisponibilidad(idDoctor: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/doctores/${idDoctor}/disponibilidad`, data);
  }

  deleteDoctorDisponibilidad(idDoctor: number, idDisponibilidad: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/doctores/${idDoctor}/disponibilidad/${idDisponibilidad}`);
  }

  getDoctorServicios(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctores/${id}/servicios`);
  }

  // ──────────────── Almacen ────────────────

  getProductos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/productos`, { params });
  }

  createProducto(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/productos`, data);
  }

  updateProducto(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/almacen/productos/${id}`, data);
  }

  deleteProducto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/almacen/productos/${id}`);
  }

  getServicios(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/servicios`, { params });
  }

  createServicio(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/servicios`, data);
  }

  updateServicio(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/almacen/servicios/${id}`, data);
  }

  deleteServicio(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/almacen/servicios/${id}`);
  }

  getComodatos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/comodatos`, { params });
  }

  createComodato(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/comodatos`, data);
  }

  updateComodato(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/almacen/comodatos/${id}`, data);
  }

  getAlmacenStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/almacen/stats`);
  }

  getMovimientos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/movimientos`, { params });
  }

  // ──────────────── Recibos ────────────────

  getRecibos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/recibos`, { params });
  }

  createRecibo(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/recibos`, data);
  }

  getRecibo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recibos/${id}`);
  }

  cancelarRecibo(id: number, motivo?: string): Observable<any> {
    const params = motivo ? `?motivo=${encodeURIComponent(motivo)}` : '';
    return this.http.put<any>(`${this.apiUrl}/recibos/${id}/cancelar${params}`, {});
  }

  getRecibosStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recibos/stats`);
  }

  getMetodosPago(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recibos/metodos-pago`);
  }

  // ──────────────── Exportaciones (PDF / Excel) ────────────────

  exportarReportePdf(tipo: string, filters?: any): Observable<Blob> {
    let params = new HttpParams().set('tipo', tipo);
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/exportaciones/reportes/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  exportarBeneficiarioPdf(folio: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportaciones/beneficiario/${folio}/pdf`, {
      responseType: 'blob',
    });
  }

  exportarCredencialPdf(folio: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportaciones/beneficiario/${folio}/credencial`, {
      responseType: 'blob',
    });
  }

  exportarComprobanteCitaPdf(idCita: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportaciones/cita/${idCita}/comprobante`, {
      responseType: 'blob',
    });
  }

  exportarContratoComodatoPdf(idComodato: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportaciones/comodato/${idComodato}/contrato`, {
      responseType: 'blob',
    });
  }

  exportarBeneficiariosExcel(filters?: any): Observable<Blob> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/exportaciones/beneficiarios/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportarReporteExcel(tipo: string, filters?: any): Observable<Blob> {
    let params = new HttpParams().set('tipo', tipo);
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/exportaciones/reportes/excel`, {
      params,
      responseType: 'blob',
    });
  }

  // ──────────────── Reportes ────────────────

  getReportePorGenero(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/por-genero`, { params });
  }

  getReportePorEtapaVida(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/por-etapa-vida`, { params });
  }

  getReportePorTipoEspina(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/por-tipo-espina`, { params });
  }

  getReportePorEstado(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/por-estado`, { params });
  }

  getReporteResumen(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/resumen`, { params });
  }

  getReporteServiciosPorTipo(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/servicios-por-tipo`, { params });
  }

  getReporteEstudiosPorTipo(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/estudios-por-tipo`, { params });
  }

  getReportePagosExentos(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/pagos-exentos`, { params });
  }

  getReporteConsolidadoMensual(mes?: number, anio?: number): Observable<any> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes.toString());
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<any>(`${this.apiUrl}/reportes/consolidado-mensual`, { params });
  }

  getHistorialReportes(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/reportes/historial`, { params });
  }

  // ──────────────── Pre-registro ────────────────

  getPreRegistros(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/preregistro`);
  }

  getPreRegistro(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/preregistro/${id}`);
  }

  createPreRegistro(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/preregistro`, data);
  }

  updatePreRegistro(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/preregistro/${id}`, data);
  }

  aprobarPreRegistro(id: number, tipoCuota?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/preregistro/${id}/aprobar`, { tipo_cuota: tipoCuota || null });
  }

  rechazarPreRegistro(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/preregistro/${id}/rechazar`, {});
  }

  getTiposEspinaPublic(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/preregistro/tipos-espina`);
  }

  getTiposDocumentoPublic(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/preregistro/tipos-documento`);
  }

  uploadDocumento(idPaciente: number, idTipoDocumento: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('id_tipo_documento', idTipoDocumento.toString());
    formData.append('archivo', file);
    return this.http.post<any>(`${this.apiUrl}/preregistro/${idPaciente}/documentos`, formData);
  }

  getDocumentos(idPaciente: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/preregistro/${idPaciente}/documentos`);
  }

  getDocumentoArchivoUrl(idPaciente: number, idDocumento: number): string {
    return `${this.apiUrl}/preregistro/${idPaciente}/documentos/${idDocumento}/archivo`;
  }

  deleteDocumento(idPaciente: number, idDocumento: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/preregistro/${idPaciente}/documentos/${idDocumento}`);
  }

  // ──────────────── Auth (seed) ────────────────

  seedUsers(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/seed`, {});
  }
}
