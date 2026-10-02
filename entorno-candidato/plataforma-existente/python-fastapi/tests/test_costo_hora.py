import pytest

from app.dominio.costo_hora import calcular_costo_hora


@pytest.mark.parametrize("costo, minutos, esperado", [
    (64000, 0, None),
    (0, 0, None),
    (31500, 5400, 350.0),
    (100, 90, 66.67),
    (0, 60, 0.0),
])
def test_costo_hora(costo, minutos, esperado):
    assert calcular_costo_hora(costo, minutos) == esperado
