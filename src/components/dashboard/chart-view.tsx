"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ScatterChart, Scatter
} from "recharts";
import React from 'react';
import { ChartConfig, DataRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartViewProps {
  config: ChartConfig;
  data: DataRow[];
}

const COLORS = ["#A78BFA", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00c49f", "#C4B5FD"];
const PIE_CHART_LABEL_THRESHOLD = 5;

const CustomTooltip = ({ active, payload, label, config }: any) => {
    if (active && payload && payload.length) {
      if (config.type === 'scatter') {
        const point = payload[0].payload;
        return (
            <div className="rounded-md border bg-background/90 p-2 shadow-sm">
                <p className="font-bold">{`${config.xAxis}: ${point.x.toLocaleString()}`}</p>
                <p className="font-bold">{`${config.yAxis}: ${point.y.toLocaleString()}`}</p>
            </div>
        )
      }
      return (
        <div className="rounded-md border bg-background/90 p-2 shadow-sm">
          <p className="font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
              {`${entry.name}: ${Number(entry.value).toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const { name, value, payload: itemPayload } = payload[0];
        
        if (name === 'Other' && itemPayload.groupedData) {
            return (
                <div className="rounded-md border bg-background/90 p-2 shadow-sm max-h-48 overflow-y-auto">
                    <p className="font-bold">Other Categories</p>
                    {itemPayload.groupedData.map((item: any, index: number) => (
                         <p key={index} className="text-xs">{item.name}: {item.value.toLocaleString()}</p>
                    ))}
                    <p className="font-bold mt-2">Total: {value.toLocaleString()}</p>
                </div>
            )
        }

        return (
            <div className="rounded-md border bg-background/90 p-2 shadow-sm">
                <p className="font-bold">{name}</p>
                <p style={{ color: payload[0].fill }}>Value: {Number(value).toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

export const ChartView = React.forwardRef<HTMLDivElement, ChartViewProps>(({ config, data }, ref) => {
  const renderChart = () => {
    if (!config.xAxis || !config.yAxis) {
        return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select columns for the axes.</div>
    }

    switch (config.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              <Bar dataKey={config.yAxis} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
              <Legend />
              <Line type="monotone" dataKey={config.yAxis} strokeWidth={2} activeDot={{ r: 6 }}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Line>
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        const pieDataMap = new Map<string, number>();
        data.forEach(row => {
            const name = row[config.xAxis] as string;
            const value = parseFloat(String(row[config.yAxis]));
            if (name && !isNaN(value)) {
                pieDataMap.set(name, (pieDataMap.get(name) || 0) + value);
            }
        });
        
        let pieData = Array.from(pieDataMap, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        if (pieData.length > PIE_CHART_LABEL_THRESHOLD) {
            const otherValue = pieData.slice(PIE_CHART_LABEL_THRESHOLD).reduce((acc, cur) => acc + cur.value, 0);
            const groupedData = pieData.slice(PIE_CHART_LABEL_THRESHOLD);
            pieData = pieData.slice(0, PIE_CHART_LABEL_THRESHOLD);
            pieData.push({ name: 'Other', value: otherValue, groupedData });
        }

        if (pieData.length === 0) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No valid data for Pie Chart.</div>
        }

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "scatter":
        const scatterData = data
          .map(row => ({
            x: parseFloat(String(row[config.xAxis])),
            y: parseFloat(String(row[config.yAxis])),
          }))
          .filter(point => !isNaN(point.x) && !isNaN(point.y));

        if (scatterData.length === 0) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No valid numerical data for Scatter Plot.</div>
        }

        return (
            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="x" name={config.xAxis} unit="" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="number" dataKey="y" name={config.yAxis} unit="" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip config={config} />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name={`${config.yAxis} by ${config.xAxis}`} data={scatterData} fill="#8884d8">
                        {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        );
      case "stacked-bar":
        if (!config.stackBy) {
          return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select a column to "Stack By".</div>
        }
        
        const transformedData: Record<string, DataRow> = {};
        const stackKeys = new Set<string>();

        data.forEach(row => {
          const xAxisKey = String(row[config.xAxis]);
          const stackKey = String(row[config.stackBy]);
          const yAxisValue = parseFloat(String(row[config.yAxis]));

          if (xAxisKey && stackKey && !isNaN(yAxisValue)) {
            if (!transformedData[xAxisKey]) {
              transformedData[xAxisKey] = { [config.xAxis]: xAxisKey };
            }
            transformedData[xAxisKey][stackKey] = (transformedData[xAxisKey][stackKey] || 0) + yAxisValue;
            stackKeys.add(stackKey);
          }
        });
        
        const stackedBarData = Object.values(transformedData);
        const sortedStackKeys = Array.from(stackKeys).sort();

        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stackedBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <YAxis type="category" dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              {sortedStackKeys.map((key, index) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Select a chart type.</div>;
    }
  };
  
  const getChartTitle = () => {
    if (!config.xAxis || !config.yAxis) return "Untitled Chart";
    if (config.type === 'pie') {
      return `Distribution of ${config.yAxis} by ${config.xAxis}`;
    }
     if (config.type === 'stacked-bar' && config.stackBy) {
        return `${config.yAxis} by ${config.xAxis} (Stacked by ${config.stackBy})`;
    }
    return `${config.yAxis} by ${config.xAxis}`;
  }

  return (
    <Card className="flex-1" ref={ref}>
      <CardHeader>
        <CardTitle className="truncate text-lg font-semibold">{getChartTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
});
ChartView.displayName = 'ChartView';
