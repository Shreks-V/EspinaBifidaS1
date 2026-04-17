from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException

from app.schemas.schemas import VentaCreate

from Pruebas.support_beneficiarios import default_seed_patients


def _nombre_paciente_display(p: dict[str, Any]) -> str:
    parts = [
        (p.get("nombre") or "").strip(),
        (p.get("apellido_paterno") or "").strip(),
        (p.get("apellido_materno") or "").strip(),
    ]
    return " ".join(x for x in parts if x).strip()


def _build_paciente_map() -> dict[int, dict[str, str]]:
    out: dict[int, dict[str, str]] = {}
    for p in default_seed_patients():
        pid = int(p["id_paciente"])
        out[pid] = {
            "nombre_paciente": _nombre_paciente_display(p),
            "folio_paciente": str(p.get("folio") or ""),
        }
    return out


def default_metodos_pago_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id_metodo_pago": 1,
            "nombre": "EFECTIVO",
            "descripcion": "Efectivo",
            "activo": "S",
        },
        {
            "id_metodo_pago": 2,
            "nombre": "TARJETA",
            "descripcion": "Tarjeta",
            "activo": "S",
        },
        {
            "id_metodo_pago": 3,
            "nombre": "TRANSFERENCIA",
            "descripcion": "Transferencia",
            "activo": "S",
        },
        {
            "id_metodo_pago": 4,
            "nombre": "EXENTO",
            "descripcion": "Exento",
            "activo": "S",
        },
        {
            "id_metodo_pago": 5,
            "nombre": "PENDIENTE",
            "descripcion": "Pendiente",
            "activo": "S",
        },
    ]


def default_seed_ventas() -> list[dict[str, Any]]:
    """Ventas iniciales: folios y fechas distintos para filtros SV-45; una cancelable."""
    pmap = _build_paciente_map()
    p1 = pmap[1]
    p2 = pmap[2]
    p3 = pmap[3]
    return [
        {
            "id_venta": 1001,
            "folio_venta": "VTA-2025-100",
            "id_paciente": 1,
            "id_usuario_registro": 1,
            "fecha_venta": "2025-01-10T11:00:00",
            "monto_total": 500.0,
            "monto_pagado": 500.0,
            "saldo_pendiente": 0.0,
            "exento_pago": "N",
            "cancelada": "N",
            "motivo_cancelacion": None,
            "nombre_paciente": p1["nombre_paciente"],
            "folio_paciente": p1["folio_paciente"],
            "metodos_pago": [
                {"id_metodo_pago": 1, "nombre": "EFECTIVO", "monto": 500.0},
            ],
        },
        {
            "id_venta": 1002,
            "folio_venta": "VTA-2025-200",
            "id_paciente": 2,
            "id_usuario_registro": 2,
            "fecha_venta": "2025-06-15T14:30:00",
            "monto_total": 800.0,
            "monto_pagado": 300.0,
            "saldo_pendiente": 500.0,
            "exento_pago": "N",
            "cancelada": "N",
            "motivo_cancelacion": None,
            "nombre_paciente": p2["nombre_paciente"],
            "folio_paciente": p2["folio_paciente"],
            "metodos_pago": [
                {"id_metodo_pago": 2, "nombre": "TARJETA", "monto": 300.0},
            ],
        },
        {
            "id_venta": 1003,
            "folio_venta": "VTA-2025-300",
            "id_paciente": 3,
            "id_usuario_registro": 1,
            "fecha_venta": "2025-07-01T09:00:00",
            "monto_total": 200.0,
            "monto_pagado": 200.0,
            "saldo_pendiente": 0.0,
            "exento_pago": "N",
            "cancelada": "N",
            "motivo_cancelacion": None,
            "nombre_paciente": p3["nombre_paciente"],
            "folio_paciente": p3["folio_paciente"],
            "metodos_pago": [
                {"id_metodo_pago": 1, "nombre": "EFECTIVO", "monto": 100.0},
                {"id_metodo_pago": 3, "nombre": "TRANSFERENCIA", "monto": 100.0},
            ],
        },
    ]


