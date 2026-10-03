import { useState } from "react";
import SelectorOrigen from "./features/analitica/components/SelectorOrigen";
import FiltrosAnaliticaBar from "./features/analitica/components/FiltrosAnaliticaBar";
import DistribucionTiempoChart from "./features/analitica/components/DistribucionTiempoChart";
import CostosAbogadosChart from "./features/analitica/components/CostosAbogadosChart";
import EvolucionAbogadoChart from "./features/analitica/components/EvolucionAbogadoChart";
import HorasAbogadosChart from "./features/analitica/components/HorasAbogadosChart";
import { useAnalitica } from "./features/analitica/hooks/useAnalitica";
import type { AnaliticaDatos, FiltrosAnalitica, OrigenDatos, Resumen } from "./features/analitica/types";

const tarjeta = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

const bs = (valor: number) =>
  `Bs ${valor.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const horas = (valor: number) => valor.toLocaleString("es-BO", { maximumFractionDigits: 1 });

const porcentaje = (valor: number) => `${valor.toLocaleString("es-BO", { maximumFractionDigits: 1 })} %`;

const descripciones: Record<OrigenDatos, string> = {
  directo: "Fuente: datos/contabilidad.csv + servicio de horas (localhost:8000), agregado en el navegador.",
  backend: "Fuente: API del backend, GET /api/analitica (localhost:3000).",
};

function TarjetaKpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className={tarjeta}>
      <p className="text-sm text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

function ResumenKpis({ resumen }: { resumen: Resumen }) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <TarjetaKpi etiqueta="Total de abogados" valor={String(resumen.totalAbogados)} />
      <TarjetaKpi etiqueta="Total de horas" valor={horas(resumen.horasTotales)} />
      <TarjetaKpi etiqueta="Horas facturables" valor={horas(resumen.horasFacturables)} />
      <TarjetaKpi etiqueta="% facturable" valor={porcentaje(resumen.porcentajeFacturable)} />
      <TarjetaKpi etiqueta="Costo total" valor={bs(resumen.costoTotal)} />
      <TarjetaKpi
        etiqueta="Costo / hora facturable"
        valor={resumen.costoPromedioHoraFacturable === null ? "—" : bs(resumen.costoPromedioHoraFacturable)}
      />
    </section>
  );
}

function Graficos({ datos, conPeriodo }: { datos: AnaliticaDatos; conPeriodo: boolean }) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className={tarjeta}>
        <HorasAbogadosChart datos={datos.rendimiento} />
      </div>
      <div className={tarjeta}>
        <CostosAbogadosChart datos={datos.rendimiento} />
      </div>
      <div className={tarjeta}>
        <DistribucionTiempoChart datos={datos.distribucionTiempo} />
      </div>
      <div className={tarjeta}>
        <EvolucionAbogadoChart datos={datos.evolucion} />
        {conPeriodo && (
          <p className="mt-2 text-center text-xs text-slate-400">
            La evolución siempre muestra el histórico completo: el endpoint no acepta filtro de periodo.
          </p>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [origen, setOrigen] = useState<OrigenDatos>("backend");
  const [filtros, setFiltros] = useState<FiltrosAnalitica>({});
  const { datos, opciones, cargando, error, recargar } = useAnalitica(origen, filtros);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tablero de costos por hora</h1>
          <p className="mt-2 text-sm text-slate-600">{descripciones[origen]}</p>
        </div>
        <SelectorOrigen valor={origen} onCambio={setOrigen} />
      </header>

      <div className="mt-6">
        <FiltrosAnaliticaBar valor={filtros} opciones={opciones} onCambio={setFiltros} />
      </div>

      {cargando && (
        <p role="status" className="mt-10 animate-pulse text-slate-600">
          Cargando datos…
        </p>
      )}

      {!cargando && error && (
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={recargar}
            className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-800 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && datos && (
        <>
          <ResumenKpis resumen={datos.resumen} />
          <Graficos datos={datos} conPeriodo={Boolean(filtros.periodo)} />
        </>
      )}
    </main>
  );
}
