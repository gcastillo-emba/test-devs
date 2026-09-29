from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_salud():
    assert cliente.get("/salud").status_code == 200


def test_lista_de_abogados():
    assert len(cliente.get("/abogados").json()) == 6


def test_reporte_sin_socios():
    r = cliente.get("/reportes/costos")
    assert r.status_code == 200
    filas = {f["abogadoId"]: f for f in r.json()["filas"]}
    assert len(filas) == 4
    assert filas["A-02"]["costoHora"] == 180.0


def test_costo_hora_de_un_abogado():
    r = cliente.get("/abogados/A-01/costo-hora")
    assert r.status_code == 200
    assert r.json()["costoHora"] > 0
