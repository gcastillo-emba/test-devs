import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DataSource, QueryDeepPartialEntity, Repository } from 'typeorm';
import { Abogado } from '../abogados/entities/abogado.entity.js';
import { CostoMensualAbogado } from '../costos-mensuales/entities/costo-mensual-abogado.entity.js';
import { RegistroTrabajo } from '../registros-trabajo/entities/registro-trabajo.entity.js';

export interface InvalidRecord {
  source: string;
  id: string;
  reason: string;
}

export interface ImportSummary {
  abogados: { processed: number; invalid: number };
  registros: { processed: number; invalid: number };
  costos: { processed: number; invalid: number };
  invalid: InvalidRecord[];
}

interface CostCsvRow {
  periodo: string;
  abogado_id: string;
  nombre: string;
  nivel: string;
  area: string;
  sueldo: string;
  cargas_sociales: string;
  gastos_asignados: string;
  costo_total: string;
  horas_facturadas: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIODO_RE = /^\d{4}-\d{2}$/;
const UPSERT_CHUNK = 1000;

@Injectable()
export class ImportacionDatosService {
  private readonly logger = new Logger(ImportacionDatosService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Abogado)
    private readonly abogadosRepo: Repository<Abogado>,
    @InjectRepository(RegistroTrabajo)
    private readonly registrosRepo: Repository<RegistroTrabajo>,
    @InjectRepository(CostoMensualAbogado)
    private readonly costosRepo: Repository<CostoMensualAbogado>,
  ) {}

  async run(): Promise<ImportSummary> {
    const invalid: InvalidRecord[] = [];
    const now = new Date();

    const costRows = await this.loadCostRows();
    const abogadoIds = await this.importAbogados(costRows, now, invalid);
    const registrosProcessed = await this.importRegistros(abogadoIds, now, invalid);
    const costosProcessed = await this.importCostos(costRows, abogadoIds, now, invalid);

    const countInvalid = (source: string): number =>
      invalid.filter((record) => record.source === source).length;

    return {
      abogados: { processed: abogadoIds.size, invalid: countInvalid('abogados') },
      registros: { processed: registrosProcessed, invalid: countInvalid('registros') },
      costos: { processed: costosProcessed, invalid: countInvalid('costos') },
      invalid,
    };
  }

  // --- source loading -------------------------------------------------------

  private async loadCostRows(): Promise<CostCsvRow[]> {
    const csvPath = path.resolve(process.env.COSTS_CSV_PATH ?? '../datos/contabilidad.csv');
    const text = await readFile(csvPath, 'utf8');
    const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
    const header = this.splitCsvLine(lines[0]);
    const rows: CostCsvRow[] = [];
    for (const line of lines.slice(1)) {
      const cells = this.splitCsvLine(line);
      const row: Record<string, string> = {};
      header.forEach((key, i) => {
        row[key] = cells[i] ?? '';
      });
      rows.push(row as unknown as CostCsvRow);
    }
    this.logger.log(`Loaded ${rows.length} cost rows from ${csvPath}`);
    return rows;
  }