class InMemoryRecibosRepository:
    """Repositorio en memoria para pruebas de API de recibos (sin Oracle)."""

    def __init__(
        self,
        seed_ventas: list[dict[str, Any]] | None = None,
        catalog: list[dict[str, Any]] | None = None,
    ) -> None:
        self._catalog = {int(m["id_metodo_pago"]): m for m in (catalog or default_metodos_pago_catalog())}
        self._ventas: dict[int, dict[str, Any]] = {}
        self._next_id = 1
        for row in seed_ventas or default_seed_ventas():
            vid = int(row["id_venta"])
            self._ventas[vid] = deepcopy(row)
            self._next_id = max(self._next_id, vid + 1)

    def _nombre_metodo(self, id_metodo_pago: int) -> str:
        m = self._catalog.get(id_metodo_pago)
        return str(m["nombre"]) if m else "DESCONOCIDO"

    def _public_row(self, row: dict[str, Any]) -> dict[str, Any]:
        out = deepcopy(row)
        out["metodos_pago"] = deepcopy(row.get("metodos_pago") or [])
        return out

    def listar_metodos_pago(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return [deepcopy(m) for m in self._catalog.values()]

    def _fecha_venta_date(self, fecha_venta: str | None) -> str | None:
        if not fecha_venta:
            return None
        return fecha_venta[:10]

    def listar_ventas(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_paciente: Optional[int] = None,
        search: Optional[str] = None,
        current_user: dict | None = None,
    ) -> list[dict[str, Any]]:
        rows = list(self._ventas.values())
        filtered: list[dict[str, Any]] = []
        for v in rows:
            fv = self._fecha_venta_date(v.get("fecha_venta"))
            if fecha_inicio and fv and fv < fecha_inicio:
                continue
            if fecha_fin and fv and fv > fecha_fin:
                continue
            if id_paciente is not None and int(v["id_paciente"]) != int(id_paciente):
                continue
            if search:
                q = search.strip().upper()
                folio = str(v.get("folio_venta") or "").upper()
                nombre = str(v.get("nombre_paciente") or "").upper()
                if q not in folio and q not in nombre:
                    continue
            filtered.append(v)
        filtered.sort(key=lambda x: str(x.get("fecha_venta") or ""), reverse=True)
        return [self._public_row(v) for v in filtered]

    def obtener_venta(self, id_venta: int, current_user: dict | None = None) -> dict[str, Any]:
        row = self._ventas.get(int(id_venta))
        if row is None:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return self._public_row(row)

    def crear_venta(self, data: VentaCreate, current_user: dict | None = None) -> dict[str, Any]:
        if data.id_paciente <= 0:
            raise HTTPException(status_code=400, detail="Debe seleccionar un beneficiario valido")
        if data.monto_total <= 0:
            raise HTTPException(status_code=400, detail="El monto total debe ser mayor a 0")

        raw_methods = data.metodos_pago or []
        metodos_validos = [
            {"id_metodo_pago": int(mp["id_metodo_pago"]), "monto": float(mp["monto"])}
            for mp in raw_methods
            if int(mp.get("id_metodo_pago", 0)) > 0 and float(mp.get("monto", 0) or 0) > 0
        ]

        exento = (data.exento_pago or "N").upper() == "S"
        if not exento and not metodos_validos:
            raise HTTPException(
                status_code=400,
                detail="Agrega al menos un metodo de pago con monto",
            )

        suma = sum(m["monto"] for m in metodos_validos)
        if suma > float(data.monto_total) + 1e-6:
            raise HTTPException(
                status_code=400,
                detail="La suma de metodos de pago no puede exceder el monto total",
            )

        pmap = _build_paciente_map()
        if data.id_paciente not in pmap:
            raise HTTPException(status_code=400, detail="Paciente no encontrado")

        id_usuario = int((current_user or {}).get("id_usuario") or 1)
        new_id = self._next_id
        self._next_id += 1
        folio = f"VTA-TEST-{new_id:03d}"
        now = datetime.now().replace(microsecond=0).isoformat()

        if exento:
            monto_pagado = float(data.monto_total)
            saldo_pendiente = 0.0
        else:
            monto_pagado = suma
            saldo_pendiente = max(0.0, float(data.monto_total) - monto_pagado)

        metodos_enriquecidos = [
            {
                "id_metodo_pago": m["id_metodo_pago"],
                "nombre": self._nombre_metodo(m["id_metodo_pago"]),
                "monto": m["monto"],
            }
            for m in metodos_validos
        ]

        pac = pmap[data.id_paciente]
        row = {
            "id_venta": new_id,
            "folio_venta": folio,
            "id_paciente": data.id_paciente,
            "id_usuario_registro": id_usuario,
            "fecha_venta": now,
            "monto_total": float(data.monto_total),
            "monto_pagado": monto_pagado,
            "saldo_pendiente": saldo_pendiente,
            "exento_pago": "S" if exento else "N",
            "cancelada": "N",
            "motivo_cancelacion": None,
            "nombre_paciente": pac["nombre_paciente"],
            "folio_paciente": pac["folio_paciente"],
            "metodos_pago": metodos_enriquecidos,
        }
        self._ventas[new_id] = row
        return self._public_row(row)

    def cancelar_venta(
        self,
        id_venta: int,
        motivo: Optional[str] = None,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        row = self._ventas.get(int(id_venta))
        if row is None:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        if row.get("cancelada") == "S":
            raise HTTPException(status_code=400, detail="La venta ya esta cancelada")
        motivo_final = (motivo or "").strip() or "Sin motivo especificado"
        row["cancelada"] = "S"
        row["motivo_cancelacion"] = motivo_final
        return self._public_row(row)

    def registrar_pago(
        self,
        id_venta: int,
        id_metodo_pago: int,
        monto: float,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        raise HTTPException(status_code=501, detail="No implementado en memoria para pruebas")

    def stats_ventas(self, current_user: dict | None = None) -> dict[str, Any]:
        activas = [v for v in self._ventas.values() if v.get("cancelada") != "S"]
        hoy = date.today().isoformat()
        ayer = (date.today() - timedelta(days=1)).isoformat()
        monto_total_sum = sum(float(v["monto_total"]) for v in activas)
        count = len(activas)
        pendientes = sum(1 for v in activas if float(v.get("saldo_pendiente") or 0) > 0)

        def monto_por_nombre(nombre_upper: str) -> float:
            s = 0.0
            for v in activas:
                for mp in v.get("metodos_pago") or []:
                    if str(mp.get("nombre") or "").upper() == nombre_upper:
                        s += float(mp.get("monto") or 0)
            return s

        total_hoy = sum(
            1
            for v in activas
            if self._fecha_venta_date(v.get("fecha_venta")) == hoy
        )
        total_ayer = sum(
            1
            for v in activas
            if self._fecha_venta_date(v.get("fecha_venta")) == ayer
        )

        return {
            "monto_total_sum": float(monto_total_sum),
            "monto_efectivo": monto_por_nombre("EFECTIVO"),
            "monto_tarjeta": monto_por_nombre("TARJETA"),
            "monto_transferencia": monto_por_nombre("TRANSFERENCIA"),
            "count": int(count),
            "total_hoy": int(total_hoy),
            "total_ayer": int(total_ayer),
            "pendientes": int(pendientes),
        }
