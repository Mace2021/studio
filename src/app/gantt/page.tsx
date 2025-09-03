
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
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth, getDaysInMonth, max as maxDate } from 'date-fns';
import { Plus, Crown, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type TaskType = 'task' | 'milestone';

type Task = {
  id: number;
  name: string;
  start: Date;
  end: Date;
  type: TaskType;
  progress: number; // 0-100
  dependencies: number[]; // Array of task IDs
  assignee?: string;
};

type View = 'day' | 'week' | 'month';

const COLORS = [
  "bg-blue-500/80",
  "bg-green-500/80",
  "bg-yellow-500/80",
  "bg-purple-500/80",
  "bg-pink-500/80",
  "bg-indigo-500/80",
  "bg-teal-500/80",
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
             while(currentTask.dependencies.length > 0) {
                const predecessor = taskMap.get(currentTask.dependencies[0]); // Simple case, assumes one dependency
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

    return new Set(criticalPath);
};


const GanttDisplay = ({ tasks, view, onAddTask, onDeleteTask, criticalPath }: { tasks: Task[]; view: View; onAddTask: (name: string) => void; onDeleteTask: (id: number) => void; criticalPath: Set<number>; }) => {
    const [newTaskName, setNewTaskName] = useState('');
    const gridRef = useRef<HTMLDivElement>(null);
    
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
        const headers = [];
        if (view === 'day') {
            const totalDays = differenceInDays(endDate, startDate) + 10;
            for (let i = 0; i <= totalDays; i++) {
                headers.push({ label: format(addDays(startDate, i), 'M/d'), start: addDays(startDate, i) });
            }
        } else if (view === 'week') {
             let currentWeek = startOfWeek(startDate, { weekStartsOn: 1 });
            const lastWeek = startOfWeek(addDays(endDate, 7), { weekStartsOn: 1 });
            while (currentWeek <= lastWeek) {
                headers.push({ label: `Week of ${format(currentWeek, 'MMM d')}`, start: currentWeek });
                currentWeek = addDays(currentWeek, 7);
            }
        } else if (view === 'month') {
            let currentMonth = startOfMonth(startDate);
            const lastMonth = startOfMonth(addDays(endDate, 30));
             while(currentMonth <= lastMonth) {
                headers.push({ label: format(currentMonth, 'MMMM yyyy'), start: currentMonth });
                currentMonth = addDays(currentMonth, getDaysInMonth(currentMonth) + 1);
                currentMonth = startOfMonth(currentMonth);
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
        if (!startDate) return { offset: 0, duration: 0 };
        
        let offset, duration;
        
        switch (view) {
            case 'day':
                offset = differenceInDays(task.start, startDate);
                duration = task.type === 'milestone' ? 0.5 : Math.max(1, differenceInDays(task.end, task.start) + 1);
                break;
            case 'week':
                offset = differenceInWeeks(task.start, startDate, { weekStartsOn: 1 });
                const endWeek = differenceInWeeks(task.end, startDate, { weekStartsOn: 1 });
                duration = task.type === 'milestone' ? (1 / 14) : Math.max(1, endWeek - offset + 1);
                break;
            case 'month':
                offset = differenceInMonths(task.start, startDate);
                const endMonth = differenceInMonths(task.end, startDate);
                duration = task.type === 'milestone' ? (1 / 60) : Math.max(1, endMonth - offset + 1);
                break;
            default:
                offset = 0;
                duration = 0;
        }
        
        return { offset: Math.max(0, offset), duration };
    }

  return (
    <Xwrapper>
        <div className="overflow-x-auto border rounded-md bg-card">
            <div ref={gridRef} className="grid relative" style={{ gridTemplateColumns: `250px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`, minWidth: `${250 + timelineHeaders.length * 100}px` }}>
                {/* Header */}
                <div className="sticky left-0 top-0 z-20 border-b border-r bg-muted/50 p-2 font-semibold">Task</div>
                {timelineHeaders.map((header, index) => (
                    <div key={index} className="sticky top-0 z-20 border-b border-r p-2 text-center text-xs font-medium">
                        {header.label}
                    </div>
                ))}

                {/* Rows */}
                {tasks.map((task, index) => {
                    const { offset, duration } = getTaskPosition(task);
                    const isMilestone = task.type === 'milestone';
                    const isCritical = criticalPath.has(task.id);

                    const gridColumnStart = Math.floor(offset) + 2;
                    const gridColumnEnd = `span ${Math.ceil(duration)}`;
                    
                    const leftPercentage = (offset / timelineHeaders.length) * 100;
                    const widthPercentage = (duration / timelineHeaders.length) * 100;

                    return (
                        <React.Fragment key={task.id}>
                            <div className="sticky left-0 z-10 truncate border-b border-r bg-card p-2 text-sm h-12 flex items-center justify-between group" title={task.name}>
                                {task.name}
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDeleteTask(task.id)}>
                                    <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                            </div>
                            <div className="border-b" style={{ gridColumn: `2 / span ${timelineHeaders.length}`}}>
                                <div className="relative h-12">
                                <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                <div
                                    id={`task-${task.id}`}
                                    className={cn("absolute h-8 top-2 flex items-center justify-between px-2 rounded-md text-white text-xs truncate", COLORS[index % COLORS.length], {
                                        "ring-2 ring-red-500 ring-offset-2 ring-offset-card": isCritical,
                                        "w-8 h-8 transform rotate-45": isMilestone
                                    })}
                                    style={{ 
                                        left: `${leftPercentage}%`,
                                        width: isMilestone ? '2rem' : `${widthPercentage}%`,
                                    }}
                                >
                                    {!isMilestone && <div className="absolute top-0 left-0 h-full bg-black/30 rounded-l-md" style={{ width: `${task.progress}%` }}></div>}
                                    <span className="truncate z-10 px-1" style={{ transform: isMilestone ? 'rotate(-45deg)' : 'none' }}>{!isMilestone ? task.name : ''}</span>
                                    {task.assignee && !isMilestone && (
                                        <span className="text-xs ml-2 bg-black/20 px-1.5 py-0.5 rounded-full z-10">{task.assignee}</span>
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
                            </div>
                        </React.Fragment>
                    )
                })}
                {/* Add Task Row */}
                 <div className="sticky left-0 z-10 truncate border-r bg-card p-2 text-sm h-12 flex items-center">
                     <input
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Add a new task..."
                        className="bg-transparent border-none focus:outline-none w-full text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleAddTaskClick()}
                    />
                 </div>
            </div>
        </div>
        {tasks.map(task => 
            task.dependencies.map(depId => {
                const startTaskExists = tasks.some(t => t.id === depId);
                if (!startTaskExists) return null;
                const isCritical = criticalPath.has(task.id) && criticalPath.has(depId);
                return (
                 <Xarrow
                    key={`${depId}-${task.id}`}
                    start={`task-${depId}`}
                    end={`task-${task.id}`}
                    startAnchor="right"
                    endAnchor="left"
                    color={isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={isCritical ? 2.5 : 1.5}
                    path="grid"
                    headSize={4}
                    zIndex={10}
                 />
                )
            })
        )}
    </Xwrapper>
  );
};

const getTemplates = () => {
    const today = new Date();
    const year = today.getFullYear();
    return {
        q4Project: [
                { id: 1, name: 'Q4 Planning', start: new Date(year, 9, 1), end: new Date(year, 9, 5), type: 'task', progress: 100, dependencies: [], assignee: 'Manager' },
                { id: 2, name: 'Feature A Dev', start: new Date(year, 9, 6), end: new Date(year, 9, 31), type: 'task', progress: 80, dependencies: [1], assignee: 'Dev Team' },
                { id: 3, name: 'Feature B Dev', start: new Date(year, 10, 1), end: new Date(year, 10, 20), type: 'task', progress: 40, dependencies: [1], assignee: 'Dev Team' },
                { id: 4, name: 'Mid-Q Review', start: new Date(year, 10, 21), end: new Date(year, 10, 21), type: 'milestone', progress: 100, dependencies: [2,3] },
                { id: 5, name: 'Testing & QA', start: new Date(year, 10, 22), end: new Date(year, 11, 10), type: 'task', progress: 20, dependencies: [4], assignee: 'QA Team' },
                { id: 6, name: 'Deployment', start: new Date(year, 11, 15), end: new Date(year, 11, 15), type: 'milestone', progress: 0, dependencies: [5] },
                { id: 7, name: 'Holiday Code Freeze', start: new Date(year, 11, 20), end: new Date(year, 11, 31), type: 'task', progress: 10, dependencies: [6] },
            ],
        projectDevelopment: [
                { id: 1, name: 'Requirement Gathering', start: today, end: addDays(today, 7), type: 'task', progress: 90, dependencies: [], assignee: 'Analyst' },
                { id: 2, name: 'UI/UX Design', start: addDays(today, 8), end: addDays(today, 20), type: 'task', progress: 60, dependencies: [1], assignee: 'Designer' },
                { id: 3, name: 'Design Approval', start: addDays(today, 21), end: addDays(today, 21), type: 'milestone', progress: 100, dependencies: [2] },
                { id: 4, name: 'Frontend Development', start: addDays(today, 22), end: addDays(today, 45), type: 'task', progress: 30, dependencies: [3], assignee: 'FE Devs' },
                { id: 5, name: 'Backend Development', start: addDays(today, 22), end: addDays(today, 50), type: 'task', progress: 40, dependencies: [3], assignee: 'BE Devs' },
                { id: 6, name: 'API Integration', start: addDays(today, 51), end: addDays(today, 55), type: 'task', progress: 15, dependencies: [4, 5] },
                { id: 7, name: 'UAT', start: addDays(today, 56), end: addDays(today, 63), type: 'task', progress: 0, dependencies: [6] },
                { id: 8, name: 'Go Live', start: addDays(today, 65), end: addDays(today, 65), type: 'milestone', progress: 0, dependencies: [7] },
            ],
        eventPlanning: [
                { id: 1, name: 'Define Event Goals', start: today, end: addDays(today, 3), type: 'task', progress: 100, dependencies: [], assignee: 'Coordinator' },
                { id: 2, name: 'Budget Finalization', start: addDays(today, 4), end: addDays(today, 7), type: 'task', progress: 95, dependencies: [1] },
                { id: 3, name: 'Venue Selection & Booking', start: addDays(today, 8), end: addDays(today, 15), type: 'task', progress: 80, dependencies: [2], assignee: 'Coordinator' },
                { id: 4, name: 'Vendor Contracts', start: addDays(today, 16), end: addDays(today, 30), type: 'task', progress: 50, dependencies: [3], assignee: 'Logistics' },
                { id: 5, name: 'Marketing Campaign Launch', start: addDays(today, 25), end: addDays(today, 55), type: 'task', progress: 25, dependencies: [2], assignee: 'Marketing' },
                { id: 6, name: 'Ticket Sales Live', start: addDays(today, 31), end: addDays(today, 31), type: 'milestone', progress: 100, dependencies: [4, 5] },
                { id: 7, name: 'On-site Prep', start: addDays(today, 58), end: addDays(today, 60), type: 'task', progress: 0, dependencies: [6] },
                { id: 8, name: 'Event Day', start: addDays(today, 61), end: addDays(today, 61), type: 'task', progress: 0, dependencies: [7] },
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
    setTemplates(getTemplates());
  }, []);

  const handleAddTask = (name: string) => {
    if (!name.trim()) return;
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;
    const newStart = lastTask ? addDays(lastTask.end, 1) : new Date();
    setTasks([
      ...tasks,
      { id: newId, name, start: newStart, end: addDays(newStart, 2), type: 'task', progress: 0, dependencies: [], assignee: '' },
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

  const handleSelectTemplate = (template: keyof ReturnType<typeof getTemplates>) => {
    if(templates) {
        setTasks(templates[template]);
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
            <h1 className="text-3xl font-bold tracking-tight font-headline">Gantt Chart Maker</h1>
            <p className="text-muted-foreground">Plan and visualize your project timeline with advanced features.</p>
          </div>
           <div className="flex flex-wrap items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Features
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Gantt Chart Features</DropdownMenuLabel>
                         <DropdownMenuItem onClick={() => setIsPaymentDialogOpen(true)}>
                            Exporting to PDF
                         </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                            title="Q4 Project Schedule"
                            description="Perfect for year-end sprints, product launches, and hitting critical targets before the holidays."
                            onClick={() => handleSelectTemplate('q4Project')}
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
