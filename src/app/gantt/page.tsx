
'use client';

import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth, getDaysInMonth } from 'date-fns';
import { Plus, Crown, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type TaskType = 'task' | 'milestone' | 'group';

type Task = {
  id: number;
  name: string;
  start: Date;
  end: Date;
  type: TaskType;
  progress: number; // 0-100
  dependencies: number[]; // Array of task IDs
  assignee?: string;
  parentId?: number | null;
};

type View = 'day' | 'week' | 'month';

const COLORS = [
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
];

const findCriticalPath = (tasks: Task[]): Set<number> => {
    if (!tasks || tasks.length === 0) {
        return new Set();
    }

    const taskMap = new Map<number, Task>(tasks.map(task => [task.id, task]));
    const memo = new Map<number, { path: number[]; endDate: Date }>();

    function findLongestPath(taskId: number): { path: number[]; endDate: Date } {
        if (memo.has(taskId)) {
            return memo.get(taskId)!;
        }

        const task = taskMap.get(taskId);
        if (!task) {
            return { path: [], endDate: new Date(0) };
        }

        const dependents = tasks.filter(t => t.dependencies.includes(taskId));
        
        if (dependents.length === 0) {
             const path = [taskId];
             let currentTask = task;
             
             while(currentTask && currentTask.dependencies.length > 0) {
                const predecessorId = currentTask.dependencies[0];
                const predecessor = taskMap.get(predecessorId);
                if(!predecessor) break;
                path.unshift(predecessor.id);
                currentTask = predecessor;
             }
             return { path, endDate: task.end };
        }

        let longestSubPath: number[] = [];
        let maxEndDate = new Date(0);

        dependents.forEach(dependent => {
            const { path: subPath, endDate: subEndDate } = findLongestPath(dependent.id);
            if (subEndDate > maxEndDate) {
                maxEndDate = subEndDate;
                longestSubPath = subPath;
            }
        });
        
        const result = {
            path: [taskId, ...longestSubPath],
            endDate: maxEndDate
        };
        
        memo.set(taskId, result);
        return result;
    }

    let criticalPath: number[] = [];
    let finalEndDate = new Date(0);

    const startNodes = tasks.filter(t => t.dependencies.length === 0);

    startNodes.forEach(startNode => {
        const { path, endDate } = findLongestPath(startNode.id);
        if (endDate > finalEndDate) {
            finalEndDate = endDate;
            criticalPath = path;
        }
    });
    
    // Ensure all tasks in the final path exist
    const existingCriticalPath = criticalPath.filter(id => taskMap.has(id));

    return new Set(existingCriticalPath);
};


const GanttDisplay = ({ tasks, view, onAddTask, onDeleteTask, criticalPath }: { tasks: Task[]; view: View; onAddTask: (name: string) => void; onDeleteTask: (id: number) => void; criticalPath: Set<number>; }) => {
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

        // Add any orphaned children just in case
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

        if (view === 'day') {
            current = startOfWeek(startDate);
            const final = addDays(endDate, 30);
            while(current <= final) {
                headers.push({
                    main: `Week of ${format(current, 'MMM d')}`,
                    sub: Array.from({length: 7}).map((_, i) => format(addDays(current, i), 'E d'))
                })
                current = addDays(current, 7);
            }
        } else if (view === 'week') {
            current = startOfMonth(startDate);
            const final = addDays(endDate, 30);
            while(current <= final) {
                const monthName = format(current, 'MMMM yyyy');
                const weekStarts = [];
                let weekStart = startOfWeek(current, { weekStartsOn: 1 });
                const monthEnd = addDays(startOfMonth(addDays(current, 35)), -1);
                while(weekStart <= monthEnd) {
                    weekStarts.push(`W${format(weekStart, 'w')}`);
                    weekStart = addDays(weekStart, 7);
                }
                headers.push({ main: monthName, sub: weekStarts });
                current = addDays(startOfMonth(current), 35);
            }
        } else if (view === 'month') {
            let currentYear = startDate.getFullYear();
            const endYear = endDate.getFullYear() + 1;
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

        let totalUnits = 0;
        let taskStartUnit = 0;
        let taskDurationUnits = 0;

        if (view === 'day') {
            totalUnits = differenceInDays(addDays(endDate, 30), startDate);
            taskStartUnit = differenceInDays(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.5 : Math.max(1, differenceInDays(task.end, task.start) + 1);
        } else if (view === 'week') {
            totalUnits = differenceInWeeks(addDays(endDate, 30), startDate);
            taskStartUnit = differenceInWeeks(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.2 : Math.max(1, differenceInWeeks(task.end, task.start));
        } else { // month
            totalUnits = differenceInMonths(addDays(endDate, 30), startDate);
            taskStartUnit = differenceInMonths(task.start, startDate);
            taskDurationUnits = task.type === 'milestone' ? 0.1 : Math.max(1, differenceInMonths(task.end, task.start));
        }
        
        if (totalUnits === 0) return {left: 0, width: 0};

        const unitWidth = 100 / totalUnits;
        return {
            left: taskStartUnit * unitWidth,
            width: taskDurationUnits * unitWidth
        };
    }

  return (
    <Xwrapper>
        <div className="border rounded-lg bg-card overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `300px 1fr`}}>
                {/* Header */}
                <div className="bg-muted/50 border-r">
                    <div className="p-2 h-20 flex items-center font-semibold border-b">Tasks</div>
                </div>
                <div className="overflow-x-auto">
                    <div className="sticky top-0 z-20 bg-card">
                    {timelineHeaders.map((header, i) => (
                        <div key={i} className="flex flex-col whitespace-nowrap">
                            <div className="p-2 font-semibold text-center border-b">{header.main}</div>
                            <div className="grid" style={{gridTemplateColumns: `repeat(${header.sub.length}, minmax(60px, 1fr))`}}>
                                {header.sub.map((sub, j) => (
                                    <div key={j} className="p-2 text-xs text-center border-b border-r text-muted-foreground">{sub}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Rows */}
                <div className="bg-muted/50 border-r overflow-y-auto" style={{maxHeight: '60vh'}}>
                    {processedTasks.map((task) => (
                        <div
                          id={`task-name-${task.id}`}
                          key={task.id}
                          className="h-10 flex items-center justify-between group text-sm border-b"
                          style={{ paddingLeft: `${(task as any).level * 1.5 + 0.5}rem`}}
                          title={task.name}
                        >
                            <span className={cn("truncate", {"font-bold": task.type === 'group'})}>{task.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1 opacity-0 group-hover:opacity-100" onClick={() => onDeleteTask(task.id)}>
                                <Plus className="h-4 w-4 rotate-45" />
                            </Button>
                        </div>
                    ))}
                    {/* Add Task Row */}
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
                <div className="overflow-x-auto overflow-y-auto" style={{maxHeight: '60vh'}}>
                    <div className="relative">
                        {processedTasks.map((task, index) => {
                             const { left, width } = getTaskPosition(task);
                             const isMilestone = task.type === 'milestone';
                             const isCritical = criticalPath.has(task.id);

                             if (task.type === 'group') {
                                return <div key={task.id} className="h-10 border-b"></div>
                             }
                            
                            return (
                                <div key={task.id} className="h-10 border-b relative flex items-center">
                                  <TooltipProvider>
                                  <Tooltip>
                                  <TooltipTrigger asChild>
                                  <div
                                      id={`task-bar-${task.id}`}
                                      className={cn("absolute h-6 flex items-center rounded-sm text-white text-xs truncate", COLORS[index % COLORS.length], {
                                          "ring-2 ring-red-500 ring-offset-2 ring-offset-card": isCritical,
                                          "w-6 h-6 transform rotate-45 !rounded-none": isMilestone,
                                          "bg-opacity-50": task.type === 'group'
                                      })}
                                      style={{ left: `${left}%`, width: isMilestone ? '20px' : `${width}%` }}
                                  >
                                      {!isMilestone && (
                                        <>
                                        <div className="absolute top-0 left-0 h-full bg-black/30 rounded-sm" style={{ width: `${task.progress}%` }}></div>
                                        <span className="truncate z-10 px-2">{task.name}</span>
                                        </>
                                      )}
                                  </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{task.name}</p>
                                      <p>Start: {format(task.start, 'MMM d, yyyy')}</p>
                                      <p>End: {format(task.end, 'MMM d, yyyy')}</p>
                                      <p>Progress: {task.progress}%</p>
                                  </TooltipContent>
                                  </Tooltip>
                                  </TooltipProvider>
                                </div>
                            )
                        })}
                        <div className="h-12"></div>
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
                    color={isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={isCritical ? 2 : 1.5}
                    path="grid"
                    headSize={5}
                    zIndex={10}
                 />
                )
            })
        )}
    </Xwrapper>
  );
};

const getTemplates = (): Record<string, Task[]> => {
    const today = new Date();
    const year = today.getFullYear();
    return {
        marketingCampaign: [
            { id: 1, name: 'Marketing Campaign Draft', start: new Date(year, 5, 20), end: new Date(year, 5, 27), type: 'task', progress: 100, dependencies: [], parentId: null },
            { id: 2, name: 'New Ad Campaign', start: new Date(year, 5, 28), end: new Date(year, 5, 28), type: 'milestone', progress: 100, dependencies: [1], parentId: null },
            { id: 3, name: 'Sales Team Group', start: new Date(year, 6, 1), end: new Date(year, 6, 11), type: 'group', progress: 0, dependencies: [2], parentId: null },
            { id: 4, name: 'High Resolution Banner Printing', start: new Date(year, 6, 1), end: new Date(year, 6, 8), type: 'task', progress: 50, dependencies: [], parentId: 3 },
            { id: 5, name: 'Sales reports for sales team group meeting', start: new Date(year, 6, 9), end: new Date(year, 6, 11), type: 'task', progress: 20, dependencies: [4], parentId: 3 },
            { id: 6, name: 'New Summer Banner', start: new Date(year, 6, 5), end: new Date(year, 6, 12), type: 'task', progress: 30, dependencies: [], parentId: 3 }
        ],
        projectDevelopment: [
            { id: 1, name: 'Requirement Gathering', start: today, end: addDays(today, 7), type: 'task', progress: 90, dependencies: [], parentId: null },
            { id: 2, name: 'UI/UX Design', start: addDays(today, 8), end: addDays(today, 20), type: 'task', progress: 60, dependencies: [1], parentId: null },
            { id: 3, name: 'Design Approval', start: addDays(today, 21), end: addDays(today, 21), type: 'milestone', progress: 100, dependencies: [2], parentId: null },
            { id: 4, name: 'Development', start: addDays(today, 22), end: addDays(today, 55), type: 'group', progress: 0, dependencies: [3], parentId: null},
            { id: 5, name: 'Frontend Development', start: addDays(today, 22), end: addDays(today, 45), type: 'task', progress: 30, dependencies: [], parentId: 4 },
            { id: 6, name: 'Backend Development', start: addDays(today, 22), end: addDays(today, 50), type: 'task', progress: 40, dependencies: [], parentId: 4 },
            { id: 7, name: 'API Integration', start: addDays(today, 51), end: addDays(today, 55), type: 'task', progress: 15, dependencies: [5, 6], parentId: 4 },
            { id: 8, name: 'UAT', start: addDays(today, 56), end: addDays(today, 63), type: 'task', progress: 0, dependencies: [7], parentId: null },
            { id: 9, name: 'Go Live', start: addDays(today, 65), end: addDays(today, 65), type: 'milestone', progress: 0, dependencies: [8], parentId: null },
        ],
        eventPlanning: [
            { id: 1, name: 'Planning Phase', start: today, end: addDays(today, 15), type: 'group', progress: 0, dependencies: [], parentId: null },
            { id: 2, name: 'Define Event Goals', start: today, end: addDays(today, 3), type: 'task', progress: 100, dependencies: [], parentId: 1 },
            { id: 3, name: 'Budget Finalization', start: addDays(today, 4), end: addDays(today, 7), type: 'task', progress: 95, dependencies: [2], parentId: 1 },
            { id: 4, name: 'Venue Selection & Booking', start: addDays(today, 8), end: addDays(today, 15), type: 'task', progress: 80, dependencies: [3], parentId: 1 },
            { id: 5, name: 'Vendor Contracts', start: addDays(today, 16), end: addDays(today, 30), type: 'task', progress: 50, dependencies: [4], parentId: null },
            { id: 6, name: 'Marketing Campaign Launch', start: addDays(today, 25), end: addDays(today, 55), type: 'task', progress: 25, dependencies: [3], parentId: null },
            { id: 7, name: 'Ticket Sales Live', start: addDays(today, 31), end: addDays(today, 31), type: 'milestone', progress: 100, dependencies: [5, 6], parentId: null },
            { id: 8, name: 'Event Execution', start: addDays(today, 58), end: addDays(today, 61), type: 'group', progress: 0, dependencies: [7], parentId: null },
            { id: 9, name: 'On-site Prep', start: addDays(today, 58), end: addDays(today, 60), type: 'task', progress: 0, dependencies: [], parentId: 8 },
            { id: 10, name: 'Event Day', start: addDays(today, 61), end: addDays(today, 61), type: 'task', progress: 0, dependencies: [9], parentId: 8 },
        ],
    }
};

const TemplateMenuItem = ({ title, description, onClick }: { title: string; description: string; onClick: () => void }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <DropdownMenuItem onClick={onClick} className="flex-col items-start">
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
                <p>{description}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export default function GanttPage() {
  const { user, isSubscribed, setSubscribed } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [view, setView] = useState<View>('week');
  const [templates, setTemplates] = useState<ReturnType<typeof getTemplates> | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  const criticalPath = useMemo(() => {
    return showCriticalPath ? findCriticalPath(tasks) : new Set<number>();
  }, [tasks, showCriticalPath]);

   useEffect(() => {
    // Ensure templates are generated only on the client
    setTemplates(getTemplates());
  }, []);
  
   useEffect(() => {
    // Load a default template on initial mount
    if(templates && tasks.length === 0) {
        setTasks(templates.marketingCampaign);
    }
   }, [templates, tasks.length]);


  const handleAddTask = (name: string) => {
    if (!name.trim()) return;
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;
    const newStart = lastTask ? addDays(lastTask.end, 1) : new Date();
    setTasks([
      ...tasks,
      { id: newId, name, start: newStart, end: addDays(newStart, 2), type: 'task', progress: 0, dependencies: [], parentId: null },
    ]);
  };
  
  const handleDeleteTask = (id: number) => {
      setTasks(currentTasks => currentTasks.filter(task => task.id !== id).map(task => ({
          ...task,
          dependencies: task.dependencies.filter(depId => depId !== id)
      })));
  }
  
  const handleSubscribeClick = () => {
      if (!user) {
          router.push('/login');
      } else {
          setIsPaymentDialogOpen(true);
      }
  }

  const handlePaymentSuccess = (type: 'onetime' | 'subscription') => {
      if (type === 'subscription') {
          setSubscribed(true);
      }
      setIsPaymentDialogOpen(false);
      setIsSuccessDialogOpen(true);
  }

  const handleSelectTemplate = (templateName: keyof NonNullable<typeof templates>) => {
    if(templates) {
        setTasks(templates[templateName]);
    }
  }

  if (!user || !isSubscribed) {
      return (
        <>
            <PaymentDialog 
                isOpen={isPaymentDialogOpen} 
                onClose={() => setIsPaymentDialogOpen(false)} 
                onSuccess={handlePaymentSuccess}
            />
             <SuccessDialog
                isOpen={isSuccessDialogOpen}
                onClose={() => setIsSuccessDialogOpen(false)}
             />
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-2xl font-headline">
                            <Crown className="text-primary" />
                            Premium Feature
                        </CardTitle>
                        <CardDescription>
                            The Gantt Chart Maker is available exclusively to our subscribers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">
                            Upgrade your plan to get unlimited access to this tool and create powerful project timelines.
                        </p>
                        <Button onClick={handleSubscribeClick}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Subscribe Now
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
      )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Gantt Chart</h1>
            <p className="text-muted-foreground">Plan and visualize your project timeline.</p>
          </div>
           <div className="flex flex-wrap items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={!templates}>
                            Templates
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Project Templates</DropdownMenuLabel>
                         <TemplateMenuItem 
                            title="Marketing Campaign"
                            description="A sample marketing campaign plan from draft to new summer banner."
                            onClick={() => handleSelectTemplate('marketingCampaign')}
                         />
                         <TemplateMenuItem 
                            title="Project Development Timeline"
                            description="A classic software development lifecycle, from initial requirements gathering and design to UAT and go-live."
                            onClick={() => handleSelectTemplate('projectDevelopment')}
                         />
                         <TemplateMenuItem 
                            title="Event Planning"
                            description="Manage everything from venue booking and vendor contracts to marketing campaigns and on-site prep for a flawless event."
                            onClick={() => handleSelectTemplate('eventPlanning')}
                         />
                    </DropdownMenuContent>
                </DropdownMenu>
                <Tabs value={view} onValueChange={(value) => setView(value as View)} className="w-full md:w-auto">
                    <TabsList>
                        <TabsTrigger value="day">Day</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center space-x-2">
                    <Switch id="critical-path" checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
                    <Label htmlFor="critical-path">Show Critical Path</Label>
                </div>
           </div>
        </div>
        
        <GanttDisplay 
            tasks={tasks} 
            view={view}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            criticalPath={criticalPath}
        />
    </div>
  );
}

    