ROLE_ALIASES: dict[str, str] = {
    "ADMIN": "ADMINISTRADOR",
    "ADMINISTRADOR": "ADMINISTRADOR",
    "OPERATIVO": "RECEPCIONISTA",
    "RECEPCIONISTA": "RECEPCIONISTA",
    "ALMACEN": "ENCARGADO_ALMACEN",
    "ENCARGADO_ALMACEN": "ENCARGADO_ALMACEN",
    "DOCTOR": "DOCTOR",
}


def normalize_role(role: str | None) -> str:
    raw = (role or "").strip().upper()
    return ROLE_ALIASES.get(raw, raw)
