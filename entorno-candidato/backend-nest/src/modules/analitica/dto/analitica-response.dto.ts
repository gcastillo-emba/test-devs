import { Expose, Type } from 'class-transformer';

export class ResumenAnaliticaDto {
  @Expose()
  totalAbogados: number;

  @Expose()
  horasTotales: number;

  @Expose()
  horasFacturables: number;

  @Expose()
  horasNoFacturables: number;

  @Expose()
  porcentajeFacturable: number;

  @Expose()
  costoTotal: number;

  @Expose()
  costoPromedioHoraFacturable: number | null;
}

export class HorasPorAbogadoDto {
  @Expose()
  abogadoId: string;

  @Expose()
  nombre: string;

  @Expose()
  nivel: string | null;

  @Expose()
  area: string | null;

  @Expose()
  horasTotales: number;

  @Expose()
  horasFacturables: number;

  @Expose()
  horasNoFacturables: number;

  @Expose()
  porcentajeFacturable: number;
}

export class CostoPorAbogadoDto {
  @Expose()
  abogadoId: string;

  @Expose()
  nombre: string;

  @Expose()
  nivel: string | null;

  @Expose()
  area: string | null;

  @Expose()
  costoTotal: number;

  @Expose()
  horasFacturables: number;

  @Expose()
  costoPorHora: number | null;

  @Expose()
  costoPorHoraFacturable: number | null;
}

export class DistribucionTiempoDto {
  @Expose()
  horasFacturables: number;

  @Expose()
  horasNoFacturables: number;

  @Expose()
  porcentajeFacturable: number;

  @Expose()
  porcentajeNoFacturable: number;
}

export class EvolucionMensualDto {
  @Expose()
  periodo: string;

  @Expose()
  horasTotales: number;

  @Expose()
  horasFacturables: number;

  @Expose()
  horasNoFacturables: number;

  @Expose()
  porcentajeFacturable: number;

  @Expose()
  costoTotal: number;

  @Expose()
  costoPorHoraFacturable: number | null;
}

export class DashboardAnaliticaDto {
  @Expose()
  @Type(() => ResumenAnaliticaDto)
  resumen: ResumenAnaliticaDto;

  @Expose()
  @Type(() => HorasPorAbogadoDto)
  horasPorAbogado: HorasPorAbogadoDto[];

  @Expose()
  @Type(() => CostoPorAbogadoDto)
  costosPorAbogado: CostoPorAbogadoDto[];

  @Expose()
  @Type(() => DistribucionTiempoDto)
  distribucionTiempo: DistribucionTiempoDto;

  @Expose()
  @Type(() => EvolucionMensualDto)
  evolucionMensual: EvolucionMensualDto[];
}
