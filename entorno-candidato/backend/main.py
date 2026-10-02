import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .domain import build_snapshot, query, read_csv
from .sources import download

snapshot = None
refreshing = False
last_error = None
ROOT = Path(__file__).resolve().parent.parent


def load():
    return build_snapshot(read_csv(ROOT / 'datos' / 'contabilidad.csv'), download(os.getenv('HOURS_API_URL', 'http://localhost:8000')))


async def refresh():
    global snapshot, refreshing, last_error
    if refreshing:
        raise HTTPException(409, 'Ya hay una actualización en curso')
    refreshing = True
    try:
        candidate = await asyncio.to_thread(load)
        snapshot = candidate
        last_error = None
    except Exception as exc:
        logging.exception('Actualización fallida')
        last_error = f'No se pudo actualizar: {exc}'
    finally:
        refreshing = False
    return status()


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(refresh())
    yield
    await task


app = FastAPI(title='Tablero de costos por hora', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'], allow_methods=['GET', 'POST'], allow_headers=['*'])


@app.get('/api/estado')
def status():
    return dict(actualizando=refreshing, error=last_error, ultima_actualizacion=snapshot.updated_at if snapshot else None, con_datos=snapshot is not None)


@app.post('/api/actualizar')
async def update():
    return await refresh()


@app.get('/api/tablero')
def dashboard(inicio: str | None = None, fin: str | None = None, area: list[str] | None = Query(None), nivel: list[str] | None = Query(None), abogado_id: str | None = None):
    current = snapshot
    if current is None:
        raise HTTPException(503, last_error or 'Carga inicial en curso')
    try:
        return query(current, inicio, fin, area, nivel, abogado_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
