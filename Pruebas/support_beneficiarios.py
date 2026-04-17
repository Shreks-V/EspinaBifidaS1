from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import HTTPException

from app.schemas.schemas import BeneficiarioCreate


def _visible(p: dict[str, Any]) -> bool:
    return p.get("activo") == "S" and p.get("estatus_registro") == "APROBADO"


def _tipo_label(id_tipo: int) -> str:
    return {1: "Lumbar", 2: "Torácica"}.get(id_tipo, f"Tipo {id_tipo}")


def _resolve_tipos(ids: list[int] | None) -> list[dict[str, Any]]:
    if not ids:
        return []
    return [{"id_tipo_espina": tid, "nombre": _tipo_label(tid)} for tid in ids]


class InMemoryBeneficiariosRepository:
    """Repositorio en memoria para pruebas de API (sin Oracle)."""

    def __init__(self, seed: list[dict[str, Any]] | None = None) -> None:
        self._by_folio: dict[str, dict[str, Any]] = {}
        self._next_id = 1
        for row in seed or []:
            folio = row["folio"]
            self._by_folio[folio] = deepcopy(row)
            self._next_id = max(self._next_id, int(row["id_paciente"]) + 1)

    def _all(self) -> list[dict[str, Any]]:
        return list(self._by_folio.values())

    def _response_dict(self, row: dict[str, Any]) -> dict[str, Any]:
        out = {k: v for k, v in row.items() if k != "estatus_registro"}
        return out

    def listar_tipos_espina(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return [
            {"id_tipo_espina": 1, "nombre": "Lumbar", "descripcion": "Prueba", "activo": "S"},
            {"id_tipo_espina": 2, "nombre": "Torácica", "descripcion": "Prueba", "activo": "S"},
        ]

    def stats_beneficiarios(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        approved = [p for p in self._all() if p.get("estatus_registro") == "APROBADO"]
        total = len(approved)
        activos_list = [p for p in approved if p.get("activo") == "S"]
        activos = len(activos_list)
        inactivos = total - activos
        return {"total": total, "activos": activos, "inactivos": inactivos}

    def dashboard_stats(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        visible = [p for p in self._all() if _visible(p)]
        total = len(visible)
        m = sum(1 for p in visible if (p.get("genero") or "").strip() == "Masculino")
        f = sum(1 for p in visible if (p.get("genero") or "").strip() == "Femenino")
        activo_mem = sum(1 for p in visible if p.get("membresia_estatus") == "ACTIVO")
        return {
            "total": total,
            "activos": activo_mem,
            "inactivos": total - activo_mem,
            "por_genero": {"Masculino": m, "Femenino": f},
            "por_procedencia": {"Nuevo León": 0, "Foráneos": total},
            "por_etapa_vida": {},
            "nuevos_esta_semana": 0,
            "nuevos_semana_anterior": 0,
        }

    def listar_beneficiarios(
        self,
        nombre: str | None = None,
        estado: str | None = None,
        genero: str | None = None,
        busqueda: str | None = None,
        membresia_estatus: str | None = None,
        tipo_cuota: str | None = None,
        current_user: dict | None = None,
    ) -> list[dict[str, Any]]:
        del current_user
        rows = [p for p in self._all() if _visible(p)]

        if nombre:
            n = nombre.lower()
            rows = [
                p
                for p in rows
                if n in (p.get("nombre") or "").lower()
                or n in (p.get("apellido_paterno") or "").lower()
                or n in (p.get("apellido_materno") or "").lower()
            ]
        if estado:
            rows = [p for p in rows if p.get("membresia_estatus") == estado]
        if membresia_estatus:
            rows = [p for p in rows if p.get("membresia_estatus") == membresia_estatus]
        if tipo_cuota:
            rows = [p for p in rows if (p.get("tipo_cuota") or "") == tipo_cuota]
        if genero:
            rows = [p for p in rows if (p.get("genero") or "") == genero]
        if busqueda:
            b = busqueda.lower()
            rows = [
                p
                for p in rows
                if b in (p.get("nombre") or "").lower()
                or b in (p.get("apellido_paterno") or "").lower()
                or b in (p.get("apellido_materno") or "").lower()
                or b in (p.get("folio") or "").lower()
                or b in (p.get("ciudad") or "").lower()
            ]
        return [self._response_dict(p) for p in rows]

    def obtener_beneficiario(self, folio: str, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        row = self._by_folio.get(folio)
        if row is None:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        return self._response_dict(row)

    def crear_beneficiario(
        self, data: BeneficiarioCreate, current_user: dict | None = None
    ) -> dict[str, Any]:
        payload = data.model_dump()
        tipos_ids = payload.pop("tipos_espina", None) or []
        pid = self._next_id
        self._next_id += 1
        folio = f"BEN-{pid:06d}"
        row: dict[str, Any] = {
            "id_paciente": pid,
            "folio": folio,
            "estatus_registro": "APROBADO",
            "fecha_alta": "2026-01-15",
            "fecha_registro": "2026-01-15T10:00:00",
            "tutor": None,
            "relacion_parentezco": None,
            "fecha_inicio_membresia": None,
            "fecha_vencimiento_membresia": None,
            "tipos_espina": _resolve_tipos(tipos_ids),
        }
        for k, v in payload.items():
            row[k] = v
        self._by_folio[folio] = row
        return self._response_dict(row)

    def actualizar_beneficiario(
        self, folio: str, data: BeneficiarioCreate, current_user: dict | None = None
    ) -> dict[str, Any]:
        del current_user
        if folio not in self._by_folio:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        payload = data.model_dump()
        tipos_ids = payload.pop("tipos_espina", None)
        row = self._by_folio[folio]
        for k, v in payload.items():
            row[k] = v
        if tipos_ids is not None:
            row["tipos_espina"] = _resolve_tipos(tipos_ids)
        return self._response_dict(row)

    def eliminar_beneficiario(self, folio: str, current_user: dict | None = None) -> dict[str, str]:
        del current_user
        if folio not in self._by_folio:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        self._by_folio[folio]["activo"] = "N"
        return {"detail": "Beneficiario eliminado correctamente"}

    def historial_beneficiario(self, folio: str, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        if folio not in self._by_folio:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        row = self._by_folio[folio]
        nombre_completo = " ".join(
            filter(
                None,
                [
                    (row.get("nombre") or "").strip(),
                    (row.get("apellido_paterno") or "").strip(),
                    (row.get("apellido_materno") or "").strip(),
                ],
            )
        ).strip() or folio
        sample_cita = {
            "id_cita": 1,
            "fecha_hora": "2026-02-01T09:00:00",
            "estatus": "PROGRAMADA",
            "notas": None,
            "fecha_registro": "2026-01-20T08:00:00",
            "servicios": [],
            "doctores": [],
        }
        return {
            "folio": folio,
            "nombre": nombre_completo,
            "citas": [sample_cita],
            "pagos": [],
            "comodatos": [],
        }

    def listar_membresias_proximas_a_vencer(
        self, dias: int = 30, current_user: dict | None = None
    ) -> list[dict[str, Any]]:
        del dias, current_user
        return []

    def renovar_membresia(
        self, folio: str, data: dict, current_user: dict | None = None
    ) -> dict[str, Any]:
        del data, current_user
        if folio not in self._by_folio:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        row = self._by_folio[folio]
        row["membresia_estatus"] = "ACTIVO"
        row["fecha_inicio_membresia"] = "2026-03-01"
        row["fecha_vencimiento_membresia"] = "2027-03-01"
        return {"paciente": self._response_dict(row), "folio_venta": "VEN-TEST-001"}


def default_seed_patients() -> list[dict[str, Any]]:
    """Tres beneficiarios de prueba con distintos filtros."""
    return [
        {
            "id_paciente": 1,
            "folio": "BEN-000001",
            "nombre": "Juan",
            "apellido_paterno": "Pérez",
            "apellido_materno": "García",
            "genero": "Masculino",
            "fecha_nacimiento": "2015-05-10",
            "curp": "PEPJ150510HDFRRN01",
            "nombre_padre_madre": None,
            "direccion": None,
            "colonia": None,
            "ciudad": "Monterrey",
            "estado": "Nuevo León",
            "codigo_postal": None,
            "telefono_casa": None,
            "telefono_celular": None,
            "correo_electronico": None,
            "en_emergencia_avisar_a": None,
            "telefono_emergencia": None,
            "municipio_nacimiento": None,
            "estado_nacimiento": None,
            "hospital_nacimiento": None,
            "tipo_sangre": None,
            "usa_valvula": "N",
            "notas_adicionales": None,
            "membresia_estatus": "ACTIVO",
            "tipo_cuota": "A",
            "activo": "S",
            "estatus_registro": "APROBADO",
            "tipos_espina": [{"id_tipo_espina": 1, "nombre": "Lumbar"}],
            "fecha_alta": "2025-01-01",
            "fecha_registro": "2025-01-01T12:00:00",
            "tutor": None,
            "relacion_parentezco": None,
            "fecha_inicio_membresia": "2025-01-01",
            "fecha_vencimiento_membresia": "2026-01-01",
        },
        {
            "id_paciente": 2,
            "folio": "BEN-000002",
            "nombre": "María",
            "apellido_paterno": "López",
            "apellido_materno": None,
            "genero": "Femenino",
            "fecha_nacimiento": "2018-03-20",
            "curp": "LOPM180320MDFPRR02",
            "nombre_padre_madre": None,
            "direccion": None,
            "colonia": None,
            "ciudad": "Guadalupe",
            "estado": "Nuevo León",
            "codigo_postal": None,
            "telefono_casa": None,
            "telefono_celular": None,
            "correo_electronico": "maria@example.com",
            "en_emergencia_avisar_a": None,
            "telefono_emergencia": None,
            "municipio_nacimiento": None,
            "estado_nacimiento": None,
            "hospital_nacimiento": None,
            "tipo_sangre": None,
            "usa_valvula": "N",
            "notas_adicionales": None,
            "membresia_estatus": "VENCIDO",
            "tipo_cuota": "B",
            "activo": "S",
            "estatus_registro": "APROBADO",
            "tipos_espina": [],
            "fecha_alta": "2025-02-01",
            "fecha_registro": "2025-02-01T12:00:00",
            "tutor": None,
            "relacion_parentezco": None,
            "fecha_inicio_membresia": None,
            "fecha_vencimiento_membresia": None,
        },
        {
            "id_paciente": 3,
            "folio": "BEN-000003",
            "nombre": "Ana",
            "apellido_paterno": "Gómez",
            "apellido_materno": "Ruiz",
            "genero": "Femenino",
            "fecha_nacimiento": "2012-11-11",
            "curp": "GOMA121111MDFNRN03",
            "nombre_padre_madre": None,
            "direccion": "Calle Falsa 123",
            "colonia": "Centro",
            "ciudad": "Monterrey",
            "estado": "Nuevo León",
            "codigo_postal": "64000",
            "telefono_casa": None,
            "telefono_celular": "8110000000",
            "correo_electronico": "ana@example.com",
            "en_emergencia_avisar_a": "Madre",
            "telefono_emergencia": "8110000001",
            "municipio_nacimiento": "Monterrey",
            "estado_nacimiento": "NL",
            "hospital_nacimiento": "Hospital Test",
            "tipo_sangre": "O+",
            "usa_valvula": "S",
            "notas_adicionales": "Nota prueba",
            "membresia_estatus": "ACTIVO",
            "tipo_cuota": "A",
            "activo": "S",
            "estatus_registro": "APROBADO",
            "tipos_espina": [{"id_tipo_espina": 1, "nombre": "Lumbar"}, {"id_tipo_espina": 2, "nombre": "Torácica"}],
            "fecha_alta": "2024-06-01",
            "fecha_registro": "2024-06-01T08:00:00",
            "tutor": None,
            "relacion_parentezco": None,
            "fecha_inicio_membresia": "2024-06-01",
            "fecha_vencimiento_membresia": "2025-06-01",
        },
    ]
