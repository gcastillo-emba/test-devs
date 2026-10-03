import type { FiltrosAnalitica } from "../types";

export interface ResumenBackend {
  totalAbogados: number;
  horasTotales: number;
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  costoTotal: number;
  costoPromedioHoraFacturable: number | null;
}

export interface HorasPorAbogado {
  abogadoId: string;
  nombre: string;
  nivel: string | null;
  area: string | null;
  horasTotales: number;
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
}

export interface CostoPorAbogado {
  abogadoId: string;
  nombre: string;
  nivel: string | null;
  area: string | null;
  costoTotal: number;
  horasFacturables: number;
  costoPorHora: number | null;
  costoPorHoraFacturable: number | null;
}

export interface DistribucionTiempoBackend {
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  porcentajeNoFacturable: number;
}

export interface EvolucionMensualBackend {
  periodo: string;
  horasTotales: number;
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  costoTotal: number;
  costoPorHoraFacturable: number | null;
}

export interface DashboardBackend {
  resumen: ResumenBackend;
  horasPorAbogado: HorasPorAbogado[];
  costosPorAbogado: CostoPorAbogado[];
  distribucionTiempo: DistribucionTiempoBackend;
  evolucionMensual: EvolucionMensualBackend[];
}

const BASE = "/api/analitica";

function encadenar(base: string, filtros: FiltrosAnalitica): string {
  const params = new URLSearchParams();
  if (filtros.periodo) params.set("periodo", filtros.periodo);
  if (filtros.abogadoId) params.set("abogadoId", filtros.abogadoId);
  if (filtros.area) params.set("area", filtros.area);
  if (filtros.nivel) params.set("nivel", filtros.nivel);
  const consulta = params.toString();
  return consulta ? `${base}?${consulta}` : base;
}

async function pedir<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { signal });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AbortError") {
      throw error;
    }
    throw new Error(`No se pudo contactar al backend en ${ruta}. ¿Está corriendo \`npm run start:dev\`?`);
  }

  if (!respuesta.ok) {
    let detalle = "";
    try {
      const cuerpo = (await respuesta.json()) as { message?: unknown };
      if (Array.isArray(cuerpo.message)) {
        detalle = cuerpo.message.join("; ");
      } else if (typeof cuerpo.message === "string") {
        detalle = cuerpo.message;
      }
    } catch {
      detalle = "";
    }
    throw new Error(
      `El backend respondió HTTP ${respuesta.status} en ${ruta}${detalle ? `: ${detalle}` : ""}`,
    );
  }

  return (await respuesta.json()) as T;
}

export function obtenerDashboard(filtros: FiltrosAnalitica, signal?: AbortSignal): Promise<DashboardBackend> {
  return pedir<DashboardBackend>(encadenar(`${BASE}/dashboard`, filtros), signal);
}

export function obtenerResumen(filtros: FiltrosAnalitica, signal?: AbortSignal): Promise<ResumenBackend> {
  return pedir<ResumenBackend>(encadenar(`${BASE}/resumen`, filtros), signal);
}

export function obtenerHorasAbogados(
  filtros: FiltrosAnalitica,
  signal?: AbortSignal,
): Promise<HorasPorAbogado[]> {
  return pedir<HorasPorAbogado[]>(encadenar(`${BASE}/horas-abogados`, filtros), signal);
}

export function obtenerCostosAbogados(
  filtros: FiltrosAnalitica,
  signal?: AbortSignal,
): Promise<CostoPorAbogado[]> {
  return pedir<CostoPorAbogado[]>(encadenar(`${BASE}/costos-abogados`, filtros), signal);
}

export function obtenerDistribucionTiempo(
  filtros: FiltrosAnalitica,
  signal?: AbortSignal,
): Promise<DistribucionTiempoBackend> {
  return pedir<DistribucionTiempoBackend>(encadenar(`${BASE}/distribucion-tiempo`, filtros), signal);
}

export function obtenerEvolucion(abogadoId?: string, signal?: AbortSignal): Promise<EvolucionMensualBackend[]> {
  const params = abogadoId ? `?abogadoId=${encodeURIComponent(abogadoId)}` : "";
  return pedir<EvolucionMensualBackend[]>(`${BASE}/evolucion${params}`, signal);
}
