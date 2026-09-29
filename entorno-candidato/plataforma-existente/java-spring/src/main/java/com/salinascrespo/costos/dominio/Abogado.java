package com.salinascrespo.costos.dominio;

import com.salinascrespo.costos.infraestructura.JsonRepositorioCostos;
import java.util.List;

public record Abogado(String id, String nombre, String nivel, boolean socio) {

    public List<Registro> registros() {
        return new JsonRepositorioCostos().registrosDe(id);
    }
}
