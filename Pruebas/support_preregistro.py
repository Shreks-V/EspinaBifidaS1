from __future__ import annotations

import os
import tempfile
import uuid
from copy import deepcopy
from typing import Any

from fastapi import HTTPException, UploadFile

from app.schemas.schemas import PreRegistroCreate


def _serialize(row: dict[str, Any]) -> dict[str, Any]:
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}


class InMemoryPreregistroRepository:
    """Repositorio en memoria para pruebas de pre-registro (sin Oracle)."""

    def __init__(self, seed: list[dict[str, Any]] | None = None) -> None:
        self._by_id: dict[int, dict[str, Any]] = {}
        self._docs: dict[tuple[int, int], dict[str, Any]] = {}
        self._next_id = 1
        self._next_doc_id = 1
        self._upload_dir = tempfile.mkdtemp(prefix="ebif_prereg_test_")
        for row in seed or []:
            pid = int(row["id_paciente"])
            self._by_id[pid] = deepcopy(row)
            self._next_id = max(self._next_id, pid + 1)

    def _row_from_create(self, data: PreRegistroCreate, id_paciente: int, folio: str) -> dict[str, Any]:
        d = data.model_dump()
        d["id_paciente"] = id_paciente
        d["folio"] = folio
        d["estatus_registro"] = "PENDIENTE"
        d["paso_actual"] = d.get("paso_actual") or 1
        d["fecha_registro"] = "2026-01-15T10:00:00"
        return d

    def listar_preregistros(
        self, estatus: str | None = None, current_user: dict | None = None
    ) -> list[dict[str, Any]]:
        del current_user
        rows = []
        for r in self._by_id.values():
            er = r.get("estatus_registro")
            if estatus:
                if er == estatus:
                    rows.append(r)
            elif er in ("PENDIENTE", "RECHAZADO"):
                rows.append(r)
        rows.sort(key=lambda x: x.get("fecha_registro") or "", reverse=True)
        return [_serialize(r) for r in rows]

    def crear_preregistro(self, data: PreRegistroCreate) -> dict[str, Any]:
        if not data.tipos_espina:
            raise HTTPException(
                status_code=400,
                detail="Debe especificar al menos un tipo de espina bífida",
            )
        pid = self._next_id
        folio = f"PRE-{pid:06d}"
        self._next_id += 1
        row = self._row_from_create(data, pid, folio)
        self._by_id[pid] = row
        return _serialize(dict(row))

    def listar_tipos_espina_publico(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return [
            {"id_tipo_espina": 1, "nombre": "Lumbar", "descripcion": "Prueba"},
            {"id_tipo_espina": 2, "nombre": "Torácica", "descripcion": "Prueba"},
        ]

    def listar_tipos_documento_publico(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return [
            {"id_tipo_documento": 1, "nombre": "INE", "descripcion": "Identificación"},
        ]

    def obtener_preregistro(self, id_paciente: int) -> dict[str, Any]:
        row = self._by_id.get(id_paciente)
        if not row:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")
        return _serialize(dict(row))

    def actualizar_preregistro(self, id_paciente: int, data: PreRegistroCreate) -> dict[str, Any]:
        row = self._by_id.get(id_paciente)
        if not row or row.get("estatus_registro") != "PENDIENTE":
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")

        paso = data.paso_actual or 1
        if paso >= 3:
            if not (data.correo_electronico or "").strip() or not (data.ciudad or "").strip():
                raise HTTPException(
                    status_code=400,
                    detail="Debe completar correo electrónico y ciudad antes de avanzar de paso",
                )
        if paso >= 2 and not (data.fecha_nacimiento or "").strip():
            raise HTTPException(
                status_code=400,
                detail="La fecha de nacimiento es obligatoria para continuar",
            )

        new_data = data.model_dump()
        new_data["id_paciente"] = id_paciente
        new_data["folio"] = row["folio"]
        new_data["estatus_registro"] = row["estatus_registro"]
        new_data["fecha_registro"] = row.get("fecha_registro", "2026-01-15T10:00:00")
        self._by_id[id_paciente] = new_data
        return _serialize(dict(new_data))

    def aprobar_preregistro(
        self,
        id_paciente: int,
        tipo_cuota: str | None = None,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        del current_user
        row = self._by_id.get(id_paciente)
        if not row:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")
        est = (row.get("estatus_registro") or "").strip()
        if est == "APROBADO":
            raise HTTPException(status_code=400, detail="Este pre-registro ya fue aprobado")
        if est != "PENDIENTE":
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar pre-registros pendientes")
        row["estatus_registro"] = "APROBADO"
        row["folio"] = f"BEN-{id_paciente:06d}"
        if tipo_cuota:
            row["tipo_cuota"] = tipo_cuota
        return {
            "message": "Pre-registro aprobado exitosamente",
            "preregistro": _serialize(dict(row)),
        }

    def rechazar_preregistro(
        self, id_paciente: int, current_user: dict | None = None
    ) -> dict[str, Any]:
        del current_user
        row = self._by_id.get(id_paciente)
        if not row:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")
        row["estatus_registro"] = "RECHAZADO"
        return {
            "message": "Pre-registro rechazado",
            "preregistro": _serialize(dict(row)),
        }

    async def subir_documento(
        self,
        id_paciente: int,
        id_tipo_documento: int,
        archivo: UploadFile,
        current_user: dict | None = None,
    ) -> dict[str, Any]:
        del current_user
        if id_paciente not in self._by_id:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")
        ext = os.path.splitext(archivo.filename or "")[1].lower() or ".pdf"
        name = f"{id_paciente}_{uuid.uuid4().hex}{ext}"
        path = os.path.join(self._upload_dir, name)
        content = await archivo.read()
        with open(path, "wb") as f:
            f.write(content)
        doc_id = self._next_doc_id
        self._next_doc_id += 1
        self._docs[(id_paciente, doc_id)] = {
            "id_documento": doc_id,
            "id_paciente": id_paciente,
            "path": path,
            "nombre_archivo": archivo.filename or name,
            "formato": ext.lstrip(".").upper() or "PDF",
        }
        return {
            "id_documento": doc_id,
            "nombre_archivo": archivo.filename or name,
            "formato": ext.lstrip(".").upper() or "PDF",
        }

    def listar_documentos(self, id_paciente: int) -> list[dict[str, Any]]:
        out = []
        for (pid, did), meta in self._docs.items():
            if pid != id_paciente:
                continue
            out.append(
                {
                    "id_documento": did,
                    "id_tipo_documento": 1,
                    "tipo_nombre": "INE",
                    "nombre_archivo": meta["nombre_archivo"],
                    "formato_archivo": meta["formato"],
                    "fecha_carga": "2026-01-16T12:00:00",
                }
            )
        return out

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int) -> dict[str, Any]:
        meta = self._docs.get((id_paciente, id_documento))
        if not meta or not os.path.isfile(meta["path"]):
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        return {
            "file_path": meta["path"],
            "content_type": "application/pdf",
            "filename": meta["nombre_archivo"],
        }

    def eliminar_documento(self, id_paciente: int, id_documento: int) -> dict[str, str]:
        key = (id_paciente, id_documento)
        if key not in self._docs:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        del self._docs[key]
        return {"message": "Documento eliminado correctamente"}
