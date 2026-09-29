package com.salinascrespo.costos.infraestructura;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salinascrespo.costos.aplicacion.RepositorioCostos;
import com.salinascrespo.costos.dominio.Abogado;
import com.salinascrespo.costos.dominio.Registro;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Adaptador de persistencia: implementa RepositorioCostos sobre seed.json. */
@Component
public class JsonRepositorioCostos implements RepositorioCostos {

    public record AbogadoJson(String id, String nombre, String nivel, boolean socio) {}

    public record CostoJson(String abogado_id, String periodo, BigDecimal costo_total) {}

    public record RegistroJson(String id, String abogado_id, String periodo, int minutos, boolean facturable,
                               String cliente, String asunto, String detalle) {}

    public record SemillaJson(String periodo, List<AbogadoJson> abogados, List<CostoJson> costos,
                              List<RegistroJson> registros) {}

    private static SemillaJson cache;

    private static synchronized SemillaJson semilla() {
        if (cache == null) {
            try (InputStream in = JsonRepositorioCostos.class.getResourceAsStream("/seed.json")) {
                cache = new ObjectMapper().readValue(in, SemillaJson.class);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
        return cache;
    }

    @Override
    public String periodo() {
        return semilla().periodo();
    }

    @Override
    public List<Abogado> abogados() {
        return semilla().abogados().stream().map(a -> new Abogado(a.id(), a.nombre(), a.nivel(), a.socio())).toList();
    }

    @Override
    public Optional<Abogado> abogado(String id) {
        return abogados().stream().filter(a -> a.id().equals(id)).findFirst();
    }

    @Override
    public BigDecimal costoDe(String abogadoId) {
        return semilla().costos().stream()
                .filter(c -> c.abogado_id().equals(abogadoId))
                .map(CostoJson::costo_total)
                .findFirst()
                .orElseThrow();
    }

    @Override
    public List<Registro> registrosDe(String abogadoId) {
        return semilla().registros().stream()
                .filter(r -> r.abogado_id().equals(abogadoId))
                .map(r -> new Registro(r.id(), r.abogado_id(), r.periodo(), r.minutos(), r.facturable(),
                        r.cliente(), r.asunto(), r.detalle()))
                .toList();
    }
}
