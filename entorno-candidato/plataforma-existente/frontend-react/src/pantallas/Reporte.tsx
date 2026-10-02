import { useEffect, useState } from "react";

interface Fila {
  abogadoId: string;
  nombre: string;
  nivel: string;
  costoTotal: number;
  horasRegistradas: number;
  costoHora: number | null;
}

const bs = (valor: number | null) => valor === null ? "No calculable" : `Bs ${valor.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reporte() {
  const [incluirSocios, setIncluirSocios] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/reportes/costos?incluirSocios=${incluirSocios}`)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
        return respuesta.json();
      })
      .then((datos) => setFilas(datos.filas))
      .catch((e: Error) => {
        setFilas([]);
        setError(e.message);
      });
  }, [incluirSocios]);

  const suma = filas.reduce<number | null>((total, f) =>
    total === null || f.costoHora === null ? null : total + f.costoHora, 0);
  const promedio = suma === null ? null : filas.length ? suma / filas.length : 0;

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={incluirSocios} onChange={(e) => setIncluirSocios(e.target.checked)} />
        Incluir socios
      </label>
      {error && <p className="mt-4 text-sm text-red-700">No se pudo generar el reporte. {error}</p>}
      <div className="mt-6 rounded border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Costo promedio por hora de la firma</p>
        <p className="text-2xl font-semibold text-slate-900">{bs(promedio)}</p>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr><th className="py-2">Abogado</th><th>Nivel</th><th className="text-right">Horas</th><th className="text-right">Costo por hora</th></tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.abogadoId} className="border-b border-slate-100">
              <td className="py-2">{f.nombre}</td>
              <td>{f.nivel}</td>
              <td className="text-right">{f.horasRegistradas}</td>
              <td className="text-right">{f.costoHora === null ? "No calculable: sin horas registradas" : bs(f.costoHora)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
