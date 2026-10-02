"""Validación e integración de las dos fuentes; importes decimales sin redondeo previo."""
import csv
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

D = Decimal
FIELDS = {'periodo', 'abogado_id', 'nombre', 'nivel', 'area', 'sueldo', 'cargas_sociales', 'gastos_asignados', 'costo_total', 'horas_facturadas'}


def money(value):
    return None if value is None else str(value.quantize(D('.01'), rounding=ROUND_HALF_UP))


def month(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}', value):
        return None
    try:
        date.fromisoformat(value + '-01')
        return value
    except ValueError:
        return None


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def identifier(value):
    return value.strip() if isinstance(value, str) and value.strip() else None


def number(value):
    try:
        if value is None or isinstance(value, bool) or not str(value).strip():
            return None
        result = D(str(value))
        return result if result.is_finite() else None
    except InvalidOperation:
        return None


def months_between(start, end):
    result = []
    y, m = map(int, start.split('-'))
    while f'{y:04d}-{m:02d}' <= end:
        result.append(f'{y:04d}-{m:02d}')
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return result


@dataclass
class Snapshot:
    accounting: dict = field(default_factory=dict)
    classifications: dict = field(default_factory=lambda: defaultdict(set))
    minutes: dict = field(default_factory=lambda: defaultdict(int))
    work_keys: set = field(default_factory=set)
    covered_months: set = field(default_factory=set)
    covered_lawyers: set = field(default_factory=set)
    invalid: list = field(default_factory=list)
    observations: list = field(default_factory=list)
    updated_at: str = ''
    total_records: int = 0
    periods: list = field(default_factory=list)

    def observe(self, kind, source, message, lawyer=None, period=None, reference=None, efecto='Informativo', **extra):
        self.observations.append(dict(tipo=kind, origen=source, mensaje=message, abogado_id=lawyer, periodo=period, referencia=reference, efecto=efecto, **extra))

    def invalidate(self, lawyer, period, reason):
        self.invalid.append((lawyer, period, reason))

    def problems(self, lawyers, period):
        return sorted({reason for lawyer, p, reason in self.invalid if (p is None or p == period) and (lawyer is None or lawyer in lawyers)})


def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle, strict=True)
        if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames) or not FIELDS.issubset(reader.fieldnames):
            raise ValueError('CSV incompatible: faltan columnas obligatorias')
        rows = list(reader)
        if any(None in row for row in rows):
            raise ValueError('CSV incompatible: filas con columnas adicionales')
        return rows


