
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays } from 'date-fns';
import { Plus, Crown, Sparkles, ChevronDown, Share, Users, BarChart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Task } from '@/lib/types';
import { GanttDisplay } from '@/components/gantt/gantt-display';
import { EditTaskDialog } from '@/components/gantt/edit-task-dialog';


type View = 'day' | 'week' | 'month';

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
             return { path, endDate: new Date(task.end) };
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

    const startNodes = tasks.filter(t => !t.dependencies || t.dependencies.length === 0);

    startNodes.forEach(startNode => {
        const { path, endDate } = findLongestPath(startNode.id);
        if (endDate > finalEndDate) {
            finalEndDate = endDate;
            criticalPath = path;
        }
    });
    
    const existingCriticalPath = criticalPath.filter(id => taskMap.has(id));

    return new Set(existingCriticalPath);
};


const getTemplates = (): Record<string, Task[]> => {
    const today = new Date();
    const year = today.getFullYear();
    return {
        marketingCampaign: [
            { id: 1, name: 'Marketing Campaign Draft', start: new Date(year, 5, 20), end: new Date(year, 5, 27), type: 'task', progress: 100, dependencies: [], parentId: null, assignee: 'Alice' },
            { id: 2, name: 'New Ad Campaign', start: new Date(year, 5, 28), end: new Date(year, 5, 28), type: 'milestone', progress: 100, dependencies: [1], parentId: null, assignee: 'Alice' },
            { id: 3, name: 'Sales Team Group', start: new Date(year, 6, 1), end: new Date(year, 6, 11), type: 'group', progress: 0, dependencies: [2], parentId: null, assignee: 'Team Lead' },
            { id: 4, name: 'High Resolution Banner Printing', start: new Date(year, 6, 1), end: new Date(year, 6, 8), type: 'task', progress: 50, dependencies: [], parentId: 3, assignee: 'Bob' },
            { id: 5, name: 'Sales reports for sales team group meeting', start: new Date(year, 6, 9), end: new Date(year, 6, 11), type: 'task', progress: 20, dependencies: [4], parentId: 3, assignee: 'Charlie' },
            { id: 6, name: 'New Summer Banner', start: new Date(year, 6, 5), end: new Date(year, 6, 12), type: 'task', progress: 30, dependencies: [], parentId: 3, assignee: 'David' }
        ],
        projectDevelopment: [
            { id: 1, name: 'Requirement Gathering', start: today, end: addDays(today, 7), type: 'task', progress: 90, dependencies: [], parentId: null, assignee: 'Emily' },
            { id: 2, name: 'UI/UX Design', start: addDays(today, 8), end: addDays(today, 20), type: 'task', progress: 60, dependencies: [1], parentId: null, assignee: 'Frank' },
            { id: 3, name: 'Design Approval', start: addDays(today, 21), end: addDays(today, 21), type: 'milestone', progress: 100, dependencies: [2], parentId: null, assignee: 'Grace' },
            { id: 4, name: 'Development', start: addDays(today, 22), end: addDays(today, 55), type: 'group', progress: 0, dependencies: [3], parentId: null, assignee: 'Team Lead' },
            { id: 5, name: 'Frontend Development', start: addDays(today, 22), end: addDays(today, 45), type: 'task', progress: 30, dependencies: [], parentId: 4, assignee: 'Heidi' },
            { id: 6, name: 'Backend Development', start: addDays(today, 22), end: addDays(today, 50), type: 'task', progress: 40, dependencies: [], parentId: 4, assignee: 'Ivan' },
            { id: 7, name: 'API Integration', start: addDays(today, 51), end: addDays(today, 55), type: 'task', progress: 15, dependencies: [5, 6], parentId: 4, assignee: 'Judy' },
            { id: 8, name: 'UAT', start: addDays(today, 56), end: addDays(today, 63), type: 'task', progress: 0, dependencies: [7], parentId: null, assignee: 'Mallory' },
            { id: 9, name: 'Go Live', start: addDays(today, 65), end: addDays(today, 65), type: 'milestone', progress: 0, dependencies: [8], parentId: null, assignee: 'Oscar' },
        ],
        eventPlanning: [
            { id: 1, name: 'Planning Phase', start: today, end: addDays(today, 15), type: 'group', progress: 0, dependencies: [], parentId: null, assignee: 'Peggy' },
            { id: 2, name: 'Define Event Goals', start: today, end: addDays(today, 3), type: 'task', progress: 100, dependencies: [], parentId: 1, assignee: 'Quentin' },
            { id: 3, name: 'Budget Finalization', start: addDays(today, 4), end: addDays(today, 7), type: 'task', progress: 95, dependencies: [2], parentId: 1, assignee: 'Rupert' },
            { id: 4, name: 'Venue Selection & Booking', start: addDays(today, 8), end: addDays(today, 15), type: 'task', progress: 80, dependencies: [3], parentId: 1, assignee: 'Sybil' },
            { id: 5, name: 'Vendor Contracts', start: addDays(today, 16), end: addDays(today, 30), type: 'task', progress: 50, dependencies: [4], parentId: null, assignee: 'Trent' },
            { id: 6, name: 'Marketing Campaign Launch', start: addDays(today, 25), end: addDays(today, 55), type: 'task', progress: 25, dependencies: [3], parentId: null, assignee: 'Uma' },
            { id: 7, name: 'Ticket Sales Live', start: addDays(today, 31), end: addDays(today, 31), type: 'milestone', progress: 100, dependencies: [5, 6], parentId: null, assignee: 'Victor' },
            { id: 8, name: 'Event Execution', start: addDays(today, 58), end: addDays(today, 61), type: 'group', progress: 0, dependencies: [7], parentId: null, assignee: 'Walter' },
            { id: 9, name: 'On-site Prep', start: addDays(today, 58), end: addDays(today, 60), type: 'task', progress: 0, dependencies: [], parentId: 8, assignee: 'Xavier' },
            { id: 10, name: 'Event Day', start: addDays(today, 61), end: addDays(today, 61), type: 'task', progress: 0, dependencies: [9], parentId: 8, assignee: 'Yvonne' },
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

const FeatureMenuItem = ({ title, icon: Icon, comingSoon }: { title: string; icon: React.ElementType, comingSoon?: boolean }) => {
    const item = (
         <DropdownMenuItem disabled={comingSoon} className="gap-2">
            <Icon className="h-4 w-4" />
            <span>{title}</span>
        </DropdownMenuItem>
    )

    if (comingSoon) {
        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent>
                        <p>Coming Soon!</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>
        )
    }
    return item;
}

export default function GanttPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>('week');
  const [templates, setTemplates] = useState<ReturnType<typeof getTemplates> | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

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

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
  }

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(currentTasks => currentTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    setTaskToEdit(null);
  }
  
  const handleLoginClick = () => {
      router.push('/login');
  }

  const handleSelectTemplate = (templateName: keyof NonNullable<typeof templates>) => {
    if(templates) {
        setTasks(templates[templateName]);
    }
  }

  if (!user) {
      return (
        <>
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
                            Log in to get unlimited access to this tool and create powerful project timelines.
                        </p>
                        <Button onClick={handleLoginClick}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Login to Use
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
      )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
        {taskToEdit && (
            <EditTaskDialog 
                task={taskToEdit}
                allTasks={tasks}
                isOpen={!!taskToEdit}
                onClose={() => setTaskToEdit(null)}
                onSave={handleSaveTask}
            />
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Gantt Chart</h1>
            <p className="text-muted-foreground">Plan and visualize your project timeline.</p>
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
                        <DropdownMenuLabel>Collaboration</DropdownMenuLabel>
                        <FeatureMenuItem title="Share Chart" icon={Share} />
                        <FeatureMenuItem title="Manage Roles" icon={Users} />
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Analysis</DropdownMenuLabel>
                        <FeatureMenuItem title="View Insights" icon={BarChart} />
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
            onEditTask={handleEditTask}
            criticalPath={criticalPath}
        />
    </div>
  );
}

    
