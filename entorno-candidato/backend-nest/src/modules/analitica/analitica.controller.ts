import { Controller, Get, Query } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AnaliticaService } from './analitica.service.js';
import {
  EvolucionQueryDto,
  FiltrosAnaliticaQueryDto,
} from './dto/analitica-query.dto.js';
import {
  CostoPorAbogadoDto,
  DashboardAnaliticaDto,
  DistribucionTiempoDto,
  EvolucionMensualDto,
  HorasPorAbogadoDto,
  ResumenAnaliticaDto,
} from './dto/analitica-response.dto.js';

@Controller('api/analitica')
export class AnaliticaController {
  constructor(private readonly analiticaService: AnaliticaService) {}

  @Get('dashboard')
  async dashboard(
    @Query() query: FiltrosAnaliticaQueryDto,
  ): Promise<DashboardAnaliticaDto> {
    const datos = await this.analiticaService.obtenerDashboard(
      query.periodo,
      query,
    );

    return plainToInstance(DashboardAnaliticaDto, datos, {
      excludeExtraneousValues: true,
    });
  }

  @Get('resumen')
  async resumen(
    @Query() query: FiltrosAnaliticaQueryDto,
  ): Promise<ResumenAnaliticaDto> {
    const datos = await this.analiticaService.obtenerResumenGeneral(
      query.periodo,
      query,
    );

    return plainToInstance(ResumenAnaliticaDto, datos, {
      excludeExtraneousValues: true,
    });
  }

  @Get('horas-abogados')
  async horasAbogados(
    @Query() query: FiltrosAnaliticaQueryDto,
  ): Promise<HorasPorAbogadoDto[]> {
    const datos = await this.analiticaService.obtenerHorasPorAbogado(
      query.periodo,
      query,
    );

    return plainToInstance(HorasPorAbogadoDto, datos, {
      excludeExtraneousValues: true,
    });
  }

  @Get('costos-abogados')
  async costosAbogados(
    @Query() query: FiltrosAnaliticaQueryDto,
  ): Promise<CostoPorAbogadoDto[]> {
    const datos = await this.analiticaService.obtenerCostosPorAbogado(
      query.periodo,
      query,
    );

    return plainToInstance(CostoPorAbogadoDto, datos, {
      excludeExtraneousValues: true,
    });
  }

  @Get('distribucion-tiempo')
  async distribucionTiempo(
    @Query() query: FiltrosAnaliticaQueryDto,
  ): Promise<DistribucionTiempoDto> {
    const datos = await this.analiticaService.obtenerDistribucionTiempo(
      query.periodo,
      query,
    );

    return plainToInstance(DistribucionTiempoDto, datos, {
      excludeExtraneousValues: true,
    });
  }

  @Get('evolucion')
  async evolucion(
    @Query() query: EvolucionQueryDto,
  ): Promise<EvolucionMensualDto[]> {
    const datos = await this.analiticaService.obtenerEvolucionMensual(
      query.abogadoId,
    );

    return plainToInstance(EvolucionMensualDto, datos, {
      excludeExtraneousValues: true,
    });
  }
}