def build_snapshot(rows, records):
    s = Snapshot(total_records=len(records))
    grouped = defaultdict(list)
    for index, raw in enumerate(rows, 2):
        p, aid = month(raw.get('periodo')), identifier(raw.get('abogado_id'))
        ref = f'Fila {index}'
        if not p or not aid:
            s.observe('DATO INVÁLIDO', 'CSV', 'Período o identificador inválido; cobertura no verificable para su alcance.', aid, p, ref, 'Excluye períodos afectados')
            s.invalidate(aid, p, 'CSV: período o identificador inválido')
            continue
        area = identifier(raw.get('area')) or 'Sin área informada'
        level = identifier(raw.get('nivel')) or 'Sin nivel informado'
        s.classifications[(aid, p)].add((area, level))
        for field_name, label in [('area', area), ('nivel', level)]:
            if not identifier(raw.get(field_name)):
                s.observe('CLASIFICACIÓN AUSENTE', 'CSV', label, aid, p, ref, 'Conserva valores válidos')
        row = dict(abogado_id=aid, periodo=p, nombre=identifier(raw.get('nombre')) or aid, area=area, nivel=level)
        for field_name in ['sueldo', 'cargas_sociales', 'gastos_asignados', 'costo_total', 'horas_facturadas']:
            row[field_name] = number(raw.get(field_name))
            if row[field_name] is None or row[field_name] < 0:
                reason = f'CSV: {field_name} inválido o negativo'
                s.invalidate(aid, p, reason)
                s.observe('DATO INVÁLIDO', 'CSV', reason, aid, p, ref, 'Excluye el mes del cálculo de su población')
        components = [row[k] for k in ['sueldo', 'cargas_sociales', 'gastos_asignados']]
        if all(x is not None for x in components) and row['costo_total'] is not None and sum(components, D(0)) != row['costo_total']:
            reason = 'Costo total distinto de sueldo + cargas sociales + gastos asignados'
            s.invalidate(aid, p, reason)
            s.observe('INCOMPATIBILIDAD CONTABLE', 'CSV', reason, aid, p, ref, 'Excluye el mes del cálculo de su población')
        grouped[(aid, p)].append((row, ref))
    for key, entries in grouped.items():
        if len(entries) > 1:
            s.invalidate(*key, 'Duplicado de abogado y mes en CSV')
            s.observe('DUPLICADO', 'CSV', 'No se elige ni se suma ninguna fila duplicada.', *key, ', '.join(ref for _, ref in entries), 'Excluye el mes del cálculo de su población')
            s.accounting[key] = dict(abogado_id=key[0], periodo=key[1], nombre=key[0], sueldo=None, costo_total=None)
        else:
            s.accounting[key] = entries[0][0]
    ids = defaultdict(list)
    late = defaultdict(lambda: [0, 0, 0])
    for index, raw in enumerate(records, 1):
        if not isinstance(raw, dict):
            s.invalidate(None, None, 'Registro API sin estructura válida: cobertura no verificable')
            s.observe('DATO INVÁLIDO', 'API', 'Registro sin estructura válida', reference=f'Registro {index}', efecto='Impide garantizar los ratios')
            continue
        aid = identifier(raw.get('abogado_id'))
        work = day(raw.get('fecha_trabajo'))
        p = work.strftime('%Y-%m') if work else None
        rid = identifier(raw.get('id'))
        ref = rid or f'Registro {index}'
        if p:
            s.covered_months.add(p)
        if aid:
            s.covered_lawyers.add(aid)
        if aid and p:
            s.work_keys.add((aid, p))
        if rid:
            ids[rid].append((aid, p))
        errors = []
        if not aid: errors.append('identificador de abogado inválido')
        if not rid: errors.append('id inválido')
        if not work: errors.append('fecha_trabajo inválida')
        billable = raw.get('facturable')
        if type(billable) is not bool: errors.append('facturable debe ser booleano')
        minutes = raw.get('minutos')
        valid_minutes = (type(minutes) is int and minutes > 0) or (isinstance(minutes, str) and re.fullmatch(r'\+?\d+', minutes) is not None and int(minutes) > 0)
        if not valid_minutes: errors.append('minutos debe ser entero positivo')
        if errors:
            reason = 'API: ' + '; '.join(errors)
            s.invalidate(aid, p, reason)
            s.observe('DATO INVÁLIDO', 'API', reason, aid, p, ref, 'Excluye períodos afectados; alcance desconocido impide garantizar cobertura')
        elif billable:
            s.minutes[(aid, p)] += int(minutes)
        loaded = day(raw.get('fecha_carga'))
        if not loaded:
            s.observe('FECHA DE CARGA INVÁLIDA', 'API', 'No se puede evaluar el retraso de carga.', aid, p, ref, 'No invalida por sí sola las horas')
        elif work and loaded < work:
            s.observe('ANOMALÍA DE FECHAS', 'API', 'Carga anterior al trabajo.', aid, p, ref, 'Mantiene imputación por fecha_trabajo')
        elif work and loaded > work:
            info = late[(aid, p)]
            info[0] += 1
            info[1] = max(info[1], (loaded - work).days)
            info[2] += loaded.strftime('%Y-%m') != p
    for rid, keys in ids.items():
        if len(keys) > 1:
            for aid, p in set(keys):
                s.invalidate(aid, p, 'Duplicado de id en API')
                s.observe('DUPLICADO', 'API', f'{len(keys)} apariciones del id; agregado no confiable.', aid, p, rid, 'Excluye el mes del cálculo de su población')
    for (aid, p), (count, delay, cross) in late.items():
        s.observe('CARGA POSTERIOR', 'API', f'{count} registros; retraso máximo {delay} días; {cross} cruces de mes.', aid, p, efecto='Informativo; imputación por fecha_trabajo')
    for aid, p in sorted(s.work_keys - s.accounting.keys()):
        s.observe('SIN CONTRAPARTE CONTABLE', 'API', 'Registro sin contabilidad; no se infieren costos ni clasificación.', aid, p, efecto='Fuera de grupos; costos ausentes', horas_facturables=None if s.problems({aid}, p) else money(D(s.minutes.get((aid, p), 0)) / 60))
    for (aid, p), row in s.accounting.items():
        if aid not in s.covered_lawyers:
            s.observe('SIN COBERTURA DE HORAS', 'CSV / API', 'Abogado sin ningún registro en toda la API.', aid, p, efecto='Excluye simétricamente costo y horas del grupo', costo_excluido=money(row['costo_total']))
        elif p in s.covered_months and not s.problems({aid}, p) and s.minutes.get((aid, p), 0) == 0:
            s.observe('CERO HORAS FACTURABLES', 'API', 'Cero horas facturables registradas; no prueba ausencia de trabajo real.', aid, p, efecto='Conserva costo; ratio individual no calculable')
    for p in sorted({p for _, p in s.accounting} - s.covered_months):
        s.observe('INCOMPLETO', 'CSV / API', 'Falta de cobertura de horas', period=p, efecto='Horas ausentes; excluye costo y horas del mes de los rangos')
    s.periods = sorted({p for _, p in s.accounting} | s.covered_months)
    if not s.periods:
        raise ValueError('Las fuentes no contienen períodos identificables')
    s.updated_at = datetime.now(timezone.utc).isoformat()
    return s


