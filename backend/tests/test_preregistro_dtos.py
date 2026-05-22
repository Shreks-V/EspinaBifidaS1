import pytest
from pydantic import ValidationError

from app.application.preregistro.dtos import AprobarPreRegistroData, PreRegistroCreate


VALID_CURP = "AABA010101HNLBCD09"


def test_preregistro_tipo_cuota_accepts_short_aliases():
    preregistro = PreRegistroCreate(
        nombre="Ada",
        apellido_paterno="Lovelace",
        curp=VALID_CURP,
        tipos_espina=[1],
        tipo_cuota="A",
    )
    aprobacion = AprobarPreRegistroData(tipo_cuota="B")

    assert preregistro.tipo_cuota == "CUOTA A"
    assert aprobacion.tipo_cuota == "CUOTA B"


def test_preregistro_tipo_cuota_rejects_invalid_values():
    with pytest.raises(ValidationError):
        PreRegistroCreate(
            nombre="Ada",
            apellido_paterno="Lovelace",
            curp=VALID_CURP,
            tipos_espina=[1],
            tipo_cuota="CUOTA C",
        )
