from fastapi import APIRouter, HTTPException

from app.dominio.costo_hora import calcular_costo_hora
from app.infraestructura.repositorio_json import JsonRepositorioCostos

router = APIRouter(tags=["abogados"])
repositorio = JsonRepositorioCostos()


@router.get("/abogados")
def listar_abogados():
    return [{"id": a.id, "nombre": a.nombre, "nivel": a.nivel} for a in repositorio.abogados()]


@router.get("/abogados/{abogado_id}/costo-hora")
def costo_hora(abogado_id: str):
    abogado = repositorio.abogado(abogado_id)
    if abogado is None:
        raise HTTPException(status_code=404, detail="Abogado no encontrado")
    minutos = sum(r.minutos for r in repositorio.registros_de(abogado_id))
    return {
        "abogadoId": abogado.id,
        "nombre": abogado.nombre,
        "periodo": repositorio.periodo(),
        "costoHora": calcular_costo_hora(repositorio.costo_de(abogado_id), minutos),
    }
