import type { AnaliticaDatos } from "../types";
import { filasContabilidad } from "./contabilidad";

export interface OpcionAbogado {
  abogadoId: string;
  nombre: string;
  nivel: string;
  area: string;
}

export interface OpcionesFiltros {
  periodos: string[];
  abogados: OpcionAbogado[];
  areas: string[];
  niveles: string[];
}

function ordenarTexto(a: string, b: string): number {
  return a.localeCompare(b, "es");
}

function desdeAbogados(abogados: OpcionAbogado[], periodos: string[]): OpcionesFiltros {
  const areas = [...new Set(abogados.map((abogado) => abogado.area).filter(Boolean))];
  const niveles = [...new Set(abogados.map((abogado) => abogado.nivel).filter(Boolean))];

  return {
    periodos: [...new Set(periodos)].sort(ordenarTexto),
    abogados: abogados.sort((a, b) => ordenarTexto(a.nombre, b.nombre)),
    areas: areas.sort(ordenarTexto),
    niveles: niveles.sort(ordenarTexto),
  };
}

export function opcionesDesdeCsv(): OpcionesFiltros {
  const mapa = new Map<string, OpcionAbogado>();
  const periodos: string[] = [];

  for (const fila of filasContabilidad) {
    if (fila.periodo) periodos.push(fila.periodo);
    if (!fila.abogadoId || mapa.has(fila.abogadoId)) continue;
    mapa.set(fila.abogadoId, {
      abogadoId: fila.abogadoId,
      nombre: fila.nombre,
      nivel: fila.nivel,
      area: fila.area,
    });
  }

  return desdeAbogados([...mapa.values()], periodos);
}

export function opcionesDesdeDatos(datos: AnaliticaDatos): OpcionesFiltros {
  const abogados = datos.rendimiento.map((fila) => ({
    abogadoId: fila.abogadoId,
    nombre: fila.nombre,
    nivel: fila.nivel,
    area: fila.area,
  }));

  return desdeAbogados(abogados, datos.evolucion.map((mes) => mes.mes));
}
