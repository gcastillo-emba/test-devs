import { useEffect, useState } from "react";

interface Abogado {
  id: string;
  nombre: string;
  nivel: string;
}

export default function Ficha() {
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [seleccionado, setSeleccionado] = useState("A-01");
  const [costoHora, setCostoHora] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/abogados").then((r) => r.json()).then(setAbogados);
  }, []);

  useEffect(() => {
    setError(null);
    fetch(`/api/abogados/${seleccionado}/costo-hora`)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
        return respuesta.json();
      })
      .then((datos) => setCostoHora(datos.costoHora))
      .catch((e: Error) => {
        setCostoHora(null);
        setError(e.message);
      });
  }, [seleccionado]);

  return (
    <div>
      <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={seleccionado}
              onChange={(e) => setSeleccionado(e.target.value)}>
        {abogados.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.nivel}</option>)}
      </select>
      {error && <p className="mt-4 text-sm text-red-700">No se pudo calcular el costo. {error}</p>}
      {costoHora !== null && (
        <div className="mt-6 rounded border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Costo por hora</p>
          <p className="text-2xl font-semibold text-slate-900">Bs {costoHora.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
