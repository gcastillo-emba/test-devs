import type { AnaliticaDatos, DistribucionTiempo, EvolucionMensual, RendimientoAbogado, Resumen } from "../types";
import type { DashboardBackend } from "./analitica";

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function opcional(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function cadena(valor: unknown, respaldo: string): string {
  return typeof valor === "string" && valor.length > 0 ? valor : respaldo;
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function aResumen(cuerpo: DashboardBackend["resumen"]): Resumen {
  return {
    totalAbogados: numero(cuerpo.totalAbogados),
    horasTotales: redondear(numero(cuerpo.horasTotales), 2),
    horasFacturables: redondear(numero(cuerpo.horasFacturables), 2),
    horasNoFacturables: redondear(numero(cuerpo.horasNoFacturables), 2),
    porcentajeFacturable: redondear(numero(cuerpo.porcentajeFacturable), 1),
    costoTotal: redondear(numero(cuerpo.costoTotal), 2),
    costoPromedioHoraFacturable: opcional(cuerpo.costoPromedioHoraFacturable),
  };
}

function aDistribucion(cuerpo: DashboardBackend["distribucionTiempo"]): DistribucionTiempo {
  return {
    horasFacturables: redondear(numero(cuerpo.horasFacturables), 2),
    horasNoFacturables: redondear(numero(cuerpo.horasNoFacturables), 2),
    porcentajeFacturable: redondear(numero(cuerpo.porcentajeFacturable), 1),
    porcentajeNoFacturable: redondear(numero(cuerpo.porcentajeNoFacturable), 1),
  };
}

function aRendimiento(cuerpo: DashboardBackend): RendimientoAbogado[] {
  const filas = new Map<string, RendimientoAbogado>();

  for (const fila of cuerpo.horasPorAbogado) {
    const horasTotales = redondear(numero(fila.horasTotales), 2);
    const horasFacturables = redondear(numero(fila.horasFacturables), 2);
    filas.set(fila.abogadoId, {
      abogadoId: fila.abogadoId,
      nombre: cadena(fila.nombre, fila.abogadoId),
      nivel: fila.nivel ?? "",
      area: fila.area ?? "",
      horasTotales,
      horasFacturables,
      horasNoFacturables: redondear(numero(fila.horasNoFacturables), 2),
      porcentajeFacturable: redondear(numero(fila.porcentajeFacturable), 1),
      costoTotal: 0,
      costoPorHora: null,
      costoPorHoraFacturable: null,
    });
  }

  for (const fila of cuerpo.costosPorAbogado) {
    let actual = filas.get(fila.abogadoId);
    if (!actual) {
      actual = {
        abogadoId: fila.abogadoId,
        nombre: cadena(fila.nombre, fila.abogadoId),
        nivel: fila.nivel ?? "",
        area: fila.area ?? "",
        horasTotales: 0,
        horasFacturables: redondear(numero(fila.horasFacturables), 2),
        horasNoFacturables: 0,
        porcentajeFacturable: 0,
        costoTotal: 0,
        costoPorHora: null,
        costoPorHoraFacturable: null,
      };
      filas.set(fila.abogadoId, actual);
    }
    actual.costoTotal = redondear(numero(fila.costoTotal), 2);
    if (actual.horasTotales === 0) {
      actual.horasFacturables = redondear(numero(fila.horasFacturables), 2);
      actual.horasNoFacturables = 0;
    }
    actual.costoPorHora = opcional(fila.costoPorHora);
    actual.costoPorHoraFacturable = opcional(fila.costoPorHoraFacturable);
  }

  return [...filas.values()].sort(
    (a, b) => b.horasTotales - a.horasTotales || a.nombre.localeCompare(b.nombre, "es"),
  );
}

function aEvolucion(cuerpo: DashboardBackend): EvolucionMensual[] {
  return cuerpo.evolucionMensual
    .map((fila) => ({
      mes: fila.periodo,
      horasTotales: redondear(numero(fila.horasTotales), 2),
      horasFacturables: redondear(numero(fila.horasFacturables), 2),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

export function adaptarDashboard(cuerpo: DashboardBackend): AnaliticaDatos {
  if (!cuerpo || typeof cuerpo !== "object") {
    throw new Error("Respuesta inesperada de /api/analitica/dashboard");
  }
  if (!Array.isArray(cuerpo.horasPorAbogado) || !Array.isArray(cuerpo.costosPorAbogado)) {
    throw new Error("Respuesta inesperada de /api/analitica/dashboard");
  }
  if (!cuerpo.resumen || !cuerpo.distribucionTiempo || !Array.isArray(cuerpo.evolucionMensual)) {
    throw new Error("Respuesta inesperada de /api/analitica/dashboard");
  }

  return {
    resumen: aResumen(cuerpo.resumen),
    distribucionTiempo: aDistribucion(cuerpo.distribucionTiempo),
    rendimiento: aRendimiento(cuerpo),
    evolucion: aEvolucion(cuerpo),
  };
}
