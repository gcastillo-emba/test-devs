package com.salinascrespo.costos.dominio;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class CostoHora {

    private CostoHora() {}

    /** Costo por hora: costo total del período dividido por todas las horas registradas. */
    public static BigDecimal calcular(BigDecimal costoTotal, int minutos) {
        BigDecimal horas = BigDecimal.valueOf(minutos).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        return costoTotal.divide(horas, 2, RoundingMode.HALF_UP);
    }
}
