import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart";
import type { LineChartProps } from "./types";

export default function LineChart({ labels, series, title }: LineChartProps) {
  const conLeyenda = series.length > 1;

  const option: EChartsOption = {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    ...(conLeyenda ? { legend: { bottom: 0 } } : {}),
    grid: {
      left: "3%",
      right: "4%",
      top: "20%",
      bottom: conLeyenda ? "16%" : "8%",
      containLabel: true,
    },
    xAxis: { type: "category", boundaryGap: false, data: labels },
    yAxis: { type: "value" },
    series: series.map((serie) => ({
      name: serie.name,
      type: "line" as const,
      data: serie.data,
      showSymbol: false,
    })),
  };

  return <BaseChart option={option} />;
}
