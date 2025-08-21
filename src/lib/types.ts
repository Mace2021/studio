export type ChartType = "bar" | "line" | "pie" | "doughnut" | "scatter" | "stacked-bar" | "heatmap" | "grouped-bar" | "pictogram" | "area" | "stacked-area";

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
  stackBy?: string;
  value?: string; // For heatmap
}

export type DataRow = Record<string, string | number>;
