import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const FORMATO_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
export const FORMATO_ABOGADO = /^AB-\d{3}$/;

/** Filtros aplicables sobre la dimensión abogado (usados por varios endpoints). */
export class FiltrosAbogadoDto {
  @IsOptional()
  @IsString()
  @Matches(FORMATO_ABOGADO, {
    message: 'abogadoId debe tener el formato AB-XXX',
  })
  abogadoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nivel?: string;
}

/** Filtros de los endpoints que además aceptan un periodo (`YYYY-MM`). */
export class FiltrosAnaliticaQueryDto extends FiltrosAbogadoDto {
  @IsOptional()
  @IsString()
  @Matches(FORMATO_PERIODO, {
    message: 'periodo debe tener el formato YYYY-MM',
  })
  periodo?: string;
}

/** La evolución mensual se filtra por abogado; `periodo` no aplica (es la serie completa). */
export class EvolucionQueryDto {
  @IsOptional()
  @IsString()
  @Matches(FORMATO_ABOGADO, {
    message: 'abogadoId debe tener el formato AB-XXX',
  })
  abogadoId?: string;
}
