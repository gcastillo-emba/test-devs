package com.salinascrespo.costos.dominio;

public record Registro(String id, String abogadoId, String periodo, int minutos, boolean facturable,
                       String cliente, String asunto, String detalle) {}
