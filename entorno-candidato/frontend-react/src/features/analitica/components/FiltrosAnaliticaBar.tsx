import type { FiltrosAnalitica } from "../types";
import type { OpcionesFiltros } from "../datos/opciones";

interface FiltrosAnaliticaBarProps {
  valor: FiltrosAnalitica;
  opciones: OpcionesFiltros;
  onCambio: (filtros: FiltrosAnalitica) => void;
}

const estiloSelect =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none";

interface CampoProps {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  opciones: { valor: string; etiqueta: string }[];
  disabled?: boolean;
}

function Campo({ etiqueta, valor, onChange, placeholder, opciones, disabled }: CampoProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {etiqueta}
      <select
        className={estiloSelect}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onChange(evento.target.value)}
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FiltrosAnaliticaBar({ valor, opciones, onCambio }: FiltrosAnaliticaBarProps) {
  const hayFiltros = Boolean(valor.periodo || valor.abogadoId || valor.area || valor.nivel);

  const actualizar = (campo: keyof FiltrosAnalitica) => (nuevo: string) => {
    onCambio({ ...valor, [campo]: nuevo || undefined });
  };

  const abogadoSeleccionado = opciones.abogados.find((abogado) => abogado.abogadoId === valor.abogadoId);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Campo
        etiqueta="Periodo"
        valor={valor.periodo ?? ""}
        onChange={actualizar("periodo")}
        placeholder="Todo el histórico"
        opciones={opciones.periodos.map((periodo) => ({ valor: periodo, etiqueta: periodo }))}
      />
      <Campo
        etiqueta="Abogado"
        valor={valor.abogadoId ?? ""}
        onChange={actualizar("abogadoId")}
        placeholder="Todos los abogados"
        opciones={opciones.abogados.map((abogado) => ({
          valor: abogado.abogadoId,
          etiqueta: abogado.nombre,
        }))}
      />
      <Campo
        etiqueta="Área"
        valor={valor.area ?? ""}
        onChange={actualizar("area")}
        placeholder="Todas las áreas"
        opciones={opciones.areas.map((area) => ({ valor: area, etiqueta: area }))}
      />
      <Campo
        etiqueta="Nivel"
        valor={valor.nivel ?? ""}
        onChange={actualizar("nivel")}
        placeholder="Todos los niveles"
        opciones={opciones.niveles.map((nivel) => ({ valor: nivel, etiqueta: nivel }))}
      />
      {hayFiltros && (
        <button
          type="button"
          onClick={() => onCambio({})}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      )}
      {abogadoSeleccionado && (
        <p className="ml-auto text-xs text-slate-400">
          {abogadoSeleccionado.abogadoId} · {abogadoSeleccionado.nivel || "sin nivel"} ·{" "}
          {abogadoSeleccionado.area || "sin área"}
        </p>
      )}
    </div>
  );
}
