import type { EChartsOption } from "echarts";

export interface BaseChartProps {
  option: EChartsOption;
  height?: string;
}

export interface BarChartProps {
  labels: string[];
  values: number[];
  title: string;
  seriesName: string;
}

export interface SerieLinea {
  name: string;
  data: number[];
}

export interface LineChartProps {
  labels: string[];
  series: SerieLinea[];
  title: string;
}

export interface DatoDonut {
  name: string;
  value: number;
}

export interface DonutChartProps {
  data: DatoDonut[];
  title: string;
}
