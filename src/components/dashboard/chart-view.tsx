
"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ScatterChart, Scatter, Area, AreaChart, Funnel, FunnelChart, Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import React, { useState } from 'react';
import { ChartConfig, DataRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scaleLinear } from 'd3-scale';
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { DataTable } from "./data-table";
import { Button } from "@/components/ui/button";

interface ChartViewProps {
  config: ChartConfig;
  data: DataRow[];
}

const COLORS = ["#A78BFA", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00c49f", "#C4B5FD"];
const PIE_CHART_LABEL_THRESHOLD = 5;
const ROWS_PER_PAGE = 10;

const CustomTooltip = ({ active, payload, label, config }: any) => {
    if (active && payload && payload.length) {
      if (config.type === 'scatter') {
        const point = payload[0].payload;
        return (
            <div className="rounded-md border bg-background/90 p-2 shadow-sm">
                <p className="font-bold">{`${config.xAxis}: ${point.x.toLocaleString()}`}</p>
                <p className="font-bold">{`${Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis}: ${point.y.toLocaleString()}`}</p>
            </div>
        )
      }
      if (config.type === 'heatmap') {
          const item = payload[0].payload;
          return (
            <div className="rounded-md border bg-background/90 p-2 shadow-sm">
                <p className="font-bold">{item.y}</p>
                <p className="text-sm">{config.xAxis}: {item.x}</p>
                <p className="text-sm">{config.value}: {item.value}</p>
            </div>
          )
      }
      if (config.type === 'treemap' && payload[0]?.payload?.root) {
          const item = payload[0].payload.root;
          return (
            <div className="rounded-md border bg-background/90 p-2 shadow-sm">
                <p className="font-bold">{item.name}</p>
                <p className="text-sm">{config.value}: {item.size.toLocaleString()}</p>
            </div>
          )
      }
      return (
        <div className="rounded-md border bg-background/90 p-2 shadow-sm">
          <p className="font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.stroke }} className="text-xs">
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

// A simple content renderer for the treemap
const TreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, colors, name } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: colors[Math.floor(index % colors.length)],
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 80 && height > 25 ? (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
            {name}
          </text>
        ) : null}
      </g>
    );
};


