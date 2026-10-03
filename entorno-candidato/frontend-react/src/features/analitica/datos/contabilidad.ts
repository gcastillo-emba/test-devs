import csvTexto from "../../../../../datos/contabilidad.csv?raw";

export interface FilaContabilidad {
  periodo: string;
  abogadoId: string;
  nombre: string;
  nivel: string;
  area: string;
  costoTotal: number;
  horasFacturadas: number;
}

function dividirFila(linea: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === "," && !entreComillas) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += caracter;
    }
  }
  celdas.push(actual);
  return celdas.map((celda) => celda.trim());
}

function numero(valor: string | undefined): number {
  const parsed = Number(valor ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parsearContabilidad(texto: string): FilaContabilidad[] {
  const lineas = texto.split(/\r?\n/).filter((linea) => linea.length > 0);
  if (lineas.length === 0) return [];
  const columnas = dividirFila(lineas[0]);
  const indice = (nombre: string): number => columnas.indexOf(nombre);

  const filas: FilaContabilidad[] = [];
  for (const linea of lineas.slice(1)) {
    const celdas = dividirFila(linea);
    const valor = (nombre: string): string => celdas[indice(nombre)] ?? "";
    filas.push({
      periodo: valor("periodo"),
      abogadoId: valor("abogado_id"),
      nombre: valor("nombre"),
      nivel: valor("nivel"),
      area: valor("area"),
      costoTotal: numero(valor("costo_total")),
      horasFacturadas: numero(valor("horas_facturadas")),
    });
  }
  return filas;
}

export const filasContabilidad: FilaContabilidad[] = parsearContabilidad(csvTexto);
