import LineChart from "../../../components/charts/LineChart";
import type { EvolucionMensual } from "../types";

interface EvolucionAbogadoChartProps {
  datos: EvolucionMensual[];
}

export default function EvolucionAbogadoChart({ datos }: EvolucionAbogadoChartProps) {
  return (
    <LineChart
      title="Evolución mensual de horas"
      labels={datos.map((mes) => mes.mes)}
      series={[
        { name: "Horas totales", data: datos.map((mes) => mes.horasTotales) },
        { name: "Horas facturables", data: datos.map((mes) => mes.horasFacturables) },
      ]}
    />
  );
}
