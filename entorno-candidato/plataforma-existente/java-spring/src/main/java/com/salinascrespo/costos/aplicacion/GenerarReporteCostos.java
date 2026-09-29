package com.salinascrespo.costos.aplicacion;

import com.salinascrespo.costos.dominio.Abogado;
import com.salinascrespo.costos.dominio.CostoHora;
import com.salinascrespo.costos.dominio.Registro;
import com.salinascrespo.costos.infraestructura.JsonRepositorioCostos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GenerarReporteCostos {

    private static final Logger log = LoggerFactory.getLogger(GenerarReporteCostos.class);
    private final RepositorioCostos repositorio = new JsonRepositorioCostos();

    public Map<String, Object> ejecutar(boolean incluirSocios) {
        List<FilaReporte> filas = new ArrayList<>();
        BigDecimal costoFirma = BigDecimal.ZERO;
        int minutosFirma = 0;
        for (Abogado abogado : repositorio.abogados()) {
            if (abogado.socio() && !incluirSocios) {
                continue;
            }
            int minutos = 0;
            for (Registro registro : abogado.registros()) {
                log.info("Procesando registro: {}", registro);
                minutos += registro.minutos();
            }
            BigDecimal costo = repositorio.costoDe(abogado.id());
            BigDecimal horas = BigDecimal.valueOf(minutos).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            filas.add(new FilaReporte(abogado.id(), abogado.nombre(), abogado.nivel(), costo, horas,
                    CostoHora.calcular(costo, minutos)));
            costoFirma = costoFirma.add(costo);
            minutosFirma += minutos;
        }
        return Map.of("periodo", repositorio.periodo(), "filas", filas,
                "promedioFirma", CostoHora.calcular(costoFirma, minutosFirma));
    }
}
