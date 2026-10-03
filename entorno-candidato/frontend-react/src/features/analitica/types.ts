export interface FiltrosAnalitica {
  periodo?: string;
  abogadoId?: string;
  area?: string;
  nivel?: string;
}

export interface Resumen {
  totalAbogados: number;
  horasTotales: number;
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  costoTotal: number;
  costoPromedioHoraFacturable: number | null;
}

export interface DistribucionTiempo {
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  porcentajeNoFacturable: number;
}

export interface RendimientoAbogado {
  abogadoId: string;
  nombre: string;
  nivel: string;
  area: string;
  horasTotales: number;
  horasFacturables: number;
  horasNoFacturables: number;
  porcentajeFacturable: number;
  costoTotal: number;
  costoPorHora: number | null;
  costoPorHoraFacturable: number | null;
}

export interface EvolucionMensual {
  mes: string;
  horasTotales: number;
  horasFacturables: number;
}

export type OrigenDatos = "directo" | "backend";

export interface AnaliticaDatos {
  resumen: Resumen;
  distribucionTiempo: DistribucionTiempo;
  rendimiento: RendimientoAbogado[];
  evolucion: EvolucionMensual[];
}
