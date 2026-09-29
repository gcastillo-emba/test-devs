from fastapi import APIRouter, HTTPException

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
    minutos = sum(r.minutos for r in repositorio.registros_de(abogado_id) if r.facturable)
    horas = minutos / 60
    return {
        "abogadoId": abogado.id,
        "nombre": abogado.nombre,
        "periodo": repositorio.periodo(),
        "costoHora": round(repositorio.costo_de(abogado_id) / horas, 2),
    }
