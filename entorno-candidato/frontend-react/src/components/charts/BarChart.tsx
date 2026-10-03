import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart";
import type { BarChartProps } from "./types";

export default function BarChart({ labels, values, title, seriesName }: BarChartProps) {
  const rotacion = labels.length > 12 ? 45 : labels.length > 6 ? 30 : 0;
  const margenInferior = rotacion === 45 ? "34%" : rotacion === 30 ? "24%" : "16%";

  const option: EChartsOption = {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "4%", top: "20%", bottom: margenInferior, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { interval: 0, rotate: rotacion },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: seriesName,
        type: "bar",
        data: values,
        barMaxWidth: 32,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return <BaseChart option={option} />;
}
