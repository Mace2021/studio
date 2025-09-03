
'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import Xarrow, { Xwrapper } from 'react-xarrows';
import type { Task } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type View = 'day' | 'week' | 'month';

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#8b5cf6", // violet-500
];

export const GanttDisplay = ({ tasks, view: initialView = 'week', criticalPath }: { tasks: Task[]; view?: View; criticalPath: Set<number>; }) => {
    const [view, setView] = useState<View>(initialView);

    const processedTasks = useMemo(() => {
        const taskMap = new Map(tasks.map(t => [t.id, {...t, children: [] as Task[]}]));
        
        tasks.forEach(task => {
            if (task.parentId && taskMap.has(task.parentId)) {
                const parent = taskMap.get(task.parentId);
                parent?.children.push(task as any);
            }
        });

        const orderedTasks: Task[] = [];
        const visited = new Set<number>();

        const addTasks = (task: Task, level: number) => {
            if (visited.has(task.id)) return;
            visited.add(task.id);
            (task as any).level = level;
            orderedTasks.push(task);
            
            const children = taskMap.get(task.id)?.children || [];
            children.forEach(child => addTasks(child, level + 1));
        }

        tasks.filter(t => !t.parentId).forEach(task => addTasks(task, 0));

        tasks.forEach(task => {
            if(!visited.has(task.id)) {
                addTasks(task, 0);
            }
        })
        
        return orderedTasks;

    }, [tasks]);

    const [startDate, endDate] = useMemo(() => {
        if (tasks.length === 0) {
            const today = new Date();
            return [startOfWeek(today), addDays(today, 30)];
        }
        const start = new Date(Math.min(...tasks.map(t => t.start.getTime())));
        const end = new Date(Math.max(...tasks.map(t => t.end.getTime())));
        return [start, end];
    }, [tasks]);

    const timelineHeaders = useMemo(() => {
        const headers: { main: string, sub: string[] }[] = [];
        if (!startDate || !endDate) return [];
        let current: Date;
        const finalDate = addDays(endDate, 7); // Add some buffer to the end

        if (view === 'day') {
            current = startOfWeek(startDate);
            while(current <= finalDate) {
                headers.push({
                    main: `Week of ${format(current, 'MMM d')}`,
                    sub: Array.from({length: 7}).map((_, i) => format(addDays(current, i), 'E d'))
                })
                current = addDays(current, 7);
            }
        } else if (view === 'week') {
            current = startOfMonth(startDate);
             while(current <= finalDate) {
                const monthName = format(current, 'MMMM yyyy');
                const weekStarts = [];
                let weekStart = startOfWeek(current, { weekStartsOn: 1 });
                 const monthEnd = addDays(startOfMonth(addDays(current, 35)), -1);
                while(weekStart <= monthEnd && weekStart < finalDate) {
                    weekStarts.push(`W${format(weekStart, 'w')}`);
                    weekStart = addDays(weekStart, 7);
                }
                headers.push({ main: monthName, sub: weekStarts });
                current = addDays(startOfMonth(current), 35);
                if (current.getMonth() === startOfMonth(current).getMonth()) {
                  current.setDate(1); // prevent infinite loop
                }
            }
        } else if (view === 'month') {
            let currentYear = startDate.getFullYear();
            const endYear = finalDate.getFullYear();
            while(currentYear <= endYear) {
                headers.push({
                    main: String(currentYear),
                    sub: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                });
                currentYear++;
            }
        }
        return headers;
    }, [startDate, endDate, view]);

    const getTaskPosition = (task: Task) => {
        if (!startDate) return { left: 0, width: 0 };
        const finalDate = addDays(endDate, 7);

        let totalUnits = 0;
        let taskStartUnit = 0;
        let taskDurationUnits = 0;

        if (view === 'day') {
            totalUnits = differenceInDays(finalDate, startDate);
            taskStartUnit = differenceInDays(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.5 : Math.max(1, differenceInDays(task.end, task.start));
        } else if (view === 'week') {
            totalUnits = differenceInWeeks(finalDate, startDate);
            taskStartUnit = differenceInWeeks(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.2 : Math.max(0.2, differenceInWeeks(task.end, task.start));
        } else { // month
            totalUnits = differenceInMonths(finalDate, startDate);
            taskStartUnit = differenceInMonths(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.1 : Math.max(0.1, differenceInMonths(task.end, task.start));
        }
        
        if (totalUnits === 0) return {left: 0, width: 0};

        const unitWidth = 100 / totalUnits;
        return {
            left: Math.max(0, taskStartUnit * unitWidth),
            width: Math.max(0, taskDurationUnits * unitWidth)
        };
    }

  return (
    <Xwrapper>
        <div className="flex justify-end mb-4">
            <Tabs value={view} onValueChange={(value) => setView(value as View)}>
                <TabsList>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="border rounded-lg bg-card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `minmax(200px, 1.5fr) 4fr`}}>
                <div className="bg-muted/50 border-r">
                    <div className="p-2 h-16 flex items-center font-semibold border-b text-sm">Tasks List</div>
                </div>
                <div className="overflow-x-auto bg-muted/30">
                    <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm">
                    {timelineHeaders.map((header, i) => (
                        <div key={i} className="flex flex-col whitespace-nowrap">
                            <div className="p-2 font-semibold text-center border-b text-sm">{header.main}</div>
                            <div className="grid" style={{gridTemplateColumns: `repeat(${header.sub.length}, minmax(60px, 1fr))`}}>
                                {header.sub.map((sub, j) => (
                                    <div key={j} className="p-1.5 text-xs text-center border-b border-r text-muted-foreground">{sub}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>

                <div className="bg-muted/50 border-r overflow-y-auto" style={{maxHeight: '60vh'}}>
                    {processedTasks.map((task) => (
                        <div
                          id={`task-name-${task.id}`}
                          key={task.id}
                          className="h-12 flex items-center justify-between group text-sm border-b"
                          style={{ paddingLeft: `${(task as any).level * 1.5 + 0.5}rem`}}
                          title={task.name}
                        >
                            <span className={cn("truncate", {"font-semibold": task.type === 'group'})}>{task.name}</span>
                        </div>
                    ))}
                </div>
                <div className="overflow-x-auto overflow-y-auto" style={{maxHeight: '60vh'}}>
                    <div className="relative">
                        {/* Grid lines */}
                        {timelineHeaders.map((header, i) => (
                            <div key={i} className="absolute inset-0 grid" style={{gridTemplateColumns: `repeat(${header.sub.length}, minmax(60px, 1fr))`}}>
                                {header.sub.map((_, j) => (
                                    <div key={j} className="border-r"></div>
                                ))}
                            </div>
                        ))}
                         {/* Project milestone line */}
                        <div className="absolute top-2 left-0 right-0 h-4 flex items-center z-10">
                            <div className="w-full h-0.5 bg-blue-500 relative">
                                {processedTasks.filter(t => t.type === 'milestone').map(task => {
                                    const { left } = getTaskPosition(task);
                                    return (
                                        <TooltipProvider key={task.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div 
                                                        className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" 
                                                        style={{ left: `${left}%`, top: '2px' }}
                                                    ></div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{task.name}</p>
                                                    <p>{format(task.start, 'MMM d, yyyy')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )
                                })}
                            </div>
                        </div>


                        {processedTasks.map((task, index) => {
                             const { left, width } = getTaskPosition(task);
                             const isMilestone = task.type === 'milestone';
                             const isCritical = criticalPath.has(task.id);

                             if (task.type === 'group' || isMilestone) {
                                return <div key={task.id} className="h-12 border-b"></div>
                             }
                            
                            return (
                                <div key={task.id} className="h-12 border-b relative flex items-center px-1">
                                  <TooltipProvider>
                                  <Tooltip>
                                  <TooltipTrigger asChild>
                                  <div
                                      id={`task-bar-${task.id}`}
                                      className={cn("absolute h-8 flex items-center rounded text-white text-xs truncate z-20", {
                                          "ring-2 ring-red-500 ring-offset-2 ring-offset-card": isCritical,
                                      })}
                                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: COLORS[index % COLORS.length] }}
                                  >
                                      <div 
                                        className="absolute top-0 left-0 h-full bg-black/20 rounded" 
                                        style={{ width: `${task.progress}%` }}
                                      ></div>
                                      <span className="truncate z-10 px-2 font-medium">{task.name}</span>
                                      {task.progress > 0 && <span className="absolute right-2 text-xs font-bold">{task.progress}%</span>}
                                  </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{task.name}</p>
                                      <p>Start: {format(task.start, 'MMM d, yyyy')}</p>
                                      <p>End: {format(task.end, 'MMM d, yyyy')}</p>
                                      <p>Progress: {task.progress}%</p>
                                      {isCritical && <p className="text-red-500 font-bold">Critical Path</p>}
                                  </TooltipContent>
                                  </Tooltip>
                                  </TooltipProvider>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
        {tasks.map(task => 
            task.dependencies.map(depId => {
                const startTaskExists = tasks.some(t => t.id === depId);
                const endTaskExists = tasks.some(t => t.id === task.id);
                if (!startTaskExists || !endTaskExists) return null;
                
                const isCritical = criticalPath.has(task.id) && criticalPath.has(depId);
                return (
                 <Xarrow
                    key={`${depId}-${task.id}`}
                    start={`task-bar-${depId}`}
                    end={`task-bar-${task.id}`}
                    startAnchor="right"
                    endAnchor="left"
                    color={isCritical ? "#ef4444" : "#fb923c"}
                    strokeWidth={isCritical ? 2 : 1.5}
                    path="grid"
                    gridBreak="20%"
                    headSize={5}
                    zIndex={10}
                 />
                )
            })
        )}
    </Xwrapper>
  );
};
