from app.application.almacen import use_cases as almacen_use_cases
from app.application.beneficiarios import use_cases as beneficiarios_use_cases
from app.application.citas import use_cases as citas_use_cases
from app.application.doctores import use_cases as doctores_use_cases
from app.application.exportaciones import use_cases as exportaciones_use_cases
from app.application.preregistro import use_cases as preregistro_use_cases
from app.application.recibos import use_cases as recibos_use_cases
from app.application.reportes import use_cases as reportes_use_cases
from app.infrastructure.almacen.repository import OracleAlmacenRepository
from app.infrastructure.beneficiarios.repository import OracleBeneficiariosRepository
from app.infrastructure.citas.repository import OracleCitasRepository
from app.infrastructure.doctores.repository import OracleDoctoresRepository
from app.infrastructure.exportaciones.repository import OracleExportacionesRepository
from app.infrastructure.preregistro.repository import OraclePreregistroRepository
from app.infrastructure.recibos.repository import OracleRecibosRepository
from app.infrastructure.reportes.repository import OracleReportesRepository


def wire_application() -> None:
    almacen_use_cases.configure_repository(OracleAlmacenRepository())
    beneficiarios_use_cases.configure_repository(OracleBeneficiariosRepository())
    citas_use_cases.configure_repository(OracleCitasRepository())
    doctores_use_cases.configure_repository(OracleDoctoresRepository())
    exportaciones_use_cases.configure_repository(OracleExportacionesRepository())
    preregistro_use_cases.configure_repository(OraclePreregistroRepository())
    recibos_use_cases.configure_repository(OracleRecibosRepository())
    reportes_use_cases.configure_repository(OracleReportesRepository())
