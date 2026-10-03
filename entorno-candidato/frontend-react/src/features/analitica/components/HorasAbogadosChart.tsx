import BarChart from "../../../components/charts/BarChart";
import type { RendimientoAbogado } from "../types";

interface HorasAbogadosChartProps {
  datos: RendimientoAbogado[];
}

export default function HorasAbogadosChart({ datos }: HorasAbogadosChartProps) {
  return (
    <BarChart
      title="Horas facturables por abogado"
      seriesName="Horas facturables"
      labels={datos.map((abogado) => abogado.nombre)}
      values={datos.map((abogado) => abogado.horasFacturables)}
    />
  );
}
