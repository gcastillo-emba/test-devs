export interface RegistroTrabajoCrudo {
  id: string;
  abogadoId: string;
  fechaTrabajo: string;
  minutos: number;
  facturable: boolean;
}

interface RespuestaPagina {
  datos: unknown[];
  pagina: number;
  tamano: number;
  total: number;
  siguiente: string | null;
}

const TAMANO_PAGINA = 500;
const CONCURRENCIA = 8;
const BASE = "/api-horas";

function urlDePagina(pagina: number): string {
  return `${BASE}/registros?pagina=${pagina}&tamano=${TAMANO_PAGINA}`;
}

async function leerPagina(pagina: number, signal: AbortSignal): Promise<RespuestaPagina> {
  const respuesta = await fetch(urlDePagina(pagina), { signal });
  if (!respuesta.ok) {
    throw new Error(`El registro de horas respondió HTTP ${respuesta.status} en la página ${pagina}`);
  }
  const cuerpo = (await respuesta.json()) as RespuestaPagina;
  if (!Array.isArray(cuerpo.datos)) {
    throw new Error("Respuesta inesperada del registro de horas");
  }
  return cuerpo;
}

function convertir(raw: Record<string, unknown>): RegistroTrabajoCrudo | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const abogadoId = typeof raw.abogado_id === "string" ? raw.abogado_id : "";
  const fechaTrabajo = typeof raw.fecha_trabajo === "string" ? raw.fecha_trabajo : "";
  const minutos = Number(raw.minutos);
  if (!id || !abogadoId || !fechaTrabajo) return null;
  if (!Number.isInteger(minutos) || minutos <= 0) return null;
  if (typeof raw.facturable !== "boolean") return null;
  return { id, abogadoId, fechaTrabajo, minutos, facturable: raw.facturable };
}

async function enParalelo<T>(tareas: (() => Promise<T>)[], limite: number): Promise<T[]> {
  const resultados: T[] = new Array(tareas.length);
  let siguiente = 0;
  const trabajador = async (): Promise<void> => {
    while (siguiente < tareas.length) {
      const indice = siguiente;
      siguiente++;
      resultados[indice] = await tareas[indice]();
    }
  };
  const cantidad = Math.min(limite, tareas.length);
  await Promise.all(Array.from({ length: cantidad }, trabajador));
  return resultados;
}

export async function obtenerRegistros(signal: AbortSignal): Promise<RegistroTrabajoCrudo[]> {
  const primera = await leerPagina(1, signal);
  const total = primera.total;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  const restantes: (() => Promise<RespuestaPagina>)[] = [];
  for (let pagina = 2; pagina <= paginas; pagina++) {
    restantes.push(() => leerPagina(pagina, signal));
  }
  const paginasRestantes = await enParalelo(restantes, CONCURRENCIA);

  const crudos: Record<string, unknown>[] = [];
  for (const pagina of [primera, ...paginasRestantes]) {
    for (const dato of pagina.datos) {
      crudos.push(dato as Record<string, unknown>);
    }
  }
  return crudos.map(convertir).filter((registro): registro is RegistroTrabajoCrudo => registro !== null);
}