export const ChartView = React.forwardRef<HTMLDivElement, ChartViewProps>(({ config, data }, ref) => {
  const yAxisKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;
  const [currentPage, setCurrentPage] = useState(0);

  const renderChart = () => {
    if ((config.type !== 'heatmap' && config.type !== 'treemap' && config.type !== 'paginated-report' && (!config.xAxis || !config.yAxis || config.yAxis.length === 0)) || ((config.type === 'heatmap' || config.type === 'treemap') && (!config.xAxis || !config.value))) {
        return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select columns for all options.</div>
    }

    switch (config.type) {
      case "paginated-report":
        const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
        const startIndex = currentPage * ROWS_PER_PAGE;
        const paginatedData = data.slice(startIndex, startIndex + ROWS_PER_PAGE);

        return (
          <div>
            <DataTable data={paginatedData} headers={data.length > 0 ? Object.keys(data[0]) : []} className="overflow-x-auto h-[350px]" />
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80}/>
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              <Bar dataKey={yAxisKey} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "horizontal-bar":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} interval={0}/>
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              <Bar dataKey={yAxisKey} layout="vertical" radius={[0, 4, 4, 0]}>
                 {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
              <Legend />
              {Array.isArray(config.yAxis) && config.yAxis.map((yKey, index) => (
                <Line 
                    key={yKey}
                    type="monotone" 
                    dataKey={yKey} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={2} 
                    activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        case "area":
          return (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data} margin={{ bottom: 50 }}>
                <defs>
                  <linearGradient id={`color-${yAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80}/>
                <Tooltip content={<CustomTooltip config={config} />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
                <Legend />
                <Area type="monotone" dataKey={yAxisKey} stroke="#8884d8" fillOpacity={1} fill={`url(#color-${yAxisKey})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          );
      case "pie":
      case "doughnut":
        const pieDataMap = new Map<string, number>();
        data.forEach(row => {
            const name = row[config.xAxis] as string;
            const value = parseFloat(String(row[yAxisKey]));
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
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={config.type === 'doughnut' ? 60 : 0}
                outerRadius={100} 
                labelLine={false} 
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
            y: parseFloat(String(row[yAxisKey])),
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
                    <YAxis type="number" dataKey="y" name={yAxisKey} unit="" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80}/>
                    <Tooltip content={<CustomTooltip config={config} />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name={`${yAxisKey} by ${config.xAxis}`} data={scatterData} fill="#8884d8">
                        {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        );
      case "stacked-bar":
      case "grouped-bar":
      case "stacked-area":
        if (!config.stackBy) {
          return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select a column to "Group By".</div>
        }
        
        const transformedData: Record<string, DataRow> = {};
        const groupKeys = new Set<string>();

        data.forEach(row => {
          const xAxisKey = String(row[config.xAxis]);
          const groupKey = String(row[config.stackBy]);
          const yAxisValue = parseFloat(String(row[yAxisKey]));

          if (xAxisKey && groupKey && !isNaN(yAxisValue)) {
            if (!transformedData[xAxisKey]) {
              transformedData[xAxisKey] = { [config.xAxis]: xAxisKey };
            }
            transformedData[xAxisKey][groupKey] = (transformedData[xAxisKey][groupKey] || 0) + yAxisValue;
            groupKeys.add(groupKey);
          }
        });
        
        const chartData = Object.values(transformedData);
        const sortedGroupKeys = Array.from(groupKeys).sort();

        if(config.type === 'stacked-area') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="category" dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
                        <YAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                        <Legend />
                        {sortedGroupKeys.map((key, index) => (
                            <Area key={key} type="monotone" dataKey={key} stackId="a" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            )
        }

        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="horizontal" margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="category" dataKey={config.xAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end"/>
              <YAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend />
              {sortedGroupKeys.map((key, index) => (
                <Bar key={key} dataKey={key} stackId={config.type === 'stacked-bar' ? 'a' : undefined} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "heatmap":
        if (!config.value) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select a value column.</div>
        }
        const xLabels = [...new Set(data.map(row => row[config.xAxis]))].sort();
        const yLabels = [...new Set(data.map(row => row[yAxisKey]))].sort();
        const values = data.map(row => parseFloat(String(row[config.value]))).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        const colorScale = scaleLinear<string>().domain([min, (min+max)/2, max]).range(["#C4B5FD", "#A78BFA", "#5B21B6"]);

        const heatmapData = yLabels.map(y => 
            xLabels.map(x => {
                const point = data.find(row => row[config.xAxis] === x && row[yAxisKey] === y);
                const value = point ? parseFloat(String(point[config.value])) : 0;
                return { x, y, value };
            })
        ).flat();

        return (
             <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="category" dataKey="x" name={config.xAxis}
                        ticks={xLabels} stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={60} />
                    <YAxis type="category" dataKey="y" name={yAxisKey} 
                        ticks={yLabels} stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip config={config} />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={heatmapData} shape="square">
                        {heatmapData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={!isNaN(entry.value) && entry.value !== 0 ? colorScale(entry.value) : 'hsl(var(--muted))'} r={10} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        );
      case "pictogram":
        const pictogramData = data.map(row => ({
          name: String(row[config.xAxis]),
          value: parseFloat(String(row[yAxisKey])),
        })).filter(item => item.name && !isNaN(item.value));

        if (pictogramData.length === 0) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No valid data for Pictogram.</div>
        }

        const maxVal = Math.max(...pictogramData.map(d => d.value));
        const valuePerIcon = Math.ceil(maxVal / 20); // Aim for a max of 20 icons

        return (
          <div className="space-y-4 pt-4">
              {pictogramData.map((item, index) => (
                  <div key={index} className="flex flex-col">
                      <div className="flex items-end gap-2">
                        <span className="w-24 shrink-0 truncate font-medium" title={item.name}>{item.name}</span>
                        <div className="flex flex-wrap items-center gap-1">
                            {[...Array(Math.ceil(item.value / valuePerIcon))].map((_, i) => (
                                <User key={i} className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }}/>
                            ))}
                        </div>
                        <span className="ml-2 text-sm font-semibold">{item.value.toLocaleString()}</span>
                      </div>
                  </div>
              ))}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>= ~{valuePerIcon.toLocaleString()}</span>
              </div>
          </div>
        );
      case 'funnel':
        const funnelData = data.map(row => ({
            name: String(row[config.xAxis]),
            value: parseFloat(String(row[yAxisKey])),
            fill: COLORS[Math.floor(Math.random() * COLORS.length)]
        })).filter(item => item.name && !isNaN(item.value))
           .sort((a,b) => b.value - a.value);

        if (funnelData.length === 0) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No valid data for Funnel Chart.</div>;
        }

        return (
            <ResponsiveContainer width="100%" height={300}>
                <FunnelChart>
                    <Tooltip content={<CustomTooltip config={config} />} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Funnel>
                    <Legend />
                </FunnelChart>
            </ResponsiveContainer>
        );
       case 'treemap':
        if (!config.value) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Please select a value column.</div>
        }
        const treemapData = data.map(row => ({
            name: String(row[config.xAxis]),
            size: parseFloat(String(row[config.value])),
        })).filter(item => item.name && !isNaN(item.size));

        if (treemapData.length === 0) {
            return <div className="flex h-[300px] items-center justify-center text-muted-foreground">No valid data for Treemap.</div>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <Treemap
                    data={treemapData}
                    dataKey="size"
                    ratio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<TreemapContent colors={COLORS} />}
                >
                    <Tooltip content={<CustomTooltip config={config} />} />
                </Treemap>
            </ResponsiveContainer>
        );
       case 'radar':
        return (
            <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey={config.xAxis} />
                    <PolarRadiusAxis />
                    <Tooltip content={<CustomTooltip config={config} />} />
                    <Legend />
                    {Array.isArray(config.yAxis) && config.yAxis.map((yKey, index) => (
                        <Radar
                            key={yKey}
                            name={yKey}
                            dataKey={yKey}
                            stroke={COLORS[index % COLORS.length]}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.6}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        );
      default:
        return <div className="flex h-[300px] items-center justify-center text-muted-foreground">Select a chart type.</div>;
    }
  };
  
  const getChartTitle = () => {
    if (config.type === 'paginated-report') {
      return "Paginated Report";
    }
    if (!config.xAxis || !config.yAxis || config.yAxis.length === 0) return "Untitled Chart";
    
    const yAxisTitle = Array.isArray(config.yAxis) ? config.yAxis.join(', ') : config.yAxis;

    if (config.type === 'pie' || config.type === 'doughnut') {
      return `Distribution of ${yAxisTitle} by ${config.xAxis}`;
    }
     if ((config.type === 'stacked-bar' || config.type === 'grouped-bar' || config.type === 'stacked-area') && config.stackBy) {
        return `${yAxisTitle} by ${config.xAxis} (${config.type === 'stacked-bar' ? 'Stacked Bar' : config.type === 'grouped-bar' ? 'Cluster Bar' : 'Stacked Area'} by ${config.stackBy})`;
    }
    if (config.type === 'heatmap' && config.value) {
        return `Heatmap of ${config.value} by ${config.xAxis} and ${yAxisTitle}`;
    }
    if (config.type === 'treemap' && config.value) {
        return `Treemap of ${config.xAxis} by ${config.value}`;
    }
    return `${yAxisTitle} by ${config.xAxis}`;
  }

  return (
    <Card className="flex-1" ref={ref}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{getChartTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
});
ChartView.displayName = 'ChartView';
