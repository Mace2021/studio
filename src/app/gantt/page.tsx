
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, addDays } from 'date-fns';
import { Plus, Trash2, CalendarIcon, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';

type Task = {
  id: number;
  name: string;
  start: Date;
  end: Date;
};

const GanttDisplay = ({ tasks }: { tasks: Task[] }) => {
    if (tasks.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Add tasks to see your Gantt chart.</p>
            </div>
        );
    }
  const startDate = useMemo(() => new Date(Math.min(...tasks.map(t => t.start.getTime()))), [tasks]);
  const endDate = useMemo(() => new Date(Math.max(...tasks.map(t => t.end.getTime()))), [tasks]);
  const totalDays = useMemo(() => differenceInDays(endDate, startDate) + 1, [startDate, endDate]);
  const timeline = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(startDate, i)), [totalDays, startDate]);

  return (
    <div className="space-y-2 overflow-x-auto">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: `150px repeat(${totalDays}, minmax(40px, 1fr))`}}>
            <div className="sticky left-0 z-10 border-b border-r bg-muted/50 p-2 font-semibold">Task</div>
             {timeline.map(day => (
                 <div key={day.toString()} className="border-b p-2 text-center text-xs">
                     {format(day, 'M/d')}
                 </div>
             ))}
        </div>
        {/* Rows */}
        {tasks.map(task => {
            const offset = differenceInDays(task.start, startDate);
            const duration = differenceInDays(task.end, task.start) + 1;
            return (
                <div key={task.id} className="grid items-center" style={{ gridTemplateColumns: `150px repeat(${totalDays}, minmax(40px, 1fr))`}}>
                    <div className="sticky left-0 z-10 truncate border-r bg-muted/50 p-2 text-sm" title={task.name}>{task.name}</div>
                    <div style={{ gridColumnStart: offset + 2, gridColumnEnd: `span ${duration}` }}>
                         <div className="h-6 rounded-md bg-primary/80" />
                    </div>
                </div>
            )
        })}

    </div>
  );
};

export default function GanttPage() {
  const { user, isSubscribed, setSubscribed } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, name: 'Initial Planning', start: new Date(), end: addDays(new Date(), 4) },
    { id: 2, name: 'Design Phase', start: addDays(new Date(), 2), end: addDays(new Date(), 8) },
  ]);
  const [newTaskName, setNewTaskName] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);


  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const lastTask = tasks[tasks.length - 1];
    const newStart = lastTask ? addDays(lastTask.end, 1) : new Date();
    setTasks([
      ...tasks,
      { id: newId, name: newTaskName, start: newStart, end: addDays(newStart, 2) },
    ]);
    setNewTaskName('');
  };

  const handleUpdateTask = (id: number, field: keyof Task, value: any) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, [field]: value } : t)));
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
            <p className="text-muted-foreground">Plan and visualize your project timeline.</p>
          </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div key={task.id} className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_auto] gap-2 items-center">
                            <Input
                                value={task.name}
                                onChange={e => handleUpdateTask(task.id, 'name', e.target.value)}
                                placeholder="Task Name"
                            />
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
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !task.end && "text-muted-foreground")}>
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
                    ))}
                </div>
                 <div className="flex gap-2">
                    <Input
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Add a new task..."
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
                <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <GanttDisplay tasks={tasks} />
            </CardContent>
        </Card>
    </div>
  );
}
