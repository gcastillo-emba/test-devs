import BarChart from "../../../components/charts/BarChart";
import type { RendimientoAbogado } from "../types";

interface CostosAbogadosChartProps {
  datos: RendimientoAbogado[];
}

export default function CostosAbogadosChart({ datos }: CostosAbogadosChartProps) {
  return (
    <BarChart
      title="Costo total por abogado (Bs)"
      seriesName="Costo total"
      labels={datos.map((abogado) => abogado.nombre)}
      values={datos.map((abogado) => abogado.costoTotal)}
    />
  );
}
