from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException

from app.schemas.schemas import CitaCreate


def _fecha_iso_dia(fecha_hora: str) -> str:
    return (fecha_hora or "")[:10]


def _es_hoy(fecha_hora: str) -> bool:
    return _fecha_iso_dia(fecha_hora) == date.today().isoformat()


def _nombre_completo_paciente(p: dict[str, Any]) -> str:
    parts = [
        (p.get("nombre") or "").strip(),
        (p.get("apellido_paterno") or "").strip(),
        (p.get("apellido_materno") or "").strip(),
    ]
    return " ".join(x for x in parts if x).strip() or "Paciente"


class InMemoryCitasRepository:
    """Repositorio en memoria para pruebas de citas (sin Oracle)."""

    def __init__(
        self,
        seed_citas: list[dict[str, Any]] | None = None,
        pacientes: dict[int, dict[str, Any]] | None = None,
    ) -> None:
        self._citas: dict[int, dict[str, Any]] = {}
        self._next_id = 1
        self._pacientes = pacientes or {
            1: {
                "activo": "S",
                "membresia_estatus": "ACTIVO",
                "nombre": "Ana",
                "apellido_paterno": "Prueba",
                "apellido_materno": "",
                "folio": "BEN-000001",
            },
            2: {
                "activo": "S",
                "membresia_estatus": "ACTIVO",
                "nombre": "Luis",
                "apellido_paterno": "Otro",
                "apellido_materno": "Pérez",
                "folio": "BEN-000002",
            },
        }
        for row in seed_citas or []:
            cid = int(row["id_cita"])
            self._citas[cid] = deepcopy(row)
            self._next_id = max(self._next_id, cid + 1)

    def _enriquecer(self, c: dict[str, Any]) -> dict[str, Any]:
        out = dict(c)
        if "servicios" not in out:
            out["servicios"] = []
        return out

    def citas_stats(self, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        from collections import Counter

        est = Counter((c.get("estatus") or "").strip() for c in self._citas.values())
        stats: dict[str, Any] = {k: v for k, v in est.items() if k}
        stats["total"] = sum(est.values())
        stats["total_hoy"] = sum(
            1
            for c in self._citas.values()
            if _es_hoy(str(c.get("fecha_hora") or ""))
            and (c.get("estatus") or "").strip() == "PROGRAMADA"
        )
        stats["total_ayer"] = 0
        return stats

    def citas_hoy(self, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        hoy = date.today().isoformat()
        citas = [
            self._enriquecer(dict(c))
            for c in self._citas.values()
            if _es_hoy(str(c.get("fecha_hora") or ""))
        ]
        citas.sort(key=lambda x: str(x.get("fecha_hora") or ""))
        programadas = sum(1 for c in citas if c.get("estatus") == "PROGRAMADA")
        completadas = sum(1 for c in citas if c.get("estatus") == "COMPLETADA")
        canceladas = sum(1 for c in citas if c.get("estatus") == "CANCELADA")
        return {
            "fecha": hoy,
            "total": len(citas),
            "programadas": programadas,
            "completadas": completadas,
            "canceladas": canceladas,
            "citas": citas,
        }

    def citas_proximas(self, dias: int = 7, current_user: dict | None = None) -> dict[str, Any]:
        del dias, current_user
        return {"count": 0, "desde": "", "hasta": ""}

    def listar_citas(
        self,
        fecha: str | None = None,
        estatus: str | None = None,
        id_paciente: int | None = None,
        busqueda: str | None = None,
        current_user: dict | None = None,
    ) -> list[dict[str, Any]]:
        del current_user
        rows = [self._enriquecer(dict(c)) for c in self._citas.values()]
        if fecha:
            rows = [r for r in rows if _fecha_iso_dia(str(r.get("fecha_hora") or "")) == fecha]
        if estatus:
            rows = [r for r in rows if (r.get("estatus") or "").strip() == estatus]
        if id_paciente is not None:
            rows = [r for r in rows if r.get("id_paciente") == id_paciente]
        if busqueda:
            b = busqueda.upper()
            filt = []
            for r in rows:
                blob = " ".join(
                    [
                        str(r.get("nombre_paciente") or ""),
                        str(r.get("folio_paciente") or ""),
                        str(r.get("notas") or ""),
                    ]
                ).upper()
                if b in blob:
                    filt.append(r)
            rows = filt
        rows.sort(key=lambda x: str(x.get("fecha_hora") or ""), reverse=True)
        return rows

    def obtener_cita(self, id_cita: int, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        c = self._citas.get(id_cita)
        if not c:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        return self._enriquecer(dict(c))

    def crear_cita(self, data: CitaCreate, current_user: dict | None = None) -> dict[str, Any]:
        pac = self._pacientes.get(data.id_paciente)
        if not pac:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        if (pac.get("activo") or "").strip() != "S":
            raise HTTPException(
                status_code=400,
                detail="El paciente no se encuentra activo en el sistema",
            )
        if (pac.get("membresia_estatus") or "").strip() != "ACTIVO":
            raise HTTPException(
                status_code=400,
                detail="El paciente no tiene membresía activa. Actualice su estatus antes de agendar una cita",
            )
        servicios = list(data.servicios or [])
        if not servicios:
            raise HTTPException(
                status_code=400,
                detail="La cita requiere al menos un servicio",
            )

        cid = self._next_id
        self._next_id += 1
        id_usr = data.id_usuario_registro or (current_user or {}).get("id_usuario", 1)
        svc_out = []
        for s in servicios:
            sid = int(s["id_servicio"])
            svc_out.append(
                {
                    "id_servicio": sid,
                    "nombre": {1: "Consulta", 2: "Terapia"}.get(sid, "Servicio"),
                    "cantidad": int(s.get("cantidad", 1)),
                    "monto_pagado": float(s.get("monto_pagado", 0.0)),
                }
            )
        row = {
            "id_cita": cid,
            "id_paciente": data.id_paciente,
            "id_usuario_registro": id_usr,
            "fecha_hora": data.fecha_hora,
            "estatus": (data.estatus or "PROGRAMADA").strip(),
            "notas": data.notas,
            "fecha_registro": datetime.now().replace(microsecond=0).isoformat(),
            "nombre_paciente": _nombre_completo_paciente(pac),
            "folio_paciente": (pac.get("folio") or "").strip(),
            "servicios": svc_out,
        }
        self._citas[cid] = row
        return self._enriquecer(dict(row))

    def actualizar_cita(
        self, id_cita: int, data: CitaCreate, current_user: dict | None = None
    ) -> dict[str, Any]:
        del current_user
        if id_cita not in self._citas:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        c = self._citas[id_cita]
        c["id_paciente"] = data.id_paciente
        c["fecha_hora"] = data.fecha_hora
        c["estatus"] = data.estatus
        c["notas"] = data.notas
        if data.servicios is not None:
            c["servicios"] = [
                {
                    "id_servicio": int(s["id_servicio"]),
                    "nombre": {1: "Consulta", 2: "Terapia"}.get(int(s["id_servicio"]), "Servicio"),
                    "cantidad": int(s.get("cantidad", 1)),
                    "monto_pagado": float(s.get("monto_pagado", 0.0)),
                }
                for s in data.servicios
            ]
        pac = self._pacientes.get(c["id_paciente"], {})
        c["nombre_paciente"] = _nombre_completo_paciente(pac)
        c["folio_paciente"] = (pac.get("folio") or "").strip()
        return self._enriquecer(dict(c))

    def completar_cita(self, id_cita: int, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        if id_cita not in self._citas:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        self._citas[id_cita]["estatus"] = "COMPLETADA"
        return self._enriquecer(dict(self._citas[id_cita]))

    def cancelar_cita(self, id_cita: int, current_user: dict | None = None) -> dict[str, Any]:
        del current_user
        if id_cita not in self._citas:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        self._citas[id_cita]["estatus"] = "CANCELADA"
        self._citas[id_cita]["notas"] = "Cita cancelada"
        return self._enriquecer(dict(self._citas[id_cita]))

    def eliminar_cita(self, id_cita: int, current_user: dict | None = None) -> dict[str, str]:
        del current_user
        if id_cita not in self._citas:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        del self._citas[id_cita]
        return {"detail": "Cita eliminada"}


def seed_cita_hoy(
    *,
    id_cita: int = 1,
    id_paciente: int = 1,
    hora: str = "10:00:00",
    estatus: str = "PROGRAMADA",
    notas: str | None = None,
) -> dict[str, Any]:
    """Una cita el día actual (fecha del servidor de prueba)."""
    d = date.today().isoformat()
    pacientes_seed = {
        1: {
            "activo": "S",
            "membresia_estatus": "ACTIVO",
            "nombre": "Ana",
            "apellido_paterno": "Prueba",
            "apellido_materno": "",
            "folio": "BEN-000001",
        },
        2: {
            "activo": "S",
            "membresia_estatus": "ACTIVO",
            "nombre": "Luis",
            "apellido_paterno": "Otro",
            "apellido_materno": "Pérez",
            "folio": "BEN-000002",
        },
    }
    p = pacientes_seed[id_paciente]
    return {
        "id_cita": id_cita,
        "id_paciente": id_paciente,
        "id_usuario_registro": 2,
        "fecha_hora": f"{d}T{hora}",
        "estatus": estatus,
        "notas": notas,
        "fecha_registro": f"{d}T08:00:00",
        "nombre_paciente": _nombre_completo_paciente(p),
        "folio_paciente": p["folio"],
        "servicios": [
            {"id_servicio": 1, "nombre": "Consulta", "cantidad": 1, "monto_pagado": 0.0}
        ],
    }
