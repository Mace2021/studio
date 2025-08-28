
"use client";

import { X } from "lucide-react";
import type { AggregationType, ChartConfig, DataRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "react-multi-select-component";
import { Input } from "../ui/input";

interface ChartControlsProps {
  config: ChartConfig;
  data: DataRow[];
  onUpdate: (config: ChartConfig) => void;
  onRemove: (id: string) => void;
}

const chartTypes: { value: ChartConfig['type']; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "histogram", label: "Histogram / Frequency Plot" },
  { value: "horizontal-bar", label: "Horizontal Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "doughnut", label: "Doughnut Chart" },
  { value: "scatter", label: "Scatter Plot" },
  { value: "stacked-bar", label: "Stacked Bar Chart" },
  { value: "stacked-area", label: "Stacked Area Chart" },
  { value: "grouped-bar", label: "Cluster Bar Chart" },
  { value: "heatmap", label: "Heatmap" },
  { value: "pictogram", label: "Pictogram" },
  { value: "funnel", label: "Funnel Chart" },
  { value: "pyramid", label: "Pyramid Chart" },
  { value: "treemap", label: "Treemap" },
  { value: "radar", label: "Radar Chart" },
  { value: "paginated-report", label: "Paginated Report" },
  { value: "kpi", label: "KPI Card" },
];

const aggregationTypes: { value: AggregationType; label: string }[] = [
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
]

export function ChartControls({ config, data, onUpdate, onRemove }: ChartControlsProps) {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const headerOptions = headers.map(h => ({label: h, value: h}));

  const handleConfigChange = (key: keyof ChartConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };
  
  const handleMultiSelectChange = (selected: {label: string, value: string}[]) => {
     handleConfigChange('yAxis', selected.map(s => s.value));
  }

  const getXAxisLabel = () => {
    switch (config.type) {
        case "pie": return "Category (Name)";
        case "doughnut": return "Category (Name)";
        case "funnel": return "Category (Name)";
        case "pyramid": return "Category (Name)";
        case "treemap": return "Category (Name)";
        case "pictogram": return "Category";
        case "scatter": return "X-Axis (Numeric)";
        case "heatmap": return "X-Axis (Category)";
        case "radar": return "Category";
        case "horizontal-bar": return "Category (Y-Axis)";
        case "histogram": return "Category";
        default: return "X-Axis";
    }
  }

  const getYAxisLabel = () => {
    switch (config.type) {
        case "pie": return "Value";
        case "doughnut": return "Value";
        case "funnel": return "Value";
        case "pyramid": return "Value";
        case "pictogram": return "Value (Numeric)";
        case "scatter": return "Y-Axis (Numeric)";
        case "heatmap": return "Y-Axis (Category)";
        case "line": return "Y-Axis (Value) - Select one or more";
        case "radar": return "Value (Numeric)";
        case "horizontal-bar": return "Value (X-Axis)";
        case "kpi": return "Metric (Numeric)";
        case "histogram": return "Value (Count)";
        default: return "Y-Axis (Value)";
    }
  }
  
  const isMultiYAxis = config.type === 'line' || config.type === 'radar';

  return (
    <div className="relative space-y-4 rounded-md border bg-background/50 p-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => onRemove(config.id)}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remove Chart</span>
      </Button>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor={`chart-type-${config.id}`}>Chart Type</Label>
          <Select
            value={config.type}
            onValueChange={(value: ChartConfig['type']) => {
                // When changing chart type, if it's not a multi-y-axis chart, ensure yAxis has only one value
                const newYAxis = (!isMultiYAxis && Array.isArray(config.yAxis)) ? [config.yAxis[0] || ''] : config.yAxis;
                onUpdate({ ...config, type: value, yAxis: newYAxis });
            }}
          >
            <SelectTrigger id={`chart-type-${config.id}`}>
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        { config.type !== 'paginated-report' && config.type !== 'kpi' && config.type !== 'histogram' && <>
          <div>
            <Label htmlFor={`x-axis-${config.id}`}>{getXAxisLabel()}</Label>
            <Select
              value={config.xAxis}
              onValueChange={(value) => handleConfigChange("xAxis", value)}
              disabled={headers.length === 0}
            >
              <SelectTrigger id={`x-axis-${config.id}`}>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={isMultiYAxis ? 'sm:col-span-2' : ''}>
            <Label htmlFor={`y-axis-${config.id}`}>{getYAxisLabel()}</Label>
            {isMultiYAxis ? (
              <MultiSelect
                  options={headerOptions}
                  value={Array.isArray(config.yAxis) ? config.yAxis.map(y => ({label: y, value: y})) : []}
                  onChange={handleMultiSelectChange}
                  labelledBy="Select"
                  hasSelectAll={false}
                  overrideStrings={{
                      "selectSomeItems": "Select Y-Axis columns..."
                  }}
                  className="multi-select-custom"
              />
            ) : (
              <Select
                  value={Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis}
                  onValueChange={(value) => handleConfigChange("yAxis", [value])}
                  disabled={headers.length === 0}
              >
                  <SelectTrigger id={`y-axis-${config.id}`}>
                  <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                  {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                      {header}
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
            )}
          </div>
          {(config.type === 'stacked-bar' || config.type === 'grouped-bar' || config.type === 'stacked-area') && (
            <div className="sm:col-span-2">
              <Label htmlFor={`stack-by-${config.id}`}>Group By (Category)</Label>
              <Select
                value={config.stackBy}
                onValueChange={(value) => handleConfigChange("stackBy", value)}
                disabled={headers.length === 0}
              >
                <SelectTrigger id={`stack-by-${config.id}`}>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(config.type === 'heatmap' || config.type === 'treemap') && (
            <div className="sm:col-span-2">
              <Label htmlFor={`value-${config.id}`}>Value (Numeric)</Label>
              <Select
                value={config.value}
                onValueChange={(value) => handleConfigChange("value", value)}
                disabled={headers.length === 0}
              >
                <SelectTrigger id={`value-${config.id}`}>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>}
        {config.type === 'histogram' && (
            <div className="sm:col-span-2">
                <Label htmlFor={`x-axis-${config.id}`}>{getXAxisLabel()}</Label>
                <Select
                    value={config.xAxis}
                    onValueChange={(value) => handleConfigChange("xAxis", value)}
                    disabled={headers.length === 0}
                >
                    <SelectTrigger id={`x-axis-${config.id}`}>
                        <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                        {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                            {header}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
        {config.type === 'kpi' && (
            <>
                <div>
                    <Label htmlFor={`y-axis-${config.id}`}>{getYAxisLabel()}</Label>
                     <Select
                        value={Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis}
                        onValueChange={(value) => handleConfigChange("yAxis", [value])}
                        disabled={headers.length === 0}
                    >
                        <SelectTrigger id={`y-axis-${config.id}`}>
                            <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                        {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                            {header}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor={`aggregation-${config.id}`}>Aggregation</Label>
                     <Select
                        value={config.aggregation}
                        onValueChange={(value) => handleConfigChange("aggregation", value)}
                    >
                        <SelectTrigger id={`aggregation-${config.id}`}>
                            <SelectValue placeholder="Select aggregation" />
                        </SelectTrigger>
                        <SelectContent>
                        {aggregationTypes.map((agg) => (
                            <SelectItem key={agg.value} value={agg.value}>
                            {agg.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label htmlFor={`prefix-${config.id}`}>Prefix</Label>
                    <Input id={`prefix-${config.id}`} value={config.prefix || ''} onChange={(e) => handleConfigChange('prefix', e.target.value)} placeholder="e.g. $" />
                 </div>
                  <div>
                    <Label htmlFor={`suffix-${config.id}`}>Suffix</Label>
                    <Input id={`suffix-${config.id}`} value={config.suffix || ''} onChange={(e) => handleConfigChange('suffix', e.target.value)} placeholder="e.g. %" />
                 </div>
            </>
        )}
      </div>
    </div>
  );
}
