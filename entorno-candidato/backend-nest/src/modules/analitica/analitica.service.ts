import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Abogado } from '../../abogados/entities/abogado.entity.js';
import { CostoMensualAbogado } from '../../costos-mensuales/entities/costo-mensual-abogado.entity.js';
import { RegistroTrabajo } from '../../registros-trabajo/entities/registro-trabajo.entity.js';
import {
  FORMATO_PERIODO,
  FiltrosAbogadoDto,
} from './dto/analitica-query.dto.js';
import {
  CostoPorAbogadoDto,
  DashboardAnaliticaDto,
  DistribucionTiempoDto,
  EvolucionMensualDto,
  HorasPorAbogadoDto,
  ResumenAnaliticaDto,
} from './dto/analitica-response.dto.js';

const MINUTOS_POR_HORA = 60;

interface HorasRaw {
  minutosTotales: number;
  minutosFacturables: number;
}

interface TotalRaw {
  total: number;
}

interface CostoRaw {
  costoTotal: number;
}

interface HorasPorAbogadoRaw {
  abogadoId: string;
  nombre: string;
  nivel: string | null;
  area: string | null;
  minutosTotales: number;
  minutosFacturables: number;
}

interface CostosPorAbogadoRaw {
  abogadoId: string;
  nombre: string;
  nivel: string | null;
  area: string | null;
  costoTotal: number;
}

interface HorasPorPeriodoRaw {
  periodo: string;
  minutosTotales: number;
  minutosFacturables: number;
}

interface CostosPorPeriodoRaw {
  periodo: string;
  costoTotal: number;
}

/** Conteos de entidades distintas del periodo. Soporte analítico interno, aún no expuesto por HTTP. */
export interface EntidadesUnicas {
  clientesUnicos: number;
  asuntosUnicos: number;
}

interface AcumuladoPeriodo {
  minutosTotales: number;
  minutosFacturables: number;
  costoTotal: number;
}

/**
 * Agrega en SQL (SUM / COUNT / COUNT DISTINCT / GROUP BY / CASE WHEN) los datos de
 * RegistroTrabajo y CostoMensualAbogado. Nunca devuelve filas crudas al frontend.
 */
@Injectable()
export class AnaliticaService {
  constructor(
    @InjectRepository(Abogado)
    private readonly abogados: Repository<Abogado>,
    @InjectRepository(RegistroTrabajo)
    private readonly registros: Repository<RegistroTrabajo>,
    @InjectRepository(CostoMensualAbogado)
    private readonly costos: Repository<CostoMensualAbogado>,
  ) {}

  async obtenerResumenGeneral(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<ResumenAnaliticaDto> {
    const [horas, costoTotal, totalAbogados] = await Promise.all([
      this.resumirHoras(periodo, filtros),
      this.resumirCostoTotal(periodo, filtros),
      this.contarAbogados(filtros),
    ]);

    const horasTotales = horas.minutosTotales / MINUTOS_POR_HORA;
    const horasFacturables = horas.minutosFacturables / MINUTOS_POR_HORA;

    return {
      totalAbogados,
      horasTotales,
      horasFacturables,
      horasNoFacturables: horasTotales - horasFacturables,
      porcentajeFacturable: this.porcentaje(horasFacturables, horasTotales),
      costoTotal,
      costoPromedioHoraFacturable: this.cociente(costoTotal, horasFacturables),
    };
  }

  async obtenerHorasPorAbogado(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<HorasPorAbogadoDto[]> {
    const qb = this.registros
      .createQueryBuilder('r')
      .select('a.id', 'abogadoId')
      .addSelect('a.nombre', 'nombre')
      .addSelect('a.nivel', 'nivel')
      .addSelect('a.area', 'area')
      .addSelect(
        'COALESCE(SUM(r.minutos), 0)::double precision',
        'minutosTotales',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN r.facturable = true THEN r.minutos ELSE 0 END), 0)::double precision',
        'minutosFacturables',
      )
      .innerJoin('r.abogado', 'a')
      .groupBy('a.id')
      .orderBy('a.id', 'ASC');

    this.aplicarRango(qb, periodo);
    this.aplicarFiltros(qb, filtros);

    const filas = await qb.getRawMany<HorasPorAbogadoRaw>();

    return filas.map((fila) => {
      const horasTotales = Number(fila.minutosTotales) / MINUTOS_POR_HORA;
      const horasFacturables =
        Number(fila.minutosFacturables) / MINUTOS_POR_HORA;

      return {
        abogadoId: fila.abogadoId,
        nombre: fila.nombre,
        nivel: fila.nivel,
        area: fila.area,
        horasTotales,
        horasFacturables,
        horasNoFacturables: horasTotales - horasFacturables,
        porcentajeFacturable: this.porcentaje(horasFacturables, horasTotales),
      };
    });
  }

