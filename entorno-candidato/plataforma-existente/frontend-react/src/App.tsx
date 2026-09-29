import { useState } from "react";
import Ficha from "./pantallas/Ficha";
import Reporte from "./pantallas/Reporte";

export default function App() {
  const [pantalla, setPantalla] = useState<"reporte" | "ficha">("reporte");
  const pestaña = (activa: boolean) =>
    `px-4 py-2 text-sm ${activa ? "border-b-2 border-slate-900 font-semibold" : "text-slate-500"}`;
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Costos por abogado</h1>
      <nav className="mt-4 flex gap-2 border-b border-slate-200">
        <button className={pestaña(pantalla === "reporte")} onClick={() => setPantalla("reporte")}>Reporte</button>
        <button className={pestaña(pantalla === "ficha")} onClick={() => setPantalla("ficha")}>Ficha</button>
      </nav>
      <section className="mt-6">{pantalla === "reporte" ? <Reporte /> : <Ficha />}</section>
    </main>
  );
}
