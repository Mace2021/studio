export type ChartType = "bar" | "line" | "pie" | "scatter" | "stacked-bar";

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
  stackBy?: string;
}

export type DataRow = Record<string, string | number>;
