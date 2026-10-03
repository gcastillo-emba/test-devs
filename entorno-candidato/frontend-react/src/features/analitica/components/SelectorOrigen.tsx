import type { OrigenDatos } from "../types";

interface SelectorOrigenProps {
  valor: OrigenDatos;
  onCambio: (origen: OrigenDatos) => void;
}

const opciones: { id: OrigenDatos; etiqueta: string }[] = [
  { id: "directo", etiqueta: "Directo (CSV + servicio)" },
  { id: "backend", etiqueta: "Backend" },
];

export default function SelectorOrigen({ valor, onCambio }: SelectorOrigenProps) {
  return (
    <div
      role="group"
      aria-label="Origen de los datos"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          aria-pressed={valor === opcion.id}
          onClick={() => onCambio(opcion.id)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            valor === opcion.id
              ? "bg-slate-900 font-medium text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}
