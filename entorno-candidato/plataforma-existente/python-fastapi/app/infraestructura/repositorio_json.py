import json
from functools import lru_cache
from pathlib import Path

from app.dominio.modelos import Abogado, Registro

_ARCHIVO = Path(__file__).resolve().parents[2] / "seed.json"


@lru_cache(maxsize=1)
def _semilla() -> dict:
    return json.loads(_ARCHIVO.read_text(encoding="utf-8"))


class JsonRepositorioCostos:
    """Adaptador de persistencia: implementa RepositorioCostos sobre seed.json."""

    def periodo(self) -> str:
        return _semilla()["periodo"]

    def abogados(self) -> list[Abogado]:
        return [Abogado(a["id"], a["nombre"], a["nivel"], a["socio"]) for a in _semilla()["abogados"]]

    def abogado(self, abogado_id: str) -> Abogado | None:
        return next((a for a in self.abogados() if a.id == abogado_id), None)

    def costo_de(self, abogado_id: str) -> float:
        return next(c["costo_total"] for c in _semilla()["costos"] if c["abogado_id"] == abogado_id)

    def registros_de(self, abogado_id: str) -> list[Registro]:
        return [
            Registro(r["id"], r["abogado_id"], r["periodo"], r["minutos"], r["facturable"],
                     r["cliente"], r["asunto"], r["detalle"])
            for r in _semilla()["registros"] if r["abogado_id"] == abogado_id
        ]
