def calcular_costo_hora(costo_total: float, minutos: int) -> float | None:
    """Costo por hora: costo total del período dividido por todas las horas registradas.

    Sin horas registradas, el cociente no es calculable y se devuelve None.
    """
    if minutos == 0:
        return None
    horas = minutos / 60
    return round(costo_total / horas, 2)
