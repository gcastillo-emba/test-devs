def calcular_costo_hora(costo_total: float, minutos: int) -> float:
    """Costo por hora: costo total del período dividido por todas las horas registradas."""
    horas = minutos / 60
    return round(costo_total / horas, 2)
