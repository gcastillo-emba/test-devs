from dataclasses import dataclass


@dataclass(frozen=True)
class Registro:
    id: str
    abogado_id: str
    periodo: str
    minutos: int
    facturable: bool
    cliente: str
    asunto: str
    detalle: str


@dataclass(frozen=True)
class Abogado:
    id: str
    nombre: str
    nivel: str
    socio: bool

    @property
    def registros(self) -> list[Registro]:
        from app.infraestructura.repositorio_json import JsonRepositorioCostos

        return JsonRepositorioCostos().registros_de(self.id)