  async obtenerCostosPorAbogado(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<CostoPorAbogadoDto[]> {
    const qbCostos = this.costos
      .createQueryBuilder('c')
      .select('a.id', 'abogadoId')
      .addSelect('a.nombre', 'nombre')
      .addSelect('a.nivel', 'nivel')
      .addSelect('a.area', 'area')
      .addSelect(
        'COALESCE(SUM(c.costoTotal), 0)::double precision',
        'costoTotal',
      )
      .innerJoin('c.abogado', 'a')
      .groupBy('a.id')
      .orderBy('a.id', 'ASC');

    const qbHoras = this.registros
      .createQueryBuilder('r')
      .select('a.id', 'abogadoId')
      .addSelect(
        'COALESCE(SUM(r.minutos), 0)::double precision',
        'minutosTotales',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN r.facturable = true THEN r.minutos ELSE 0 END), 0)::double precision',
        'minutosFacturables',
      )
      .innerJoin('r.abogado', 'a')
      .groupBy('a.id');

    if (periodo !== undefined) {
      this.validarPeriodo(periodo);
      qbCostos.andWhere('c.periodo = :periodo', { periodo });
    }
    this.aplicarRango(qbHoras, periodo);
    this.aplicarFiltros(qbCostos, filtros);
    this.aplicarFiltros(qbHoras, filtros);

    const [filasCostos, filasHoras] = await Promise.all([
      qbCostos.getRawMany<CostosPorAbogadoRaw>(),
      qbHoras.getRawMany<{
        abogadoId: string;
        minutosTotales: number;
        minutosFacturables: number;
      }>(),
    ]);

    const horasPorAbogado = new Map<
      string,
      { minutosTotales: number; minutosFacturables: number }
    >();
    for (const fila of filasHoras) {
      horasPorAbogado.set(fila.abogadoId, {
        minutosTotales: Number(fila.minutosTotales),
        minutosFacturables: Number(fila.minutosFacturables),
      });
    }

