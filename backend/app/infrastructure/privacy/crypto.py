import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings


def _get_key() -> bytes:
    key_b64 = settings.DATA_ENCRYPTION_KEY
    if not key_b64:
        raise RuntimeError(
            "DATA_ENCRYPTION_KEY no configurada. "
            "Genera una con: python -c \"from cryptography.hazmat.primitives.ciphers.aead import AESGCM; "
            "import base64; print(base64.b64encode(AESGCM.generate_key(bit_length=256)).decode())\""
        )
    return base64.b64decode(key_b64)


def encrypt(plaintext: str | None) -> str | None:
    if not plaintext:
        return plaintext
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return ciphertext
    try:
        key = _get_key()
        data = base64.b64decode(ciphertext)
        nonce = data[:12]
        ct = data[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        return ciphertext


def encrypt_bytes(plaintext: bytes) -> bytes:
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    return nonce + aesgcm.encrypt(nonce, plaintext, None)


def decrypt_bytes(data: bytes) -> bytes:
    key = _get_key()
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(data[:12], data[12:], None)


PACIENTE_ENCRYPTED_FIELDS = {
    "curp",
    "telefono_casa",
    "telefono_celular",
    "correo_electronico",
    "direccion",
    "en_emergencia_avisar_a",
    "telefono_emergencia",
    "nombre_padre_madre",
    "tipo_sangre",
    "notas_adicionales",
    "hospital_nacimiento",
}

DOCTOR_ENCRYPTED_FIELDS = {
    "telefono",
    "correo",
}

USUARIO_ENCRYPTED_FIELDS = set()


def encrypt_row(row: dict, sensitive_fields: set[str]) -> dict:
    result = dict(row)
    for field in sensitive_fields:
        if field in result and result[field] is not None:
            result[field] = encrypt(str(result[field]))
    return result


def decrypt_row(row: dict | None, sensitive_fields: set[str]) -> dict | None:
    if row is None:
        return None
    result = dict(row)
    for field in sensitive_fields:
        if field in result and result[field] is not None:
            result[field] = decrypt(str(result[field]))
    return result


def decrypt_rows(rows: list[dict], sensitive_fields: set[str]) -> list[dict]:
    return [decrypt_row(r, sensitive_fields) for r in rows]
