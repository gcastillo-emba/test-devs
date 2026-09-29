package com.salinascrespo.costos.aplicacion;

import java.math.BigDecimal;

public record FilaReporte(String abogadoId, String nombre, String nivel, BigDecimal costoTotal,
                          BigDecimal horasRegistradas, BigDecimal costoHora) {}
