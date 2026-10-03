import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart";
import type { DonutChartProps } from "./types";

export default function DonutChart({ data, title }: DonutChartProps) {
  const option: EChartsOption = {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["45%", "68%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { formatter: "{d}%" },
        data,
      },
    ],
  };

  return <BaseChart option={option} />;
}
