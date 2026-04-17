"""
Exportaciones — Sprint 1.

Cubre:
  HU-03  Credencial de beneficiario en PDF      (/beneficiario/{folio}/credencial)
  HU-02  Ficha completa de beneficiario en PDF  (/beneficiario/{folio}/pdf)
  HU-02  Lista de beneficiarios en Excel        (/beneficiarios/excel)
  HU-08  Comprobante de cita en PDF             (/cita/{id_cita}/comprobante)

Pendientes (sprints posteriores): reportes/pdf, reportes/excel, comodato/contrato.
"""
from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.application.exportaciones import use_cases as service
from app.presentation.api.security import get_current_user

router = APIRouter()

@router.get('/beneficiario/{folio}/credencial')
def exportar_credencial_pdf(folio: str, current_user: dict = Depends(get_current_user)):
    return service.exportar_credencial_pdf(folio, current_user)

@router.get('/beneficiario/{folio}/pdf')
def exportar_beneficiario_pdf(folio: str, current_user: dict = Depends(get_current_user)):
    return service.exportar_beneficiario_pdf(folio, current_user)

@router.get('/beneficiarios/excel')
def exportar_beneficiarios_excel(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    membresia_estatus: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    return service.exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user)

@router.get('/cita/{id_cita}/comprobante')
def exportar_comprobante_cita(id_cita: int, current_user: dict = Depends(get_current_user)):
    return service.exportar_comprobante_cita(id_cita, current_user)
