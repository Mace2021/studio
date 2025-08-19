export type ChartType = "bar" | "line" | "pie" | "scatter";

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
}

export type DataRow = Record<string, string | number>;
