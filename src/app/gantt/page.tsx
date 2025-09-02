
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth, getDaysInMonth } from 'date-fns';
import { Plus, Crown, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';
import Xarrow, { Xwrapper } from 'react-xarrows';

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

const GanttDisplay = ({ tasks, view, onAddTask }: { tasks: Task[]; view: View; onAddTask: (name: string) => void; }) => {
    const taskRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
    const [newTaskName, setNewTaskName] = useState('');
    const gridRef = useRef<HTMLDivElement>(null);
    const [timelineHeaders, setTimelineHeaders] = useState<{label: string, start: Date}[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);

    useEffect(() => {
        taskRefs.current.clear();
        tasks.forEach(task => {
            taskRefs.current.set(task.id, null);
        });
    }, [tasks]);

    useEffect(() => {
        if (tasks.length === 0) {
            setStartDate(null);
            return;
        }
        const minDate = new Date(Math.min(...tasks.map(t => t.start.getTime())));
        setStartDate(startOfWeek(minDate));
    }, [tasks]);
    
    useEffect(() => {
        if (!startDate || tasks.length === 0) {
            setTimelineHeaders([]);
            return;
        };

        const endDate = new Date(Math.max(...tasks.map(t => t.end.getTime())));
        const headers = [];
        if (view === 'day') {
            const totalDays = differenceInDays(endDate, startDate) + 1;
            for (let i = 0; i <= totalDays; i++) {
                headers.push({ label: format(addDays(startDate, i), 'M/d'), start: addDays(startDate, i) });
            }
        } else if (view === 'week') {
            let weekStart = startOfWeek(startDate);
            while(weekStart <= endDate) {
                headers.push({ label: `Week of ${format(weekStart, 'MMM d')}`, start: weekStart });
                weekStart = addDays(weekStart, 7);
            }
        } else if (view === 'month') {
            let monthStart = startOfMonth(startDate);
            while(monthStart <= endDate) {
                headers.push({ label: format(monthStart, 'MMMM yyyy'), start: monthStart });
                monthStart = addDays(monthStart, getDaysInMonth(monthStart));
            }
        }
        setTimelineHeaders(headers);

    }, [startDate, tasks, view]);


    const handleAddTaskClick = () => {
        if (newTaskName.trim()) {
            onAddTask(newTaskName);
            setNewTaskName('');
        }
    }

    if (tasks.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Add a task or select a template to begin.</p>
            </div>
        );
    }
  

  const getTaskPosition = (task: Task) => {
    if (!startDate) return { offset: 0, duration: 0 };
    if (view === 'day') {
        const offset = differenceInDays(task.start, startDate);
        const duration = task.type === 'milestone' ? 1 : Math.max(1, differenceInDays(task.end, task.start) + 1);
        return { offset, duration };
    }
    if (view === 'week') {
        const offset = differenceInWeeks(task.start, startDate);
        const duration = task.type === 'milestone' ? 0.2 : Math.max(1, differenceInWeeks(task.end, task.start));
        return { offset, duration };
    }
    if (view === 'month') {
        const offset = differenceInMonths(task.start, startDate);
        const duration = task.type === 'milestone' ? 0.1 : Math.max(1, differenceInMonths(task.end, task.start) + 1);
        return { offset: 0, duration: 0 };
    }
    return { offset: 0, duration: 0};
  }

  return (
    <Xwrapper>
        <div ref={gridRef} className="space-y-2 overflow-x-auto relative border rounded-md bg-card">
            {/* Header */}
            <div className="grid sticky top-0 z-20 bg-muted/50" style={{ gridTemplateColumns: `250px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`}}>
                <div className="sticky left-0 z-10 border-b border-r bg-muted/50 p-2 font-semibold">Task</div>
                 {timelineHeaders.map((header, index) => (
                     <div key={index} className="border-b border-l p-2 text-center text-xs font-medium">
                         {header.label}
                     </div>
                 ))}
            </div>
            {/* Rows */}
            <div className="relative">
                {tasks.map((task, index) => {
                    const { offset, duration } = getTaskPosition(task);
                    const isMilestone = task.type === 'milestone';
                    return (
                        <div key={task.id} className="grid items-center h-12 border-b" style={{ gridTemplateColumns: `250px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`}}>
                            <div className="sticky left-0 z-10 truncate border-r bg-card p-2 text-sm h-full flex items-center" title={task.name}>{task.name}</div>
                            <div style={{ gridColumnStart: Math.max(offset, 0) + 2, gridColumnEnd: `span ${Math.max(1, duration)}` }} className="px-1 h-full flex items-center">
                                <div
                                    id={`task-${task.id}`}
                                    ref={el => taskRefs.current.set(task.id, el)}
                                    className={cn("h-8 flex items-center justify-between px-2 rounded-md text-white text-xs truncate relative", COLORS[index % COLORS.length])}
                                    style={{ width: isMilestone ? '2rem' : '100%', transform: isMilestone ? 'rotate(45deg)' : 'none' }}
                                >
                                     {!isMilestone && <div className="absolute top-0 left-0 h-full bg-black/30 rounded-l-md" style={{ width: `${task.progress}%` }}></div>}
                                     <span className="truncate z-10 px-1" style={{ transform: isMilestone ? 'rotate(-45deg)' : 'none' }}>{!isMilestone ? task.name : ''}</span>
                                     {task.assignee && !isMilestone && (
                                         <span className="text-xs ml-2 bg-black/20 px-1.5 py-0.5 rounded-full z-10">{task.assignee}</span>
                                     )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                 <div className="grid items-center h-12" style={{ gridTemplateColumns: `250px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`}}>
                    <div className="sticky left-0 z-10 truncate border-r bg-card p-2 text-sm h-full flex items-center">
                         <div className="flex gap-2 w-full">
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
            </div>
        </div>
        {tasks.map(task => 
            task.dependencies.map(depId => {
                const startTask = tasks.find(t => t.id === depId);
                const endTask = task;
                if (!startTask || !endTask || !gridRef.current) return null;

                return (
                 <Xarrow
                    key={`${depId}-${task.id}`}
                    start={`task-${depId}`}
                    end={`task-${task.id}`}
                    startAnchor="right"
                    endAnchor="left"
                    color="hsl(var(--primary))"
                    strokeWidth={1.5}
                    path="grid"
                    headSize={4}
                    zIndex={10}
                    passProps={{
                       SVGcanvasProps: {
                          style: {
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             pointerEvents: 'none',
                             overflow: 'visible',
                             width: gridRef.current?.scrollWidth,
                             height: gridRef.current?.scrollHeight,
                          }
                       }
                    }}
                 />
                )
            })
        )}
    </Xwrapper>
  );
};

const getTemplates = () => {
    const year = new Date().getFullYear();
    const today = new Date();
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
                { id: 6, name: 'API Integration', start: addDays(today, 46), end: addDays(today, 55), type: 'task', progress: 15, dependencies: [4, 5] },
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


export default function GanttPage() {
  const { user, isSubscribed, setSubscribed } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [view, setView] = useState<View>('week');


  const handleAddTask = (name: string) => {
    if (!name.trim()) return;
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const lastTask = tasks[tasks.length - 1];
    const newStart = lastTask ? addDays(lastTask.end, 1) : new Date();
    setTasks([
      ...tasks,
      { id: newId, name, start: newStart, end: addDays(newStart, 2), type: 'task', progress: 0, dependencies: [], assignee: '' },
    ]);
  };
  
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

  const handleSelectTemplate = (template: 'q4Project' | 'projectDevelopment' | 'eventPlanning') => {
    setTasks(getTemplates()[template]);
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
           <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Templates
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSelectTemplate('q4Project')}>Q4 Project Schedule</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSelectTemplate('projectDevelopment')}>Project Development Timeline</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSelectTemplate('eventPlanning')}>Event Planning</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Tabs value={view} onValueChange={(value) => setView(value as View)} className="w-full md:w-auto">
                    <TabsList>
                        <TabsTrigger value="day">Day</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                    </TabsList>
                </Tabs>
           </div>
        </div>
        
        <GanttDisplay 
            tasks={tasks} 
            view={view}
            onAddTask={handleAddTask}
        />
    </div>
  );
}
    

    