
"use client";

import { X } from "lucide-react";
import type { ChartConfig, DataRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartControlsProps {
  config: ChartConfig;
  data: DataRow[];
  onUpdate: (config: ChartConfig) => void;
  onRemove: (id: string) => void;
}

const chartTypes: { value: ChartConfig['type']; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "scatter", label: "Scatter Plot" },
  { value: "stacked-bar", label: "Stacked Bar Chart" },
  { value: "grouped-bar", label: "Grouped Bar Chart" },
  { value: "heatmap", label: "Heatmap" },
  { value: "pictogram", label: "Pictogram" },
];

export function ChartControls({ config, data, onUpdate, onRemove }: ChartControlsProps) {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const handleConfigChange = (key: keyof ChartConfig, value: any) => {
    onUpdate({ ...config, [key]: value });
  };

  const getXAxisLabel = () => {
    switch (config.type) {
        case "pie": return "Category (Name)";
        case "pictogram": return "Category";
        case "scatter": return "X-Axis (Numeric)";
        case "heatmap": return "X-Axis (Category)";
        default: return "X-Axis";
    }
  }

  const getYAxisLabel = () => {
    switch (config.type) {
        case "pie": return "Value";
        case "pictogram": return "Value (Numeric)";
        case "scatter": return "Y-Axis (Numeric)";
        case "heatmap": return "Y-Axis (Category)";
        default: return "Y-Axis (Value)";
    }
  }

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
            onValueChange={(value: ChartConfig['type']) => handleConfigChange("type", value)}
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
        <div>
          <Label htmlFor={`y-axis-${config.id}`}>{getYAxisLabel()}</Label>
          <Select
            value={config.yAxis}
            onValueChange={(value) => handleConfigChange("yAxis", value)}
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
        {(config.type === 'stacked-bar' || config.type === 'grouped-bar') && (
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
         {config.type === 'heatmap' && (
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
      </div>
    </div>
  );
}

    