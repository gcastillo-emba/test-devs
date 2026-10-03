import { useCallback, useEffect, useState } from "react";
import { adaptarDashboard } from "../api/adaptar";
import { obtenerDashboard } from "../api/analitica";
import { calcularAnalitica } from "../datos/calcular";
import { filasContabilidad } from "../datos/contabilidad";
import { opcionesDesdeCsv, opcionesDesdeDatos, type OpcionesFiltros } from "../datos/opciones";
import { obtenerRegistros, type RegistroTrabajoCrudo } from "../datos/registros";
import type { AnaliticaDatos, FiltrosAnalitica, OrigenDatos } from "../types";

export interface EstadoAnalitica {
  datos: AnaliticaDatos | null;
  opciones: OpcionesFiltros;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

interface ResultadoBackend {
  clave: string;
  datos: AnaliticaDatos | null;
  error: string | null;
}

interface ResultadoRegistros {
  clave: string;
  registros: RegistroTrabajoCrudo[] | null;
  error: string | null;
}

function esAborto(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

function mensajeDeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido al cargar los datos";
}

function hayFiltros(filtros: FiltrosAnalitica): boolean {
  return Boolean(filtros.periodo || filtros.abogadoId || filtros.area || filtros.nivel);
}

export function useAnalitica(origen: OrigenDatos, filtros: FiltrosAnalitica): EstadoAnalitica {
  const [recarga, setRecarga] = useState(0);
  const [resultadoBackend, setResultadoBackend] = useState<ResultadoBackend | null>(null);
  const [resultadoRegistros, setResultadoRegistros] = useState<ResultadoRegistros | null>(null);
  const [opcionesBackend, setOpcionesBackend] = useState<OpcionesFiltros | null>(null);

  const filtrosClave = JSON.stringify(filtros);
  const claveRegistros = `${origen}#${recarga}`;
  const claveBackend = `${origen}#${filtrosClave}#${recarga}`;

  useEffect(() => {
    if (origen !== "backend") return;

    const control = new AbortController();
    let vivo = true;
    const filtrosActuales = JSON.parse(filtrosClave) as FiltrosAnalitica;

    obtenerDashboard(filtrosActuales, control.signal)
      .then((cuerpo) => {
        if (!vivo) return;
        const datos = adaptarDashboard(cuerpo);
        setResultadoBackend({ clave: claveBackend, datos, error: null });
        if (!hayFiltros(filtrosActuales)) {
          setOpcionesBackend(opcionesDesdeDatos(datos));
        }
      })
      .catch((error: unknown) => {
        if (!vivo || esAborto(error)) return;
        setResultadoBackend({ clave: claveBackend, datos: null, error: mensajeDeError(error) });
      });

    return () => {
      vivo = false;
      control.abort();
    };
  }, [origen, claveBackend, filtrosClave]);

  useEffect(() => {
    if (origen !== "directo") return;

    const control = new AbortController();
    let vivo = true;

    obtenerRegistros(control.signal)
      .then((registros) => {
        if (vivo) setResultadoRegistros({ clave: claveRegistros, registros, error: null });
      })
      .catch((error: unknown) => {
        if (!vivo || esAborto(error)) return;
        setResultadoRegistros({ clave: claveRegistros, registros: null, error: mensajeDeError(error) });
      });

    return () => {
      vivo = false;
      control.abort();
    };
  }, [origen, claveRegistros]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const registrosVigentes =
    origen === "directo" && resultadoRegistros !== null && resultadoRegistros.clave === claveRegistros
      ? resultadoRegistros.registros
      : null;
  const backendVigente =
    origen === "backend" && resultadoBackend !== null && resultadoBackend.clave === claveBackend
      ? resultadoBackend
      : null;

  const datos =
    origen === "directo"
      ? registrosVigentes
        ? calcularAnalitica(filasContabilidad, registrosVigentes, filtros)
        : null
      : (backendVigente?.datos ?? null);

  const error =
    origen === "directo"
      ? resultadoRegistros?.clave === claveRegistros
        ? resultadoRegistros.error
        : null
      : (backendVigente?.error ?? null);

  const cargando = datos === null && error === null;

  const opciones: OpcionesFiltros =
    origen === "directo" ? opcionesDesdeCsv() : (opcionesBackend ?? opcionesDesdeCsv());

  return { datos, opciones, cargando, error, recargar };
}
