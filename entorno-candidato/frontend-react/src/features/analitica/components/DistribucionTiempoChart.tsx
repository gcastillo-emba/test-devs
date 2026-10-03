import DonutChart from "../../../components/charts/DonutChart";
import type { DatoDonut } from "../../../components/charts/types";
import type { DistribucionTiempo } from "../types";

interface DistribucionTiempoChartProps {
  datos: DistribucionTiempo;
}

export default function DistribucionTiempoChart({ datos }: DistribucionTiempoChartProps) {
  const distribucion: DatoDonut[] = [
    { name: "Horas facturables", value: datos.horasFacturables },
    { name: "Horas no facturables", value: datos.horasNoFacturables },
  ];

  return <DonutChart title="Distribución del tiempo" data={distribucion} />;
}