  private splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
  }

  // --- import steps (order matters: abogados -> registros -> costos) --------

  private async importAbogados(
    rows: CostCsvRow[],
    now: Date,
    invalid: InvalidRecord[],
  ): Promise<Set<string>> {
    const byId = new Map<string, Abogado>();
    for (const row of rows) {
      const id = row.abogado_id?.trim();
      if (!id) {
        invalid.push({
          source: 'abogados',
          id: row.nombre ?? '(sin id)',
          reason: 'abogado_id vacío',
        });
        continue;
      }
      if (byId.has(id)) continue; // same lawyer repeats once per period
      const nombre = row.nombre?.trim();
      if (!nombre) {
        invalid.push({ source: 'abogados', id, reason: 'nombre vacío' });
        continue;
      }
      const abogado = new Abogado();
      abogado.id = id;
      abogado.nombre = nombre;
      abogado.nivel = row.nivel?.trim() || null;
      abogado.area = row.area?.trim() || null;
      abogado.activo = true;
      abogado.createdAt = now;
      abogado.updatedAt = now;
      byId.set(id, abogado);
    }

    const entities = [...byId.values()];
    await this.chunkedUpsert(
      Abogado,
      entities,
      ['nombre', 'nivel', 'area', 'updatedAt'],
      ['id'],
    );
    this.logger.log(`Abogados processed: ${entities.length}`);
    return new Set(entities.map((abogado) => abogado.id));
  }

  private async importRegistros(
    abogadoIds: Set<string>,
    now: Date,
    invalid: InvalidRecord[],
  ): Promise<number> {
    const base = (process.env.HORAS_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
    let url: string | null = `${base}/registros?pagina=1&tamano=500`;
    let fetched = 0;
    const valid: RegistroTrabajo[] = [];

    while (url) {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`api-horas responded ${res.status} for ${url}`);
      const body = (await res.json()) as {
        datos: Record<string, unknown>[];
        siguiente: string | null;
      };
      for (const raw of body.datos) {
        fetched++;
        const registro = this.buildRegistro(raw, abogadoIds, now);
        if (registro instanceof RegistroTrabajo) {
          valid.push(registro);
        } else {
          invalid.push({
            source: 'registros',
            id: String(raw.id ?? `#${fetched}`),
            reason: registro,
          });
        }
      }
      url = body.siguiente
        ? body.siguiente.startsWith('http')
          ? body.siguiente
          : base + body.siguiente
        : null;
    }

    await this.chunkedUpsert(
      RegistroTrabajo,
      valid,
      [
        'abogadoId',
        'fechaTrabajo',
        'fechaCarga',
        'minutos',
        'facturable',
        'cliente',
        'asunto',
        'updatedAt',
      ],
      ['id'],
    );
    this.logger.log(`Registros fetched: ${fetched}, valid: ${valid.length}`);
    return valid.length;
  }

  private buildRegistro(
    raw: Record<string, unknown>,
    abogadoIds: Set<string>,
    now: Date,
  ): RegistroTrabajo | string {
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id) return 'id vacío';

    const abogadoId = typeof raw.abogado_id === 'string' ? raw.abogado_id.trim() : '';
    if (!abogadoId) return 'abogado_id vacío';
    if (!abogadoIds.has(abogadoId)) return `abogado ${abogadoId} no existe`;

    const fechaTrabajo = typeof raw.fecha_trabajo === 'string' ? raw.fecha_trabajo : '';
    const fechaCarga = typeof raw.fecha_carga === 'string' ? raw.fecha_carga : '';
    if (!DATE_RE.test(fechaTrabajo)) return 'fecha_trabajo inválida';
    if (!DATE_RE.test(fechaCarga)) return 'fecha_carga inválida';

    const minutos = Number(raw.minutos);
    if (!Number.isInteger(minutos) || minutos <= 0) return 'minutos debe ser entero > 0';

    if (typeof raw.facturable !== 'boolean') return 'facturable inválido';

    const cliente = typeof raw.cliente === 'string' ? raw.cliente.trim() : '';
    const asunto = typeof raw.asunto === 'string' ? raw.asunto.trim() : '';
    if (!cliente) return 'cliente vacío';
    if (!asunto) return 'asunto vacío';

    const registro = new RegistroTrabajo();
    registro.id = id;
    registro.abogado = { id: abogadoId } as Abogado;
    registro.fechaTrabajo = fechaTrabajo;
    registro.fechaCarga = fechaCarga;
    registro.minutos = minutos;
    registro.facturable = raw.facturable;
    registro.cliente = cliente;
    registro.asunto = asunto;
    registro.createdAt = now;
    registro.updatedAt = now;
    return registro;
  }

  private async importCostos(
    rows: CostCsvRow[],
    abogadoIds: Set<string>,
    now: Date,
    invalid: InvalidRecord[],
  ): Promise<number> {
    let processed = 0;
    const seen = new Set<string>();
    for (const row of rows) {
      const abogadoId = row.abogado_id?.trim();
      const periodo = row.periodo?.trim();
      const key = `${abogadoId ?? '?'}#${periodo ?? '?'}`;
      if (!abogadoId || !periodo) {
        invalid.push({ source: 'costos', id: key, reason: 'abogado_id o periodo vacío' });
        continue;
      }
      if (seen.has(key)) {
        invalid.push({ source: 'costos', id: key, reason: 'duplicado en la fuente' });
        continue;
      }
      seen.add(key);
      if (!PERIODO_RE.test(periodo)) {
        invalid.push({ source: 'costos', id: key, reason: 'periodo debe ser YYYY-MM' });
        continue;
      }
      if (!abogadoIds.has(abogadoId)) {
        invalid.push({ source: 'costos', id: key, reason: `abogado ${abogadoId} no existe` });
        continue;
      }

      const sueldo = this.parseDecimal(row.sueldo);
      const cargasSociales = this.parseDecimal(row.cargas_sociales);
      const gastosAsignados = this.parseDecimal(row.gastos_asignados);
      const costoTotal = this.parseDecimal(row.costo_total);
      const horas = row.horas_facturadas?.trim()
        ? this.parseDecimal(row.horas_facturadas)
        : null;
      if (
        sueldo === null ||
        cargasSociales === null ||
        gastosAsignados === null ||
        costoTotal === null
      ) {
        invalid.push({ source: 'costos', id: key, reason: 'valor numérico inválido' });
        continue;
      }

      const existing = await this.costosRepo.findOne({
        where: { abogado: { id: abogadoId }, periodo },
      });
      const costo = existing ?? new CostoMensualAbogado();
      costo.abogado = { id: abogadoId } as Abogado;
      costo.periodo = periodo;
      costo.sueldo = sueldo;
      costo.cargasSociales = cargasSociales;
      costo.gastosAsignados = gastosAsignados;
      costo.costoTotal = costoTotal;
      costo.horasFacturadasReportadas = horas;
      costo.createdAt = existing?.createdAt ?? now;
      costo.updatedAt = now;
      await this.costosRepo.save(costo);
      processed++;
    }
    this.logger.log(`Costos processed: ${processed}`);
    return processed;
  }

  // --- helpers --------------------------------------------------------------

  private parseDecimal(value: string | undefined | null): number | null {
    if (value === undefined || value === null || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async chunkedUpsert<T extends { id: string | number }>(
    entity: new () => T,
    rows: T[],
    overwrite: string[],
    conflictTarget: string[],
  ): Promise<void> {
    if (rows.length === 0) return;
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(entity)
        .values(chunk as unknown as QueryDeepPartialEntity<T>[])
        .orUpdate(overwrite, conflictTarget)
        .execute();
    }
  }
}
