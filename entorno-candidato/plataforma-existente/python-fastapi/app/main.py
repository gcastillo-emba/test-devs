import logging

from fastapi import FastAPI

from app.entrada import http_abogados, http_reportes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="Costos — Estudio Salinas Crespo")
app.include_router(http_reportes.router)
app.include_router(http_abogados.router)


@app.get("/salud")
def salud():
    return {"estado": "ok"}