def aggregate(s, keys, periods):
    members = {aid for aid, _ in keys}
    covered = members & s.covered_lawyers
    included_cost = D(0)
    included_minutes = 0
    included_periods = []
    periods_without_accounting = []
    exclusions = []
    known_costs = [s.accounting[key]['costo_total'] for key in keys if s.accounting[key]['costo_total'] is not None]
    known_cost = sum(known_costs, D(0)) if known_costs else None
    excluded_cost = D(0)
    for p in periods:
        all_keys = {key for key in keys if key[1] == p}
        if not all_keys:
            periods_without_accounting.append(p)
            continue
        eligible = {key for key in all_keys if key[0] in covered}
        no_coverage = all_keys - eligible
        for key in sorted(no_coverage):
            cost = s.accounting[key]['costo_total']
            if cost is not None: excluded_cost += cost
            exclusions.append(dict(periodo=p, abogado_id=key[0], motivo='SIN COBERTURA DE HORAS', costo_excluido=money(cost)))
        reasons = []
        if not eligible: reasons.append('Sin cobertura de horas de los miembros')
        if p not in s.covered_months: reasons.append('Falta de cobertura de horas')
        reasons += s.problems({aid for aid, _ in eligible}, p)
        if reasons:
            cost = sum((s.accounting[key]['costo_total'] for key in eligible if s.accounting[key]['costo_total'] is not None), D(0))
            excluded_cost += cost
            exclusions.append(dict(periodo=p, motivo='; '.join(reasons), costo_excluido=money(cost)))
            continue
        included_periods.append(p)
        included_cost += sum((s.accounting[key]['costo_total'] for key in eligible), D(0))
        included_minutes += sum(s.minutes.get(key, 0) for key in eligible)
    hours = D(included_minutes) / 60
    ratio = included_cost * 60 / D(included_minutes) if included_minutes else None
    partial = len(covered) < len(members) or len(included_periods) < len(periods)
    reason = None
    if not members:
        reason = 'Sin datos contables para este grupo/período'
    elif not covered:
        reason = 'Sin cobertura de horas de los miembros'
    elif not included_periods:
        reason = '; '.join(sorted({item['motivo'] for item in exclusions})) or 'Sin períodos elegibles'
    elif ratio is None:
        reason = 'Cero horas facturables registradas'
    return dict(costo_incluido=money(included_cost) if included_periods else None,
                costo_contable_disponible=money(known_cost) if keys else None,
                costo_excluido=money(excluded_cost), horas_facturables=money(hours) if included_periods else None,
                costo_por_hora=money(ratio), estado='PARCIAL' if partial else ('COMPLETO' if ratio is not None else 'NO CALCULABLE'),
                cobertura_estado='PARCIAL' if partial else 'COMPLETO', disponibilidad='CALCULABLE' if ratio is not None else 'NO CALCULABLE', motivo=reason,
                meses_incluidos=included_periods, meses_total=len(periods), abogados_con_cobertura=len(covered), abogados_total=len(members), exclusiones=exclusions,
                meses_sin_datos_contables=periods_without_accounting,
                incompleto=bool(keys) and len(periods) == 1 and periods[0] not in s.covered_months)


