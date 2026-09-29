"""
Sistema de registro de horas — Estudio Salinas Crespo.

Este servicio simula un sistema externo. No forma parte de lo que el candidato construye:
se consume solo por HTTP, como se consumiría el sistema real.
"""
import gzip
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

DATOS = Path(__file__).parent / "data" / "registros.json.gz"
with gzip.open(DATOS, "rt", encoding="utf-8") as fh:
    REGISTROS = sorted(json.load(fh), key=lambda r: r["id"])

app = FastAPI(title="Registro de horas", version="2.3.1")


@app.get("/salud")
def salud():
    return {"estado": "ok", "registros": len(REGISTROS)}


@app.get("/registros")
def registros(pagina: int = Query(1, ge=1), tamano: int = Query(100, ge=1, le=500)):
    total = len(REGISTROS)
    inicio = (pagina - 1) * tamano
    if inicio >= total and total:
        raise HTTPException(status_code=404, detail="Página fuera de rango")
    fin = inicio + tamano
    siguiente = f"/registros?pagina={pagina + 1}&tamano={tamano}" if fin < total else None
    return {"datos": REGISTROS[inicio:fin], "pagina": pagina, "tamano": tamano,
            "total": total, "siguiente": siguiente}
