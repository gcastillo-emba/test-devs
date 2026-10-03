import { useEffect, useState } from 'react';

type Metric = {
  costo_incluido: string | null; costo_contable_disponible: string | null; costo_excluido: string;
  horas_facturables: string | null; costo_por_hora: string | null; estado: string; motivo: string | null;
  cobertura_estado: string; disponibilidad: string; meses_incluidos: string[]; meses_total: number; meses_sin_datos_contables: string[];
  abogados_con_cobertura: number; abogados_total: number; incompleto: boolean;
  exclusiones: { periodo: string; abogado_id?: string; motivo: string; costo_excluido: string | null }[];
};
type Point = Metric & { periodo: string; sueldo?: string | null; costo_total?: string | null; fuera_del_filtro?: boolean };
type Group = Metric & { area: string; nivel: string; serie: Point[] };
type Observation = { tipo: string; origen: string; mensaje: string; efecto: string; abogado_id: string | null; periodo: string | null; referencia?: string; costo_excluido?: string | null; horas_facturables?: string | null };
type Board = {
  inicio: string; fin: string; periodos: string[]; grupos: Group[];
  abogados: { abogado_id: string; nombre: string; cobertura: string }[];
  individual: { abogado_id: string; cobertura: string; serie: Point[] } | null;
  observaciones: Observation[]; ultima_actualizacion: string; registros_api: number;
  opciones: { periodos: string[]; areas: string[]; niveles: string[] };
  cobertura_fuentes: { contabilidad: string[]; horas: string[] }; advertencia_rango: string | null;
};
type Status = { actualizando: boolean; error: string | null; ultima_actualizacion: string | null; con_datos: boolean };
const format = (value: string | null | undefined, unit = '') => value == null ? '—' : `${unit}${Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const key = (g: Group) => `${g.area} · ${g.nivel}`;
const colors = ['#1f5fbf', '#b4600e', '#2f7d5b', '#7a4fb8', '#b8364f', '#1b8197'];
const affectsCalculation = (o: Observation) => /excluye|impide|no calculable|fuera de grupos/i.test(o.efecto);

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || 'No se pudo consultar el backend');
  return body;
}

function Chart({ periods, series, unit }: { periods: string[]; series: { name: string; values: (string | null | undefined)[] }[]; unit: string }) {
  const values = series.flatMap(s => s.values.filter(v => v != null).map(v => Number(v)));
  if (!values.length) return <p className="empty">Sin puntos calculables para esta selección. Los valores ausentes se conservan como huecos.</p>;
  const max = Math.max(...values, 1) * 1.08;
  const x = (i: number) => 85 + (periods.length === 1 ? 375 : i * 750 / (periods.length - 1));
  const y = (value: string) => 245 - Number(value) * 210 / max;
  const step = Math.ceil(periods.length / 8);
  const tick = (i: number) => periods.length < 9 || i === periods.length - 1 || (i % step === 0 && periods.length - 1 - i >= step / 2);
  return <div className="chart"><svg viewBox="0 0 880 285" role="img" aria-label={`Evolución mensual en ${unit}. Los meses no calculables son huecos.`}>
    <text x="75" y="14" textAnchor="end" className="axis-unit">{unit}</text>
    {[0, 1, 2, 3].map(i => <g key={i}><line x1="85" x2="835" y1={245 - i * 70} y2={245 - i * 70} stroke={i === 0 ? '#c9d1db' : '#edf0f4'} /><text x="75" y={249 - i * 70} textAnchor="end">{format(String(max * i / 3))}</text></g>)}
    {periods.map((p, i) => tick(i) && <text key={p} x={x(i)} y="268" textAnchor="middle">{p}</text>)}
    {series.map((s, si) => <g key={s.name}>
      {s.values.map((v, i) => v != null && <g key={i}>
        {i > 0 && s.values[i - 1] != null && <line x1={x(i - 1)} y1={y(s.values[i - 1]!)} x2={x(i)} y2={y(v)} stroke={colors[si % colors.length]} strokeWidth="2" strokeLinecap="round" />}
        <circle cx={x(i)} cy={y(v)} r="3.5" fill={colors[si % colors.length]} stroke="#fff" strokeWidth="1.5"><title>{s.name} · {periods[i]}: {format(v)} {unit}</title></circle>
      </g>)}
    </g>)}
  </svg><div className="legend">{series.map((s, i) => <span key={s.name}><i style={{ background: colors[i % colors.length] }} />{s.name}</span>)}</div><p className="hint">Sin interpolación entre meses ausentes o no calculables. Valores exactos en las tablas de detalle.</p></div>;
}

function Coverage({ metric }: { metric: Metric }) {
  if (metric.abogados_total === 0) return <p className="reason">{metric.motivo}</p>;
  const tone = metric.cobertura_estado === 'PARCIAL' ? 'partial' : metric.cobertura_estado === 'COMPLETO' ? 'complete' : '';
  return <div className="coverage"><div className="badges"><span className={`badge ${tone}`}>{metric.estado}</span>{metric.incompleto && <span className="badge partial outline">INCOMPLETO</span>}</div><p>{metric.meses_incluidos.length} de {metric.meses_total} meses incluidos<br />{metric.abogados_con_cobertura} de {metric.abogados_total} abogados con cobertura</p>{metric.meses_sin_datos_contables.length > 0 && <p>Sin datos contables para este grupo/período: {metric.meses_sin_datos_contables.join(', ')}</p>}{metric.motivo && <p className="reason">No calculable: {metric.motivo}</p>}</div>;
}
function Exclusions({ metric }: { metric: Metric }) {
  return metric.exclusiones.length ? <details className="exclusions"><summary>Exclusiones · <span className="amount">{format(metric.costo_excluido, 'Bs. ')}</span></summary><ul>{metric.exclusiones.map((e, i) => <li key={i}>{e.periodo} {e.abogado_id} · {e.motivo} · Costo excluido: {format(e.costo_excluido, 'Bs. ')}</li>)}</ul><p>Costo contable disponible: {format(metric.costo_contable_disponible, 'Bs. ')}. No se incorpora el costo excluido al cálculo.</p></details> : null;
}
function Multi({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  return <fieldset className="filter-group"><legend className="filter-label">{label}</legend><div className="choices">{options.map(o => <label key={o}><input type="checkbox" checked={selected.includes(o)} onChange={e => onChange(e.target.checked ? [...selected, o] : selected.filter(v => v !== o))} />{o}</label>)}</div><small>Sin selección: todos.</small></fieldset>;
}

export default function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [updating, setUpdating] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [lawyer, setLawyer] = useState('');
  const [comparisons, setComparisons] = useState<string[] | null>(null);
  const [observationLimit, setObservationLimit] = useState(100);
  const [observationType, setObservationType] = useState('');
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try { const value = await request<Status>('/api/estado'); if (active) setStatus(value); }
      catch (e) { if (active) setError(String(e)); }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const requestKey = JSON.stringify([status?.ultima_actualizacion, start, end, areas, levels, lawyer]);
  const loading = Boolean(status?.con_datos && settledQuery !== requestKey);
  useEffect(() => {
    if (!status?.con_datos) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (start) params.set('inicio', start);
    if (end) params.set('fin', end);
    areas.forEach(a => params.append('area', a));
    levels.forEach(l => params.append('nivel', l));
    if (lawyer) params.set('abogado_id', lawyer);
    request<Board>(`/api/tablero?${params}`, { signal: controller.signal }).then(value => {
      setBoard(value); setError('');
      if (lawyer && !value.abogados.some(a => a.abogado_id === lawyer)) setLawyer('');
    }).catch(e => { if (!controller.signal.aborted) setError(String(e)); }).finally(() => { if (!controller.signal.aborted) setSettledQuery(requestKey); });
    return () => controller.abort();
  }, [status?.con_datos, status?.ultima_actualizacion, start, end, areas, levels, lawyer, requestKey]);
  async function update() {
    setUpdating(true);
    try { setStatus(await request<Status>('/api/actualizar', { method: 'POST' })); }
    catch (e) { setError(String(e)); }
    finally { setUpdating(false); }
  }
  const selectedGroups = board?.grupos.filter(g => (comparisons ?? board.grupos.slice(0, 2).map(key)).includes(key(g))) ?? [];
  const observations = board?.observaciones.filter(o => !observationType || o.tipo === observationType) ?? [];
  return <main>
    <header className="masthead">
      <div><p className="eyebrow">CONTABILIDAD + REGISTRO DE HORAS</p><h1>Costos por hora facturable</h1><p className="lede">Comparación por área y nivel · Bolivianos (Bs.)</p></div>
      <div className="sync">
        <div className="meta"><span className="meta-label"><i className={`dot ${updating || status?.actualizando ? 'busy' : status?.error ? 'err' : status?.ultima_actualizacion ? 'ok' : ''}`} />Última actualización exitosa:</span><strong>{status?.ultima_actualizacion ? new Date(status.ultima_actualizacion).toLocaleString('es-BO') : 'Aún no disponible'}</strong>{board && <span>{board.registros_api.toLocaleString('es-BO')} registros API</span>}</div>
        <button disabled={updating || status?.actualizando} onClick={update}>{updating || status?.actualizando ? 'Actualizando…' : 'Actualizar datos'}</button>
      </div>
    </header>
    {(error || status?.error) && <p className="alert" role="alert">{error || status?.error} {status?.con_datos && 'Se conserva la última actualización exitosa.'}</p>}
    {!board && <p className="empty">{status?.actualizando ? 'Descargando y validando todas las páginas de la API…' : 'Sin datos disponibles. Puede reintentar la actualización.'}</p>}
    {board && <>
      <section className="filters" aria-label="Filtros">
        <div className="filters-head"><h2>Filtros</h2><button className="secondary" onClick={() => { setStart(''); setEnd(''); setAreas([]); setLevels([]); setLawyer(''); setComparisons(null); }}>Restablecer filtros</button></div>
        <div className="filter-group"><span className="filter-label">Período</span><div className="range"><label>Desde<input aria-label="Desde" type="month" value={start || board.inicio} onChange={e => setStart(e.target.value)} /></label><label>Hasta<input aria-label="Hasta" type="month" value={end || board.fin} onChange={e => setEnd(e.target.value)} /></label></div></div>
        <Multi label="Áreas" options={board.opciones.areas} selected={areas} onChange={setAreas} /><Multi label="Niveles" options={board.opciones.niveles} selected={levels} onChange={setLevels} />
      </section>
      {loading && <p className="loading" role="status">Aplicando filtros…</p>}
      {board.advertencia_rango && <p className="notice">{board.advertencia_rango} Los meses sin cobertura se excluyen simétricamente del cálculo y conservan sus datos contables disponibles.</p>}
      <details className="source"><summary>Cobertura temporal de las fuentes</summary><p>Contabilidad: {board.cobertura_fuentes.contabilidad.join(', ')}</p><p>API de horas (antes de filtrar): {board.cobertura_fuentes.horas.join(', ')}</p></details>
      <section><div className="section-head"><div><h2>Área y nivel</h2><p className="hint">Período aplicado: {board.inicio} a {board.fin}. Costo por hora = suma de costos incluidos / suma de horas facturables incluidas. Las clasificaciones corresponden a cada mes.</p></div></div>
        {!board.grupos.length ? <p className="empty">No hay grupos para los filtros seleccionados.</p> : <div className="table-wrap"><table className="groups"><thead><tr><th>Área / nivel</th><th className="num">Costo incluido <span className="unit">· Bs.</span></th><th className="num">Horas facturables <span className="unit">· h</span></th><th className="num ratio">Costo por hora <span className="unit">· Bs./h</span></th><th>Estado y cobertura</th><th>Calidad / costo excluido</th></tr></thead><tbody>{board.grupos.map(g => <tr key={key(g)}><th>{g.area}<small>{g.nivel}</small></th><td className="num">{format(g.costo_incluido)}</td><td className="num">{format(g.horas_facturables)}</td><td className="num ratio">{g.costo_por_hora == null ? <span className="na">No calculable</span> : format(g.costo_por_hora)}</td><td><Coverage metric={g} /></td><td><Exclusions metric={g} />{!g.exclusiones.length && <span className="muted">Sin exclusiones</span>}</td></tr>)}</tbody></table></div>}
      </section>
      <section><div className="section-head"><div><h2>Evolución mensual comparativa</h2><p className="hint">Costo por hora · Bs./h</p></div></div><fieldset className="series-picker"><legend className="filter-label">Series comparadas</legend><div className="choices">{board.grupos.map(g => <label key={key(g)}><input type="checkbox" checked={selectedGroups.some(s => key(s) === key(g))} onChange={e => setComparisons(e.target.checked ? [...selectedGroups.map(key), key(g)] : selectedGroups.filter(s => key(s) !== key(g)).map(key))} />{key(g)}</label>)}</div></fieldset><Chart periods={board.periodos} series={selectedGroups.map(g => ({ name: key(g), values: g.serie.map(p => p.costo_por_hora) }))} unit="Bs./h" />
        <details className="disclosure"><summary>Detalle mensual de las series seleccionadas</summary><div className="table-wrap"><table><thead><tr><th>Grupo / mes</th><th className="num">Costo incluido <span className="unit">· Bs.</span></th><th className="num">Costo contable disponible <span className="unit">· Bs.</span></th><th className="num">Horas <span className="unit">· h</span></th><th className="num ratio">Costo/hora <span className="unit">· Bs./h</span></th><th>Estado</th><th>Exclusiones</th></tr></thead><tbody>{selectedGroups.flatMap(g => g.serie.map(p => <tr key={`${key(g)}-${p.periodo}`}><th>{key(g)}<small>{p.periodo}</small></th><td className="num">{format(p.costo_incluido)}</td><td className="num">{format(p.costo_contable_disponible)}</td><td className="num">{format(p.horas_facturables)}</td><td className="num ratio">{format(p.costo_por_hora)}</td><td><Coverage metric={p} /></td><td><Exclusions metric={p} /></td></tr>))}</tbody></table></div></details>
      </section>
      <section><div className="section-head"><div><h2>Exploración individual</h2></div><label className="field">Abogado de la selección<select value={lawyer} onChange={e => setLawyer(e.target.value)}><option value="">Seleccionar abogado</option>{board.abogados.map(a => <option key={a.abogado_id} value={a.abogado_id}>{a.nombre} · {a.abogado_id}</option>)}</select></label></div>
        {board.individual && <><p className="notice">{board.individual.cobertura}. Los costos y sueldos conocidos permanecen visibles. Los meses fuera de la clasificación seleccionada se indican en la tabla.</p><div className="individual-charts">{([{ field: 'costo_total', label: 'Costo total', unit: 'Bs.' }, { field: 'sueldo', label: 'Sueldo', unit: 'Bs.' }, { field: 'horas_facturables', label: 'Horas facturables', unit: 'h' }, { field: 'costo_por_hora', label: 'Costo por hora', unit: 'Bs./h' }] as const).map(metric => <div key={metric.field} className="mini"><h3>{metric.label} <span className="unit">{metric.unit}</span></h3><Chart periods={board.periodos} series={[{ name: metric.label, values: board.individual!.serie.map(p => p[metric.field]) }]} unit={metric.unit} /></div>)}</div><div className="table-wrap"><table><thead><tr><th>Mes</th><th className="num">Costo total <span className="unit">· Bs.</span></th><th className="num">Sueldo <span className="unit">· Bs.</span></th><th className="num">Horas facturables <span className="unit">· h</span></th><th className="num ratio">Costo por hora <span className="unit">· Bs./h</span></th><th>Disponibilidad</th></tr></thead><tbody>{board.individual.serie.map(p => <tr key={p.periodo}><th>{p.periodo}</th><td className="num">{format(p.costo_total)}</td><td className="num">{format(p.sueldo)}</td><td className="num">{format(p.horas_facturables)}</td><td className="num ratio">{format(p.costo_por_hora)}</td><td>{p.fuera_del_filtro ? <span className="muted">Fuera del filtro por clasificación mensual</span> : <Coverage metric={p} />}</td></tr>)}</tbody></table></div></>}
      </section>
      <section><div className="section-head"><div><h2>Observaciones de calidad de datos <span className="count">{board.observaciones.length}</span></h2><p className="hint">Observaciones de la selección y registros sin cruce. Las incidencias globales que afectan la confiabilidad permanecen visibles.</p></div><label className="field">Tipo de observación<select value={observationType} onChange={e => { setObservationType(e.target.value); setObservationLimit(100); }}><option value="">Todos los tipos</option>{[...new Set(board.observaciones.map(o => o.tipo))].sort().map(t => <option key={t}>{t}</option>)}</select></label></div>
        <div className="obs-summary">{[...board.observaciones.reduce((m, o) => m.set(o.tipo, { n: (m.get(o.tipo)?.n ?? 0) + 1, impact: m.get(o.tipo)?.impact || affectsCalculation(o) }), new Map<string, { n: number; impact: boolean }>())].map(([tipo, v]) => <span key={tipo} className={`obs-chip ${v.impact ? 'impact' : ''}`}><i className="tone" />{tipo}<b>{v.n.toLocaleString('es-BO')}</b></span>)}<span className="obs-legend"><i className="tone impact" />Afecta el cálculo<i className="tone" />Contextual</span></div>
        <div className="observations">{observations.slice(0, observationLimit).map((o, i) => <details key={i} className={affectsCalculation(o) ? 'impact' : ''}><summary><i className="tone" /><strong>{o.tipo}</strong><span className="obs-scope">{o.periodo || 'Alcance temporal global'} · {o.abogado_id || 'Alcance global'}</span><span className="obs-msg">{o.mensaje}</span></summary><p>Origen: {o.origen} · Referencia: {o.referencia || 'Agregada'}<br />Efecto: {o.efecto}</p>{o.costo_excluido != null && <p>Costo excluido: {format(o.costo_excluido, 'Bs. ')}</p>}{o.horas_facturables != null && <p>Horas facturables disponibles: {format(o.horas_facturables)} h</p>}</details>)}</div>{observations.length > observationLimit && <button className="secondary" onClick={() => setObservationLimit(v => v + 100)}>Mostrar 100 más ({observations.length - observationLimit} pendientes)</button>}{!observations.length && <p className="empty">Sin observaciones para esta selección.</p>}</section>
      <footer>Moneda de presentación: Bs., decisión de esta entrega. No se aplica conversión. «—» indica dato ausente o no calculable; cero indica un valor registrado con cobertura. Las horas facturadas contables no sustituyen las horas facturables de la API.</footer>
    </>}
  </main>;
}
