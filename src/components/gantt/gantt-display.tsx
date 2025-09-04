
'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth } from 'date-fns';
import { Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Xarrow, { Xwrapper } from 'react-xarrows';
import type { Task } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


type View = 'day' | 'week' | 'month';

const COLORS = [
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
];


export const GanttDisplay = ({ tasks, view, onAddTask, onDeleteTask, criticalPath }: { tasks: Task[]; view: View; onAddTask: (name: string) => void; onDeleteTask: (id: number) => void; criticalPath: Set<number>; }) => {
    const [newTaskName, setNewTaskName] = useState('');

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
        const finalDate = addDays(endDate, 7); 

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
                current = addDays(startOfMonth(addDays(current, 35)), 1);
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

    const handleAddTaskClick = () => {
        if (newTaskName.trim()) {
            onAddTask(newTaskName);
            setNewTaskName('');
        }
    }

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
        } else { 
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
        <div className="border rounded-lg bg-card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `minmax(350px, 1.5fr) 4fr`}}>
                <div className="bg-muted/50 border-r">
                    <div className="grid grid-cols-5 p-2 h-16 items-center font-semibold border-b text-sm">
                        <div className="col-span-3">Tasks</div>
                        <div className="col-span-2 text-center">Assignee</div>
                    </div>
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
                        >
                            <span className={cn("truncate", {"font-semibold": task.type === 'group'})} title={task.name}>{task.name}</span>
                            <div className="flex items-center gap-2 pr-2">
                                {task.assignee && (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-xs">
                                                        {task.assignee.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{task.assignee}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                     </TooltipProvider>
                                )}
                                 <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDeleteTask(task.id)}>
                                    <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                            </div>
                        </div>
                    ))}
                     <div className="h-12 flex items-center p-2">
                        <input
                            value={newTaskName}
                            onChange={e => setNewTaskName(e.target.value)}
                            placeholder="+ Add new task"
                            className="bg-transparent border-none focus:outline-none w-full text-sm placeholder:text-muted-foreground"
                            onKeyDown={e => e.key === 'Enter' && handleAddTaskClick()}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto" style={{maxHeight: 'calc(60vh + 48px)'}}>
                    <div className="relative">
                        {/* Grid lines */}
                        <div className="absolute inset-0 grid grid-cols-1">
                             {processedTasks.map((task) => (
                                <div key={task.id} className="h-12 border-b"></div>
                             ))}
                        </div>
                         <div className="absolute inset-0 grid" style={{gridTemplateColumns: `repeat(${timelineHeaders[0]?.sub.length ?? 1}, minmax(60px, 1fr))`}}>
                                {timelineHeaders[0]?.sub.map((_, j) => (
                                    <div key={j} className="border-r h-full"></div>
                                ))}
                         </div>
                        
                        {processedTasks.map((task, index) => {
                             const { left, width } = getTaskPosition(task);
                             const isMilestone = task.type === 'milestone';
                             const isCritical = criticalPath.has(task.id);

                             if (task.type === 'group') {
                                return <div key={task.id} className="h-12 border-b"></div>
                             }
                            
                            return (
                                <div key={task.id} className="h-12 border-b relative flex items-center px-1">
                                  <TooltipProvider>
                                  <Tooltip>
                                  <TooltipTrigger asChild>
                                  <div
                                      id={`task-bar-${task.id}`}
                                      className={cn("absolute h-8 flex items-center rounded text-white text-xs truncate z-20", COLORS[index % COLORS.length], {
                                          "ring-2 ring-red-500 ring-offset-2 ring-offset-card": isCritical,
                                          "!w-6 !h-6 transform rotate-45 !rounded-none": isMilestone,
                                          "bg-opacity-50": task.type === 'group'
                                      })}
                                      style={{ left: `${left}%`, width: isMilestone ? '24px' : `${width}%` }}
                                  >
                                    {!isMilestone && (
                                        <>
                                        <div className="absolute top-0 left-0 h-full bg-black/30 rounded" style={{ width: `${task.progress}%` }}></div>
                                        <span className="truncate z-10 px-2 font-medium">{task.name}</span>
                                        </>
                                      )}
                                  </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{task.name}</p>
                                      <p>Start: {format(task.start, 'MMM d, yyyy')}</p>
                                      <p>End: {format(task.end, 'MMM d, yyyy')}</p>
                                      <p>Progress: {task.progress}%</p>
                                      {task.assignee && <p>Assignee: {task.assignee}</p>}
                                       {isCritical && <p className="text-red-500 font-bold">On Critical Path</p>}
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
                    color={isCritical ? "#ef4444" : "hsl(var(--primary))"}
                    strokeWidth={isCritical ? 2 : 1.5}
                    path="grid"
                    gridBreak="20%"
                    headSize={5}
                    zIndex={30}
                 />
                )
            })
        )}
    </Xwrapper>
  );
};
