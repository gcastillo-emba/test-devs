package com.salinascrespo.costos.aplicacion;

import com.salinascrespo.costos.dominio.Abogado;
import com.salinascrespo.costos.dominio.Registro;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface RepositorioCostos {
    String periodo();

    List<Abogado> abogados();

    Optional<Abogado> abogado(String id);

    BigDecimal costoDe(String abogadoId);

    List<Registro> registrosDe(String abogadoId);
}
