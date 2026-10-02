import pytest

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
    assert r.json()["costoHora"] == 350.0


def test_reporte_con_socios_sin_horas():
    r = cliente.get("/reportes/costos?incluirSocios=true")
    assert r.status_code == 200
    datos = r.json()
    filas = {f["abogadoId"]: f for f in datos["filas"]}
    assert len(filas) == 6
    for abogado_id, costo in (("P-01", 64000), ("P-02", 61000)):
        assert filas[abogado_id]["costoTotal"] == costo
        assert filas[abogado_id]["horasRegistradas"] == 0
        assert filas[abogado_id]["costoHora"] is None
    assert filas["A-01"]["costoHora"] == 350.0
    assert datos["promedioFirma"] == 483.18


@pytest.mark.parametrize("abogado_id, esperado", [
    ("A-01", 350.0), ("A-02", 180.0), ("A-03", 200.0),
    ("A-04", 108.0), ("P-01", None), ("P-02", None),
])
def test_ficha_y_reporte_usan_el_mismo_costo_hora(abogado_id, esperado):
    reporte = cliente.get("/reportes/costos?incluirSocios=true")
    ficha = cliente.get(f"/abogados/{abogado_id}/costo-hora")
    assert reporte.status_code == ficha.status_code == 200
    fila = next(f for f in reporte.json()["filas"] if f["abogadoId"] == abogado_id)
    assert fila["costoHora"] == ficha.json()["costoHora"] == esperado


def test_reporte_sin_horas_en_toda_la_firma(monkeypatch):
    from app.infraestructura import repositorio_json

    semilla = {**repositorio_json._semilla(), "registros": []}
    monkeypatch.setattr(repositorio_json, "_semilla", lambda: semilla)
    r = cliente.get("/reportes/costos?incluirSocios=true")
    assert r.status_code == 200
    assert len(r.json()["filas"]) == 6
    assert all(f["costoHora"] is None for f in r.json()["filas"])
    assert sum(f["costoTotal"] for f in r.json()["filas"]) == 212600
    assert r.json()["promedioFirma"] is None
