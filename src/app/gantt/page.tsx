
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { format, differenceInDays, addDays, differenceInWeeks, differenceInMonths, startOfWeek, startOfMonth, getDaysInMonth, isSameDay } from 'date-fns';
import { Plus, Trash2, CalendarIcon, Crown, Sparkles, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';
import Xarrow, { Xwrapper } from 'react-xarrows';
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

const GanttDisplay = ({ tasks, view }: { tasks: Task[]; view: View }) => {
    const taskRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

    useEffect(() => {
        taskRefs.current.clear();
        tasks.forEach(task => {
            taskRefs.current.set(task.id, null);
        });
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Add tasks to see your Gantt chart.</p>
            </div>
        );
    }
  const startDate = useMemo(() => startOfWeek(new Date(Math.min(...tasks.map(t => t.start.getTime())))), [tasks]);
  const endDate = useMemo(() => new Date(Math.max(...tasks.map(t => t.end.getTime()))), [tasks]);

  const timelineHeaders = useMemo(() => {
    const headers = [];
    let current = startDate;
    if (view === 'day') {
        const totalDays = differenceInDays(endDate, startDate) + 1;
        for (let i = 0; i < totalDays; i++) {
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
    return headers;
  }, [startDate, endDate, view]);

  const getTaskPosition = (task: Task) => {
    if (view === 'day') {
        const offset = differenceInDays(task.start, startDate);
        const duration = task.type === 'milestone' ? 1 : Math.max(1, differenceInDays(task.end, task.start) + 1);
        return { offset, duration };
    }
    if (view === 'week') {
        const offset = differenceInWeeks(task.start, startDate);
        const duration = task.type === 'milestone' ? 1 : Math.max(1, differenceInWeeks(task.end, task.start) + 1);
        return { offset, duration };
    }
    if (view === 'month') {
        const offset = differenceInMonths(task.start, startDate);
        const duration = task.type === 'milestone' ? 1 : Math.max(1, differenceInMonths(task.end, task.start) + 1);
        return { offset, duration };
    }
    return { offset: 0, duration: 0};
  }

  return (
    <Xwrapper>
        <div className="space-y-2 overflow-x-auto relative">
            {/* Header */}
            <div className="grid sticky top-0 z-20 bg-background" style={{ gridTemplateColumns: `150px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`}}>
                <div className="sticky left-0 z-10 border-b border-r bg-muted/50 p-2 font-semibold">Task</div>
                 {timelineHeaders.map(header => (
                     <div key={header.label} className="border-b p-2 text-center text-xs font-medium">
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
                        <div key={task.id} className="grid items-center h-12" style={{ gridTemplateColumns: `150px repeat(${timelineHeaders.length}, minmax(100px, 1fr))`}}>
                            <div className="sticky left-0 z-10 truncate border-r bg-muted/50 p-2 text-sm h-full flex items-center" title={task.name}>{task.name}</div>
                            <div style={{ gridColumnStart: Math.max(offset, 0) + 2, gridColumnEnd: `span ${duration}` }} className="px-1 h-full flex items-center">
                                <div
                                    id={`task-${task.id}`}
                                    ref={el => taskRefs.current.set(task.id, el)}
                                    className={cn("h-8 flex items-center justify-between px-2 rounded-md text-white text-xs truncate relative", COLORS[index % COLORS.length])}
                                    style={{ width: isMilestone ? '2rem' : '100%', transform: isMilestone ? 'rotate(45deg)' : 'none' }}
                                >
                                     {!isMilestone && <div className="absolute top-0 left-0 h-full bg-black/30 rounded-md" style={{ width: `${task.progress}%` }}></div>}
                                     <span className="truncate z-10" style={{ transform: isMilestone ? 'rotate(-45deg)' : 'none' }}>{!isMilestone ? task.name : ''}</span>
                                     {task.assignee && !isMilestone && (
                                         <span className="text-xs ml-2 bg-black/20 px-1 rounded-full z-10">{task.assignee}</span>
                                     )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
        {tasks.map(task => 
            task.dependencies.map(depId => (
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
                 />
            ))
        )}
    </Xwrapper>
  );
};

export default function GanttPage() {
  const { user, isSubscribed, setSubscribed } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, name: 'Planning', start: new Date(), end: addDays(new Date(), 4), type: 'task', progress: 80, dependencies: [], assignee: 'Alice' },
    { id: 2, name: 'Design Phase', start: addDays(new Date(), 5), end: addDays(new Date(), 10), type: 'task', progress: 50, dependencies: [1], assignee: 'Bob' },
    { id: 3, name: 'Initial Design Review', start: addDays(new Date(), 11), end: addDays(new Date(), 11), type: 'milestone', progress: 100, dependencies: [2] },
    { id: 4, name: 'Development', start: addDays(new Date(), 12), end: addDays(new Date(), 22), type: 'task', progress: 25, dependencies: [3], assignee: 'Charlie' },
  ]);
  const [newTaskName, setNewTaskName] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [view, setView] = useState<View>('day');


  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const lastTask = tasks[tasks.length - 1];
    const newStart = lastTask ? addDays(lastTask.end, 1) : new Date();
    setTasks([
      ...tasks,
      { id: newId, name: newTaskName, start: newStart, end: addDays(newStart, 2), type: 'task', progress: 0, dependencies: [], assignee: '' },
    ]);
    setNewTaskName('');
  };

  const handleUpdateTask = (id: number, field: keyof Task, value: any) => {
    setTasks(tasks.map(t => {
        if (t.id === id) {
            const updatedTask = { ...t, [field]: value };
            if (field === 'type' && value === 'milestone') {
                updatedTask.end = updatedTask.start;
            }
            if (field === 'dependencies') {
              updatedTask.dependencies = value.split(',').map((s: string) => Number(s.trim())).filter(Boolean);
            }
            return updatedTask;
        }
        return t;
    }));
  };

  const handleRemoveTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
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
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div key={task.id} className="p-3 border rounded-md space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_150px_150px_auto] gap-2 items-center">
                                <Input
                                    value={task.name}
                                    onChange={e => handleUpdateTask(task.id, 'name', e.target.value)}
                                    placeholder="Task Name"
                                />
                                <Select value={task.type} onValueChange={(v: TaskType) => handleUpdateTask(task.id, 'type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="task">Task</SelectItem>
                                        <SelectItem value="milestone">Milestone</SelectItem>
                                    </SelectContent>
                                </Select>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !task.start && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {task.start ? format(task.start, "PPP") : <span>Pick a start date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={task.start} onSelect={(date) => date && handleUpdateTask(task.id, 'start', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !task.end && "text-muted-foreground", task.type === 'milestone' && 'opacity-50 cursor-not-allowed')} disabled={task.type === 'milestone'}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {task.end ? format(task.end, "PPP") : <span>Pick an end date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={task.end} onSelect={(date) => date && handleUpdateTask(task.id, 'end', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                 <Button variant="ghost" size="icon" onClick={() => handleRemoveTask(task.id)}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor={`progress-${task.id}`}>Progress: {task.progress}%</Label>
                                    <Slider id={`progress-${task.id}`} value={[task.progress]} onValueChange={([v]) => handleUpdateTask(task.id, 'progress', v)} max={100} step={5} />
                                </div>
                                <div className="space-y-2">
                                     <Label htmlFor={`assignee-${task.id}`}>Assignee</Label>
                                     <Input id={`assignee-${task.id}`} value={task.assignee || ''} onChange={e => handleUpdateTask(task.id, 'assignee', e.target.value)} placeholder="e.g. Jane Doe" />
                                </div>
                                 <div className="space-y-2">
                                     <Label htmlFor={`dependencies-${task.id}`}>Dependencies (IDs)</Label>
                                     <Input id={`dependencies-${task.id}`} value={task.dependencies.join(', ')} onChange={e => handleUpdateTask(task.id, 'dependencies', e.target.value)} placeholder="e.g. 1, 2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex gap-2 pt-4">
                    <Input
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Add a new task name..."
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    />
                    <Button onClick={handleAddTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Timeline</CardTitle>
                  <Tabs value={view} onValueChange={(value) => setView(value as View)} className="w-full sm:w-auto">
                    <TabsList>
                      <TabsTrigger value="day">Day</TabsTrigger>
                      <TabsTrigger value="week">Week</TabsTrigger>
                      <TabsTrigger value="month">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <GanttDisplay tasks={tasks} view={view} />
            </CardContent>
        </Card>
    </div>
  );
}
    