"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";
import { ChartConfig, DataRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartViewProps {
  config: ChartConfig;
  data: DataRow[];
}

const COLORS = ["#A78BFA", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00c49f", "#C4B5FD"];
const PIE_CHART_LABEL_THRESHOLD = 5;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const mainPayload = payload[0].payload.name === 'Other' && payload[0].payload.payload ? payload[0].payload.payload : payload;
    const isOther = payload[0].payload.name === 'Other';
    
    return (
      <div className="rounded-md border bg-background/90 p-2 shadow-sm max-h-48 overflow-y-auto">
        <p className="font-bold">{isOther ? 'Other' : label}</p>
        {mainPayload.map((entry: any, index: number) => (
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

export function ChartView({ config, data }: ChartViewProps) {
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              <Bar dataKey={config.yAxis} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
              <Legend />
              <Line type="monotone" dataKey={config.yAxis} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
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
        return (
           <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey={config.xAxis} name={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey={config.yAxis} name={config.yAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <ZAxis range={[100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Data Points" data={data}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
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
    if (config.type === 'scatter') {
        return `Scatter Plot of ${config.yAxis} vs ${config.xAxis}`;
    }
    return `${config.yAxis} by ${config.xAxis}`;
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="truncate text-lg font-semibold">{getChartTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
