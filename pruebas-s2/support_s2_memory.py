"""Repositorios en memoria para pruebas Sprint 2 sin Oracle."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Optional

from fastapi import HTTPException

from app.application.almacen.dtos import ComodatoCreate, ProductoCreate, ServicioCreate
from app.domain.exceptions import NotFoundError
from app.domain.almacen.entities import Comodato, MovimientoStock, Producto, Servicio
from app.domain.exportaciones.entities import FilePayload
from app.domain.reportes.entities import HistorialReporte
from app.domain.shared.current_user import CurrentUser


class InMemoryAlmacenRepository:
    """Almacén mínimo: productos, servicios, comodatos, stats y movimientos vacíos."""

    def __init__(self) -> None:
        self._productos: dict[int, Producto] = {}
        self._servicios: dict[int, Servicio] = {}
        self._comodatos: dict[int, Comodato] = {}
        self._movimientos: list[MovimientoStock] = []
        self._next_p = 1
        self._next_s = 1
        self._next_c = 1

    def listar_productos(
        self,
        tipo_producto: Optional[str] = None,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Producto]:
        del current_user
        rows = [deepcopy(p) for p in self._productos.values()]
        if tipo_producto:
            rows = [p for p in rows if p.get("tipo_producto") == tipo_producto]
        if activo:
            rows = [p for p in rows if p.get("activo") == activo]
        if busqueda:
            b = busqueda.lower()
            rows = [p for p in rows if b in (p.get("nombre") or "").lower()]
        return rows[offset : offset + limit]

    def obtener_producto(self, id_producto: int, current_user: CurrentUser | None = None) -> Producto:
        del current_user
        if id_producto not in self._productos:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return deepcopy(self._productos[id_producto])

    def crear_producto(self, data: ProductoCreate, current_user: CurrentUser | None = None) -> Producto:
        del current_user
        pid = self._next_p
        self._next_p += 1
        row: Producto = {
            "id_producto": pid,
            "clave_interna": data.clave_interna,
            "nombre": data.nombre,
            "descripcion": data.descripcion,
            "tipo_producto": data.tipo_producto,
            "precio_cuota_a": data.precio_cuota_a,
            "precio_cuota_b": data.precio_cuota_b,
            "activo": data.activo,
            "cantidad_disponible": data.cantidad_disponible,
            "nivel_minimo": data.nivel_minimo,
        }
        self._productos[pid] = row
        return deepcopy(row)

    def actualizar_producto(
        self, id_producto: int, data: ProductoCreate, current_user: CurrentUser | None = None
    ) -> Producto:
        del current_user
        if id_producto not in self._productos:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        self._productos[id_producto].update(
            {
                "nombre": data.nombre,
                "clave_interna": data.clave_interna,
                "tipo_producto": data.tipo_producto,
                "activo": data.activo,
            }
        )
        return deepcopy(self._productos[id_producto])

    def desactivar_producto(self, id_producto: int, current_user: CurrentUser | None = None) -> None:
        del current_user
        if id_producto not in self._productos:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        self._productos[id_producto]["activo"] = "N"

    def listar_servicios(
        self,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Servicio]:
        del current_user
        rows = [deepcopy(s) for s in self._servicios.values()]
        if activo:
            rows = [s for s in rows if s.get("activo") == activo]
        if busqueda:
            b = busqueda.lower()
            rows = [s for s in rows if b in (s.get("nombre") or "").lower()]
        return rows[offset : offset + limit]

    def obtener_servicio(self, id_servicio: int, current_user: CurrentUser | None = None) -> Servicio:
        del current_user
        if id_servicio not in self._servicios:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        return deepcopy(self._servicios[id_servicio])

    def crear_servicio(self, data: ServicioCreate, current_user: CurrentUser | None = None) -> Servicio:
        del current_user
        sid = self._next_s
        self._next_s += 1
        row: Servicio = {
            "id_servicio": sid,
            "nombre": data.nombre,
            "descripcion": data.descripcion,
            "cuota_recuperacion": data.cuota_recuperacion,
            "precio_cuota_a": data.precio_cuota_a,
            "precio_cuota_b": data.precio_cuota_b,
            "activo": data.activo,
        }
        self._servicios[sid] = row
        return deepcopy(row)

    def actualizar_servicio(
        self, id_servicio: int, data: ServicioCreate, current_user: CurrentUser | None = None
    ) -> Servicio:
        del current_user
        if id_servicio not in self._servicios:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        self._servicios[id_servicio].update(
            {
                "nombre": data.nombre,
                "descripcion": data.descripcion,
                "cuota_recuperacion": data.cuota_recuperacion,
                "activo": data.activo,
            }
        )
        return deepcopy(self._servicios[id_servicio])

    def desactivar_servicio(self, id_servicio: int, current_user: CurrentUser | None = None) -> None:
        del current_user
        if id_servicio not in self._servicios:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        self._servicios[id_servicio]["activo"] = "N"

    def listar_comodatos(
        self,
        estatus: Optional[str] = None,
        busqueda: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Comodato]:
        del current_user
        rows = [deepcopy(c) for c in self._comodatos.values()]
        if estatus:
            rows = [c for c in rows if c.get("estatus") == estatus]
        if busqueda:
            b = busqueda.lower()
            rows = [c for c in rows if b in (c.get("folio_comodato") or "").lower()]
        return rows[offset : offset + limit]

    def obtener_comodato(self, id_comodato: int, current_user: CurrentUser | None = None) -> Comodato:
        del current_user
        if id_comodato not in self._comodatos:
            raise HTTPException(status_code=404, detail="Comodato no encontrado")
        return deepcopy(self._comodatos[id_comodato])

    def crear_comodato(self, data: ComodatoCreate, current_user: CurrentUser | None = None) -> Comodato:
        del current_user
        cid = self._next_c
        self._next_c += 1
        folio = f"COM-{cid:06d}"
        row: Comodato = {
            "id_comodato": cid,
            "folio_comodato": folio,
            "id_equipo": data.id_equipo,
            "id_paciente": data.id_paciente,
            "fecha_prestamo": data.fecha_prestamo,
            "fecha_devolucion": data.fecha_devolucion,
            "estatus": data.estatus or "PRESTADO",
            "monto_total": data.monto_total,
            "monto_pagado": data.monto_pagado,
            "saldo_pendiente": data.saldo_pendiente,
            "exento_pago": data.exento_pago,
            "notas": data.notas,
            "nombre_paciente": "Paciente Demo",
            "folio_paciente": "BEN-000001",
            "nombre_equipo": "Equipo Demo",
        }
        self._comodatos[cid] = row
        return deepcopy(row)

    def actualizar_comodato(
        self, id_comodato: int, data: ComodatoCreate, current_user: CurrentUser | None = None
    ) -> Comodato:
        del current_user
        if id_comodato not in self._comodatos:
            raise HTTPException(status_code=404, detail="Comodato no encontrado")
        self._comodatos[id_comodato].update(
            {
                "fecha_devolucion": data.fecha_devolucion,
                "estatus": data.estatus,
                "notas": data.notas,
            }
        )
        return deepcopy(self._comodatos[id_comodato])

    def listar_movimientos(
        self,
        id_producto: Optional[int] = None,
        tipo_movimiento: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MovimientoStock]:
        del current_user
        rows = [deepcopy(m) for m in self._movimientos]
        if id_producto is not None:
            rows = [m for m in rows if m.get("id_producto") == id_producto]
        if tipo_movimiento:
            rows = [m for m in rows if m.get("tipo_movimiento") == tipo_movimiento]
        return rows[offset : offset + limit]

    def almacen_stats(self, current_user: CurrentUser | None = None) -> dict[str, Any]:
        del current_user
        return {
            "total_productos": len(self._productos),
            "alertas_stock_bajo": 0,
            "alertas_caducidad": 0,
        }

    def ajustar_existencia(
        self,
        id_producto: int,
        stock_nuevo: int,
        motivo: str,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del motivo, current_user
        if id_producto not in self._productos:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        self._productos[id_producto]["cantidad_disponible"] = stock_nuevo
        return dict(self._productos[id_producto])


class InMemoryReportesRepository:
    """Respuestas mínimas para endpoints de reportes JSON."""

    def _empty_breakdown(self) -> dict[str, Any]:
        return {"total": 0, "detalle": []}

    def reporte_por_genero(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return self._empty_breakdown()

    def reporte_por_etapa_vida(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return self._empty_breakdown()

    def reporte_por_tipo_espina(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return self._empty_breakdown()

    def reporte_por_estado(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return self._empty_breakdown()

    def reporte_resumen(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return {"total_beneficiarios": 3, "activos": 3, "por_genero": {"Masculino": 1, "Femenino": 2}}

    def reporte_servicios_por_tipo(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del fecha_inicio, fecha_fin, current_user
        return {"filas": []}

    def reporte_estudios_por_tipo(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del fecha_inicio, fecha_fin, current_user
        return {"filas": []}

    def reporte_pagos_exentos(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del fecha_inicio, fecha_fin, current_user
        return {"total": 0, "filas": []}

    def reporte_consolidado_mensual(
        self,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del mes, anio, current_user
        return {"ingresos": 0.0, "egresos": 0.0}

    def historial_reportes(
        self,
        tipo_reporte: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[HistorialReporte]:
        del tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset
        return []

    def reporte_por_ciudad(self, current_user: CurrentUser | None = None) -> dict[str, Any]:
        del current_user
        return {"filas": []}

    def indicadores_desempeno(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        del fecha_inicio, fecha_fin, current_user
        return {"citas_completadas": 0}


class InMemoryExportacionesRepository:
    """PDF/Excel sintéticos para contratos de exportación."""

    _PDF_MAGIC = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"

    def __init__(self, cita_ids_validos: frozenset[int] | None = None) -> None:
        self._citas_ok = cita_ids_validos or frozenset({1})

    def exportar_reporte_pdf(
        self,
        tipo: str = "resumen",
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload:
        del genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user
        return FilePayload(
            content=self._PDF_MAGIC + f"tipo={tipo}\n".encode(),
            media_type="application/pdf",
            filename=f"reporte-{tipo}.pdf",
        )

    def exportar_beneficiario_pdf(self, folio: str, current_user: CurrentUser | None = None) -> FilePayload:
        del current_user
        return FilePayload(
            content=self._PDF_MAGIC + folio.encode(),
            media_type="application/pdf",
            filename=f"{folio}.pdf",
        )

    def exportar_credencial_pdf(self, folio: str, current_user: CurrentUser | None = None) -> FilePayload:
        del current_user
        return FilePayload(
            content=self._PDF_MAGIC,
            media_type="application/pdf",
            filename=f"cred-{folio}.pdf",
        )

    def exportar_comprobante_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> FilePayload:
        del current_user
        if id_cita not in self._citas_ok:
            raise NotFoundError("Cita no encontrada")
        return FilePayload(
            content=self._PDF_MAGIC + f"id_cita={id_cita}".encode(),
            media_type="application/pdf",
            filename=f"comprobante-cita-{id_cita}.pdf",
        )

    def exportar_contrato_comodato(self, id_comodato: int, current_user: CurrentUser | None = None) -> FilePayload:
        del current_user
        return FilePayload(
            content=self._PDF_MAGIC + f"id={id_comodato}".encode(),
            media_type="application/pdf",
            filename=f"comodato-{id_comodato}.pdf",
        )

    def exportar_beneficiarios_excel(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        membresia_estatus: Optional[str] = None,
        busqueda: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload:
        del genero, estado, membresia_estatus, busqueda, current_user
        return FilePayload(
            content=b"PK\x03\x04fake-xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="beneficiarios.xlsx",
        )

    def exportar_reporte_excel(
        self,
        tipo: str = "resumen",
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload:
        del fecha_inicio, fecha_fin, mes, anio, current_user
        return FilePayload(
            content=b"PK\x03\x04fake-xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"reporte-{tipo}.xlsx",
        )
