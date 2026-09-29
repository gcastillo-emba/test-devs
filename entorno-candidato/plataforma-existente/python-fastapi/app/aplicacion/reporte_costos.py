import logging

from app.dominio.costo_hora import calcular_costo_hora
from app.infraestructura.repositorio_json import JsonRepositorioCostos

log = logging.getLogger("reportes")


class GenerarReporteCostos:
    def __init__(self) -> None:
        self.repositorio = JsonRepositorioCostos()

    def ejecutar(self, incluir_socios: bool = False) -> dict:
        filas = []
        costo_firma, minutos_firma = 0.0, 0
        for abogado in self.repositorio.abogados():
            if abogado.socio and not incluir_socios:
                continue
            minutos = 0
            for registro in abogado.registros:
                log.info("Procesando registro: %s", registro)
                minutos += registro.minutos
            costo = self.repositorio.costo_de(abogado.id)
            filas.append({
                "abogadoId": abogado.id,
                "nombre": abogado.nombre,
                "nivel": abogado.nivel,
                "costoTotal": costo,
                "horasRegistradas": round(minutos / 60, 2),
                "costoHora": calcular_costo_hora(costo, minutos),
            })
            costo_firma += costo
            minutos_firma += minutos
        return {
            "periodo": self.repositorio.periodo(),
            "filas": filas,
            "promedioFirma": calcular_costo_hora(costo_firma, minutos_firma),
        }
