
'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, User, Users } from 'lucide-react';
import type { Task } from '@/lib/types';

interface InsightsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export function InsightsDialog({ isOpen, onClose, tasks }: InsightsDialogProps) {
  const insights = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        completionPercentage: 0,
        overdueTasks: 0,
        assigneeCount: {},
        busiestAssignee: 'N/A',
      };
    }

    const totalTasks = tasks.filter(t => t.type === 'task').length;
    const completedTasks = tasks.filter(t => t.type === 'task' && t.progress === 100).length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueTasks = tasks.filter(t => t.type === 'task' && t.end < new Date() && t.progress < 100).length;
    
    const assigneeCount: Record<string, number> = {};
    tasks.forEach(task => {
        if (task.assignee) {
            assigneeCount[task.assignee] = (assigneeCount[task.assignee] || 0) + 1;
        }
    });

    const busiestAssignee = Object.entries(assigneeCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      overdueTasks,
      assigneeCount,
      busiestAssignee,
    };
  }, [tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project Insights</DialogTitle>
          <DialogDescription>
            An overview of your project's progress and health.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Progress Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Overall Completion</span>
                        <span className="font-bold">{insights.completionPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={insights.completionPercentage} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{insights.completedTasks} of {insights.totalTasks} tasks completed</span>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{insights.overdueTasks}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Busiest Assignee</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{insights.busiestAssignee}</div>
                        <p className="text-xs text-muted-foreground">
                            {insights.assigneeCount[insights.busiestAssignee] || 0} tasks assigned
                        </p>
                    </CardContent>
                </Card>
            </div>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Workload</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                   <div className="space-y-2 mt-2">
                     {Object.entries(insights.assigneeCount).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center text-sm">
                            <span>{name}</span>
                            <span className="font-mono text-muted-foreground">{count} tasks</span>
                        </div>
                     ))}
                   </div>
                </CardContent>
            </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
