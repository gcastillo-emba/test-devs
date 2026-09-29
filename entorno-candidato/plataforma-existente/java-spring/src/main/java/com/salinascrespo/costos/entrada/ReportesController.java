package com.salinascrespo.costos.entrada;

import com.salinascrespo.costos.aplicacion.GenerarReporteCostos;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReportesController {

    private final GenerarReporteCostos generarReporte;

    public ReportesController(GenerarReporteCostos generarReporte) {
        this.generarReporte = generarReporte;
    }

    @GetMapping("/reportes/costos")
    public Map<String, Object> reporteCostos(
            @RequestParam(name = "incluirSocios", defaultValue = "false") boolean incluirSocios) {
        return generarReporte.ejecutar(incluirSocios);
    }
}