    return filasCostos.map((fila) => {
      const minutos = horasPorAbogado.get(fila.abogadoId) ?? {
        minutosTotales: 0,
        minutosFacturables: 0,
      };
      const horasTotales = minutos.minutosTotales / MINUTOS_POR_HORA;
      const horasFacturables = minutos.minutosFacturables / MINUTOS_POR_HORA;
      const costoTotal = Number(fila.costoTotal);

      return {
        abogadoId: fila.abogadoId,
        nombre: fila.nombre,
        nivel: fila.nivel,
        area: fila.area,
        costoTotal,
        horasFacturables,
        costoPorHora: this.cociente(costoTotal, horasTotales),
        costoPorHoraFacturable: this.cociente(costoTotal, horasFacturables),
      };
    });
  }

  async obtenerDistribucionTiempo(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<DistribucionTiempoDto> {
    const horas = await this.resumirHoras(periodo, filtros);
    const horasTotales = horas.minutosTotales / MINUTOS_POR_HORA;
    const horasFacturables = horas.minutosFacturables / MINUTOS_POR_HORA;
    const horasNoFacturables = horasTotales - horasFacturables;

    return {
      horasFacturables,
      horasNoFacturables,
      porcentajeFacturable: this.porcentaje(horasFacturables, horasTotales),
      porcentajeNoFacturable: this.porcentaje(horasNoFacturables, horasTotales),
    };
  }

  async obtenerEvolucionMensual(
    abogadoId?: string,
  ): Promise<EvolucionMensualDto[]> {
    const qbHoras = this.registros
      .createQueryBuilder('r')
      .select("to_char(r.fechaTrabajo, 'YYYY-MM')", 'periodo')
      .addSelect(
        'COALESCE(SUM(r.minutos), 0)::double precision',
        'minutosTotales',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN r.facturable = true THEN r.minutos ELSE 0 END), 0)::double precision',
        'minutosFacturables',
      )
      .innerJoin('r.abogado', 'a')
      .groupBy("to_char(r.fechaTrabajo, 'YYYY-MM')")
      .orderBy("to_char(r.fechaTrabajo, 'YYYY-MM')", 'ASC');

    const qbCostos = this.costos
      .createQueryBuilder('c')
      .select('c.periodo', 'periodo')
      .addSelect(
        'COALESCE(SUM(c.costoTotal), 0)::double precision',
        'costoTotal',
      )
      .innerJoin('c.abogado', 'a')
      .groupBy('c.periodo')
      .orderBy('c.periodo', 'ASC');

    if (abogadoId) {
      qbHoras.andWhere('a.id = :abogadoId', { abogadoId });
      qbCostos.andWhere('a.id = :abogadoId', { abogadoId });
    }

    const [filasHoras, filasCostos] = await Promise.all([
      qbHoras.getRawMany<HorasPorPeriodoRaw>(),
      qbCostos.getRawMany<CostosPorPeriodoRaw>(),
    ]);

    const periodos = new Map<string, AcumuladoPeriodo>();
    for (const fila of filasHoras) {
      periodos.set(fila.periodo, {
        minutosTotales: Number(fila.minutosTotales),
        minutosFacturables: Number(fila.minutosFacturables),
        costoTotal: 0,
      });
    }
    for (const fila of filasCostos) {
      const acumulado = periodos.get(fila.periodo) ?? {
        minutosTotales: 0,
        minutosFacturables: 0,
        costoTotal: 0,
      };
      acumulado.costoTotal = Number(fila.costoTotal);
      periodos.set(fila.periodo, acumulado);
    }

    return [...periodos.entries()]
      .sort(([izquierda], [derecha]) => izquierda.localeCompare(derecha))
      .map(([periodo, acumulado]) => {
        const horasTotales = acumulado.minutosTotales / MINUTOS_POR_HORA;
        const horasFacturables =
          acumulado.minutosFacturables / MINUTOS_POR_HORA;

        return {
          periodo,
          horasTotales,
          horasFacturables,
          horasNoFacturables: horasTotales - horasFacturables,
          porcentajeFacturable: this.porcentaje(horasFacturables, horasTotales),
          costoTotal: acumulado.costoTotal,
          costoPorHoraFacturable: this.cociente(
            acumulado.costoTotal,
            horasFacturables,
          ),
        };
      });
  }

  async obtenerDashboard(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<DashboardAnaliticaDto> {
    const [
      resumen,
      horasPorAbogado,
      costosPorAbogado,
      distribucionTiempo,
      evolucionMensual,
    ] = await Promise.all([
      this.obtenerResumenGeneral(periodo, filtros),
      this.obtenerHorasPorAbogado(periodo, filtros),
      this.obtenerCostosPorAbogado(periodo, filtros),
      this.obtenerDistribucionTiempo(periodo, filtros),
      this.obtenerEvolucionMensual(filtros?.abogadoId),
    ]);

    return {
      resumen,
      horasPorAbogado,
      costosPorAbogado,
      distribucionTiempo,
      evolucionMensual,
    };
  }

  /**
   * Conteos de clientes y asuntos distintos en el periodo. Preparado para exponer
   * más adelante; por ahora ningún endpoint lo devuelve.
   */
  async obtenerEntidadesUnicas(periodo?: string): Promise<EntidadesUnicas> {
    const qb = this.registros
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r.cliente)::double precision', 'clientes')
      .addSelect('COUNT(DISTINCT r.asunto)::double precision', 'asuntos');

    this.aplicarRango(qb, periodo);

    const fila = await qb.getRawOne<{ clientes: number; asuntos: number }>();

    return {
      clientesUnicos: Number(fila?.clientes ?? 0),
      asuntosUnicos: Number(fila?.asuntos ?? 0),
    };
  }

  private async resumirHoras(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<HorasRaw> {
    const qb = this.registros
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.minutos), 0)::double precision', 'minutosTotales')
      .addSelect(
        'COALESCE(SUM(CASE WHEN r.facturable = true THEN r.minutos ELSE 0 END), 0)::double precision',
        'minutosFacturables',
      )
      .innerJoin('r.abogado', 'a');

    this.aplicarRango(qb, periodo);
    this.aplicarFiltros(qb, filtros);

    const fila = await qb.getRawOne<HorasRaw>();

    return {
      minutosTotales: Number(fila?.minutosTotales ?? 0),
      minutosFacturables: Number(fila?.minutosFacturables ?? 0),
    };
  }

  private async resumirCostoTotal(
    periodo?: string,
    filtros?: FiltrosAbogadoDto,
  ): Promise<number> {
    const qb = this.costos
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.costoTotal), 0)::double precision', 'costoTotal')
      .innerJoin('c.abogado', 'a');

    if (periodo !== undefined) {
      this.validarPeriodo(periodo);
      qb.andWhere('c.periodo = :periodo', { periodo });
    }
    this.aplicarFiltros(qb, filtros);

    const fila = await qb.getRawOne<CostoRaw>();

    return Number(fila?.costoTotal ?? 0);
  }

  private async contarAbogados(filtros?: FiltrosAbogadoDto): Promise<number> {
    const qb = this.abogados
      .createQueryBuilder('a')
      .select('COUNT(a.id)::double precision', 'total');

    this.aplicarFiltros(qb, filtros);

    const fila = await qb.getRawOne<TotalRaw>();

    return Number(fila?.total ?? 0);
  }

  private rangoPeriodo(
    periodo?: string,
  ): { desde: string; hasta: string } | null {
    if (periodo === undefined) {
      return null;
    }

    this.validarPeriodo(periodo);

    const [anio, mes] = periodo.split('-').map(Number);
    const hasta =
      mes === 12
        ? `${anio + 1}-01-01`
        : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

    return { desde: `${periodo}-01`, hasta };
  }

  private validarPeriodo(periodo: string): void {
    if (!FORMATO_PERIODO.test(periodo)) {
      throw new BadRequestException('periodo debe tener el formato YYYY-MM');
    }
  }

  private aplicarRango<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    periodo?: string,
  ): void {
    const rango = this.rangoPeriodo(periodo);
    if (!rango) {
      return;
    }

    qb.andWhere('r.fechaTrabajo >= :desde', { desde: rango.desde }).andWhere(
      'r.fechaTrabajo < :hasta',
      { hasta: rango.hasta },
    );
  }

  private aplicarFiltros<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filtros?: FiltrosAbogadoDto,
  ): void {
    if (!filtros) {
      return;
    }

    if (filtros.abogadoId) {
      qb.andWhere('a.id = :abogadoId', { abogadoId: filtros.abogadoId });
    }
    if (filtros.area) {
      qb.andWhere('a.area = :area', { area: filtros.area });
    }
    if (filtros.nivel) {
      qb.andWhere('a.nivel = :nivel', { nivel: filtros.nivel });
    }
  }

  private porcentaje(parte: number, total: number): number {
    return total === 0 ? 0 : (parte / total) * 100;
  }

  private cociente(numerador: number, denominador: number): number | null {
    return denominador === 0 ? null : numerador / denominador;
  }
}
