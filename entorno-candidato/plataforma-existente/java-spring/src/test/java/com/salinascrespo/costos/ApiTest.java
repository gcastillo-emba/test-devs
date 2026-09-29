package com.salinascrespo.costos;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ApiTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void respondeSalud() throws Exception {
        mvc.perform(get("/salud")).andExpect(status().isOk());
    }

    @Test
    void listaLosAbogados() throws Exception {
        mvc.perform(get("/abogados")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(6)));
    }

    @Test
    void generaElReporteSinSocios() throws Exception {
        mvc.perform(get("/reportes/costos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filas", hasSize(4)))
                .andExpect(jsonPath("$.filas[1].abogadoId").value("A-02"))
                .andExpect(jsonPath("$.filas[1].costoHora").value(180.0));
    }

    @Test
    void devuelveElCostoPorHoraDeUnAbogado() throws Exception {
        mvc.perform(get("/abogados/A-01/costo-hora"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.costoHora", greaterThan(0.0)));
    }
}
