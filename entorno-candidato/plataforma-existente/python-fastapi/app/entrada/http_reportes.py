from fastapi import APIRouter

from app.aplicacion.reporte_costos import GenerarReporteCostos

router = APIRouter(tags=["reportes"])


@router.get("/reportes/costos")
def reporte_costos(incluirSocios: bool = False):
    return GenerarReporteCostos().ejecutar(incluir_socios=incluirSocios)
