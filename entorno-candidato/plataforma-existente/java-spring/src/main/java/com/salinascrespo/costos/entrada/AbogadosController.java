package com.salinascrespo.costos.entrada;

import com.salinascrespo.costos.dominio.Abogado;
import com.salinascrespo.costos.dominio.Registro;
import com.salinascrespo.costos.infraestructura.JsonRepositorioCostos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AbogadosController {

    private final JsonRepositorioCostos repositorio;

    public AbogadosController(JsonRepositorioCostos repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping("/abogados")
    public List<Map<String, Object>> listar() {
        return repositorio.abogados().stream()
                .map(a -> Map.<String, Object>of("id", a.id(), "nombre", a.nombre(), "nivel", a.nivel()))
                .toList();
    }

    @GetMapping("/abogados/{id}/costo-hora")
    public Map<String, Object> costoHora(@PathVariable("id") String id) {
        Abogado abogado = repositorio.abogado(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Abogado no encontrado"));
        int minutos = repositorio.registrosDe(id).stream()
                .filter(Registro::facturable)
                .mapToInt(Registro::minutos)
                .sum();
        BigDecimal horas = BigDecimal.valueOf(minutos).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        return Map.of(
                "abogadoId", abogado.id(),
                "nombre", abogado.nombre(),
                "periodo", repositorio.periodo(),
                "costoHora", repositorio.costoDe(id).divide(horas, 2, RoundingMode.HALF_UP));
    }
}
