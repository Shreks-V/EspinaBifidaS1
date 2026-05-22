"""
Exportaciones — PDF y Excel.

Cubre:
  RF-ER-05  Reportes en formato PDF
  RF-ER-06  Reporte general de un paciente en PDF
  RF-ER-11  Exportar tablas a Excel
  RF-RB-06  Credencial de beneficiario en PDF
  RF-RB-07  Exportar lista filtrada de beneficiarios a Excel
  RF-SO-10  Comprobante de servicio / cita en PDF
  RF-PS-05  Contrato de comodato en PDF
"""
import io
from typing import Optional
from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from app.domain.exportaciones.entities import FilePayload
from app.application.exportaciones import use_cases as service
from app.presentation.api.security import get_current_user

router = APIRouter()


def _payload_response(payload: FilePayload) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(payload.content),
        media_type=payload.media_type,
        headers={"Content-Disposition": f'attachment; filename="{payload.filename}"'},
    )


@router.get('/reportes/pdf')
def exportar_reporte_pdf(tipo: str=Query('resumen', description='resumen | por-genero | por-etapa-vida | por-estado | por-tipo-espina'), genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user))

@router.get('/beneficiario/{folio}/pdf')
def exportar_beneficiario_pdf(folio: str, current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_beneficiario_pdf(folio, current_user))

@router.get('/beneficiario/{folio}/credencial')
def exportar_credencial_pdf(folio: str, current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_credencial_pdf(folio, current_user))

@router.get('/cita/{id_cita}/comprobante')
def exportar_comprobante_cita(id_cita: int, current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_comprobante_cita(id_cita, current_user))

@router.get('/comodato/{id_comodato}/contrato')
def exportar_contrato_comodato(id_comodato: int, current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_contrato_comodato(id_comodato, current_user))

@router.get('/beneficiarios/excel')
def exportar_beneficiarios_excel(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), membresia_estatus: Optional[str]=Query(None), busqueda: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user))

@router.get('/reportes/excel')
def exportar_reporte_excel(tipo: str=Query('resumen', description='resumen | servicios-por-tipo | pagos-exentos | consolidado-mensual'), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), mes: Optional[int]=Query(None), anio: Optional[int]=Query(None), current_user: dict=Depends(get_current_user)):
    return _payload_response(service.exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user))