def query(s, start=None, end=None, areas=None, levels=None, lawyer=None):
    start, end = start or s.periods[0], end or s.periods[-1]
    if not month(start) or not month(end) or start > end:
        raise ValueError('Rango inválido: use meses YYYY-MM con inicio anterior o igual al fin')
    periods = months_between(start, end)
    groups = defaultdict(set)
    for key, classes in s.classifications.items():
        if key[1] not in periods: continue
        for area, level in classes:
            if (not areas or area in areas) and (not levels or level in levels):
                groups[(area, level)].add(key)
    results = []
    selected_keys = set()
    for (area, level), keys in sorted(groups.items()):
        selected_keys |= keys
        result = dict(area=area, nivel=level, **aggregate(s, keys, periods))
        result['serie'] = [dict(periodo=p, **aggregate(s, {k for k in keys if k[1] == p}, [p])) for p in periods]
        results.append(result)
    selected_lawyers = {aid for aid, _ in selected_keys}
    lawyers = [dict(abogado_id=aid, nombre=next((row['nombre'] for key, row in s.accounting.items() if key[0] == aid), aid), cobertura='CON COBERTURA' if aid in s.covered_lawyers else 'SIN COBERTURA DE HORAS') for aid in sorted(selected_lawyers)]
    observations = [o for o in s.observations if (o['periodo'] is None or o['periodo'] in periods) and (o['abogado_id'] is None or (o['abogado_id'], o['periodo']) in selected_keys or (o['periodo'] is None and o['abogado_id'] in selected_lawyers) or o['tipo'] == 'SIN CONTRAPARTE CONTABLE' or (o['tipo'] == 'DATO INVÁLIDO' and (o['periodo'] is None or o['abogado_id'] is None)))]
    priority = {'DATO INVÁLIDO': 0, 'DUPLICADO': 0, 'INCOMPATIBILIDAD CONTABLE': 0, 'INCOMPLETO': 1, 'CLASIFICACIÓN AUSENTE': 2, 'SIN COBERTURA DE HORAS': 3, 'CARGA POSTERIOR': 9}
    observations.sort(key=lambda o: (priority.get(o['tipo'], 4), o['periodo'] or '', o['abogado_id'] or ''))
    individual = None
    if lawyer and lawyer in selected_lawyers:
        series = []
        for p in periods:
            key = (lawyer, p)
            visible = key in selected_keys
            row = s.accounting.get(key) if visible else None
            point = aggregate(s, {key} if row else set(), [p])
            if key not in s.accounting:
                point['motivo'] = 'Sin datos contables para este período'
            series.append(dict(periodo=p, sueldo=money(row['sueldo']) if row else None, costo_total=money(row['costo_total']) if row else None, fuera_del_filtro=key in s.accounting and not visible, **point))
        individual = dict(abogado_id=lawyer, cobertura='CON COBERTURA' if lawyer in s.covered_lawyers else 'SIN COBERTURA DE HORAS', serie=series)
    classifications = {c for classes in s.classifications.values() for c in classes}
    return dict(inicio=start, fin=end, periodos=periods, grupos=results, abogados=lawyers, individual=individual, observaciones=observations,
                ultima_actualizacion=s.updated_at, registros_api=s.total_records,
                opciones=dict(periodos=s.periods, areas=sorted({a for a, _ in classifications}), niveles=sorted({n for _, n in classifications})),
                cobertura_fuentes=dict(contabilidad=sorted({p for _, p in s.accounting}), horas=sorted(s.covered_months)),
                advertencia_rango='El rango excede la presencia temporal de alguna fuente.' if any(p not in {p for _, p in s.accounting} or p not in s.covered_months for p in periods) else None)
