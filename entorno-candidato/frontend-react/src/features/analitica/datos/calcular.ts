import type {
  AnaliticaDatos,
  DistribucionTiempo,
  EvolucionMensual,
  FiltrosAnalitica,
  RendimientoAbogado,
  Resumen,
} from "../types";
import type { FilaContabilidad } from "./contabilidad";
import type { RegistroTrabajoCrudo } from "./registros";

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function cociente(numerador: number, denominador: number, decimales: number): number | null {
  if (denominador <= 0) return null;
  return redondear(numerador / denominador, decimales);
}

function porcentaje(parte: number, total: number, decimales: number): number {
  if (total <= 0) return 0;
  return redondear((parte / total) * 100, decimales);
}

interface Dimension {
  nombre: string;
  nivel: string;
  area: string;
}

interface Acumulado {
  minutos: number;
  minutosFacturables: number;
  costo: number;
}

function coincideDimension(dimension: Dimension | undefined, filtros: FiltrosAnalitica): boolean {
  if (filtros.area && (!dimension || dimension.area !== filtros.area)) return false;
  if (filtros.nivel && (!dimension || dimension.nivel !== filtros.nivel)) return false;
  return true;
}

export function calcularAnalitica(
  filas: FilaContabilidad[],
  registros: RegistroTrabajoCrudo[],
  filtros: FiltrosAnalitica = {},
): AnaliticaDatos {
  const dimensiones = new Map<string, Dimension>();
  for (const fila of filas) {
    if (!fila.abogadoId || dimensiones.has(fila.abogadoId)) continue;
    dimensiones.set(fila.abogadoId, {
      nombre: fila.nombre,
      nivel: fila.nivel,
      area: fila.area,
    });
  }

  const listaDimensiones = [...dimensiones.entries()].filter(
    ([abogadoId, dimension]) => (!filtros.abogadoId || abogadoId === filtros.abogadoId) && coincideDimension(dimension, filtros),
  );

  const filasFiltradas = filas.filter(
    (fila) =>
      fila.abogadoId &&
      (!filtros.periodo || fila.periodo === filtros.periodo) &&
      (!filtros.abogadoId || fila.abogadoId === filtros.abogadoId) &&
      coincideDimension(dimensiones.get(fila.abogadoId), filtros),
  );

  const registrosFiltrados = registros.filter(
    (registro) =>
      (!filtros.periodo || registro.fechaTrabajo.startsWith(filtros.periodo)) &&
      (!filtros.abogadoId || registro.abogadoId === filtros.abogadoId) &&
      coincideDimension(dimensiones.get(registro.abogadoId), filtros),
  );

  const registrosEvolucion = filtros.abogadoId
    ? registros.filter((registro) => registro.abogadoId === filtros.abogadoId)
    : registros;

  const acumulados = new Map<string, Acumulado>();
  let costoTotalGlobal = 0;

  for (const fila of filasFiltradas) {
    const acumulado = acumulados.get(fila.abogadoId) ?? { minutos: 0, minutosFacturables: 0, costo: 0 };
    acumulado.costo += fila.costoTotal;
    acumulados.set(fila.abogadoId, acumulado);
    costoTotalGlobal += fila.costoTotal;
  }

  let minutosTotales = 0;
  let minutosFacturables = 0;
  for (const registro of registrosFiltrados) {
    const acumulado = acumulados.get(registro.abogadoId) ?? { minutos: 0, minutosFacturables: 0, costo: 0 };
    acumulado.minutos += registro.minutos;
    if (registro.facturable) acumulado.minutosFacturables += registro.minutos;
    acumulados.set(registro.abogadoId, acumulado);
    minutosTotales += registro.minutos;
    if (registro.facturable) minutosFacturables += registro.minutos;
  }

  const rendimiento: RendimientoAbogado[] = [...acumulados.entries()]
    .map(([abogadoId, acumulado]) => {
      const dimension = dimensiones.get(abogadoId);
      const horasTotales = redondear(acumulado.minutos / 60, 2);
      const horasFacturables = redondear(acumulado.minutosFacturables / 60, 2);
      const costoTotal = redondear(acumulado.costo, 2);
      return {
        abogadoId,
        nombre: dimension?.nombre || abogadoId,
        nivel: dimension?.nivel ?? "",
        area: dimension?.area ?? "",
        horasTotales,
        horasFacturables,
        horasNoFacturables: redondear((acumulado.minutos - acumulado.minutosFacturables) / 60, 2),
        porcentajeFacturable: porcentaje(acumulado.minutosFacturables, acumulado.minutos, 1),
        costoTotal,
        costoPorHora: cociente(acumulado.costo, acumulado.minutos / 60, 2),
        costoPorHoraFacturable: cociente(acumulado.costo, acumulado.minutosFacturables / 60, 2),
      };
    })
    .sort((a, b) => b.horasTotales - a.horasTotales || a.nombre.localeCompare(b.nombre, "es"));

  const meses = new Map<string, { horasTotales: number; horasFacturables: number }>();
  const filasEvolucion = filtros.abogadoId
    ? filas.filter((fila) => fila.abogadoId === filtros.abogadoId)
    : filas;
  for (const fila of filasEvolucion) {
    if (!fila.periodo || meses.has(fila.periodo)) continue;
    meses.set(fila.periodo, { horasTotales: 0, horasFacturables: 0 });
  }
  for (const registro of registrosEvolucion) {
    const mes = registro.fechaTrabajo.slice(0, 7);
    const acumulado = meses.get(mes) ?? { horasTotales: 0, horasFacturables: 0 };
    acumulado.horasTotales += registro.minutos / 60;
    if (registro.facturable) acumulado.horasFacturables += registro.minutos / 60;
    meses.set(mes, acumulado);
  }

  const evolucion: EvolucionMensual[] = [...meses.entries()]
    .map(([mes, horas]) => ({
      mes,
      horasTotales: redondear(horas.horasTotales, 2),
      horasFacturables: redondear(horas.horasFacturables, 2),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const horasTotalesResumen = minutosTotales / 60;
  const horasFacturablesResumen = minutosFacturables / 60;
  const resumen: Resumen = {
    totalAbogados: listaDimensiones.length,
    horasTotales: redondear(horasTotalesResumen, 2),
    horasFacturables: redondear(horasFacturablesResumen, 2),
    horasNoFacturables: redondear(horasTotalesResumen - horasFacturablesResumen, 2),
    porcentajeFacturable: porcentaje(horasFacturablesResumen, horasTotalesResumen, 1),
    costoTotal: redondear(costoTotalGlobal, 2),
    costoPromedioHoraFacturable: cociente(costoTotalGlobal, horasFacturablesResumen, 2),
  };

  const distribucionTiempo: DistribucionTiempo = {
    horasFacturables: resumen.horasFacturables,
    horasNoFacturables: resumen.horasNoFacturables,
    porcentajeFacturable: resumen.porcentajeFacturable,
    porcentajeNoFacturable: porcentaje(
      horasTotalesResumen - horasFacturablesResumen,
      horasTotalesResumen,
      1,
    ),
  };

  return { resumen, distribucionTiempo, rendimiento, evolucion };
}
