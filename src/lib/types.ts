
export type ChartType = "bar" | "line" | "pie" | "doughnut" | "scatter" | "stacked-bar" | "heatmap" | "grouped-bar" | "pictogram" | "area" | "stacked-area" | "funnel" | "treemap" | "radar" | "horizontal-bar" | "paginated-report" | "kpi" | "histogram" | "pyramid" | "combo" | "roi";

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max';

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxis: string;
  yAxis: string[];
  yAxis2?: string[];
  yAxis2Type?: 'line' | 'bar';
  stackBy?: string;
  value?: string; // For heatmap, treemap
  aggregation?: AggregationType;
  prefix?: string;
  suffix?: string;
  costColumn?: string; // For ROI
  returnColumn?: string; // For ROI
}

export type DataRow = Record<string, string | number>;
