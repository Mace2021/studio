export type ChartType = "bar" | "line" | "pie";

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
}

export type DataRow = Record<string, string | number>;
