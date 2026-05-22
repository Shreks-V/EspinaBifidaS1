from app.application.almacen.use_cases import AlmacenService, configure_service as configure_almacen
from app.application.beneficiarios.use_cases import BeneficiariosService, configure_service as configure_beneficiarios
from app.application.citas.use_cases import CitasService, configure_service as configure_citas
from app.application.doctores.use_cases import DoctoresService, configure_service as configure_doctores
from app.application.exportaciones.use_cases import ExportacionesService, configure_service as configure_exportaciones
from app.application.preregistro.use_cases import PreregistroService, configure_service as configure_preregistro
from app.application.recibos.use_cases import RecibosService, configure_service as configure_recibos
from app.application.reportes.use_cases import ReportesService, configure_service as configure_reportes
from app.infrastructure.almacen.repository import OracleAlmacenRepository
from app.infrastructure.beneficiarios.repository import OracleBeneficiariosRepository
from app.infrastructure.citas.repository import OracleCitasRepository
from app.infrastructure.doctores.repository import OracleDoctoresRepository
from app.infrastructure.exportaciones.repository import OracleExportacionesRepository
from app.infrastructure.preregistro.repository import OraclePreregistroRepository
from app.infrastructure.recibos.repository import OracleRecibosRepository
from app.infrastructure.reportes.repository import OracleReportesRepository


def wire_application() -> None:
    configure_almacen(AlmacenService(OracleAlmacenRepository()))
    configure_beneficiarios(BeneficiariosService(OracleBeneficiariosRepository()))
    configure_citas(CitasService(OracleCitasRepository()))
    configure_doctores(DoctoresService(OracleDoctoresRepository()))
    configure_exportaciones(ExportacionesService(OracleExportacionesRepository()))
    configure_preregistro(PreregistroService(OraclePreregistroRepository()))
    configure_recibos(RecibosService(OracleRecibosRepository()))
    configure_reportes(ReportesService(OracleReportesRepository()))
