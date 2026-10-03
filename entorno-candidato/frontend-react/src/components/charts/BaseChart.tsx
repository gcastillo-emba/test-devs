import ReactECharts from "echarts-for-react";
import type { BaseChartProps } from "./types";

export default function BaseChart({ option, height = "18rem" }: BaseChartProps) {
  return <ReactECharts option={option} style={{ height, width: "100%" }} />;
}
