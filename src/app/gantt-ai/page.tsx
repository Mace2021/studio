
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import type { Task } from '@/lib/types';
import { generateGanttChart } from '@/ai/flows/generate-gantt-chart-flow';
import { GanttDisplay } from '@/components/gantt/gantt-display';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

const initialPrompt = `Project Name: Q4 Marketing Campaign
Project Goal: Launch a new product line by October 15th.
Project Start Date: August 1, 2024

Tasks and Timeline:
1. Market Research: 10 days
2. Competitor Analysis: 5 days (Depends on Task 1)
3. Develop Marketing Strategy: 7 days (Depends on Task 2)
4. Create Content Briefs: 4 days (Depends on Task 3)
5. Content Creation (Blog Posts, Social Media): 15 days (Depends on Task 4)
6. Design Campaign Visuals: 8 days (Depends on Task 4)
7. Website Landing Page Development: 10 days (Depends on Task 6)
8. Launch Social Media Teasers: 5 days (Depends on Task 5 and 6)
9. Final Campaign Launch: 2 days (Depends on Task 7 and 8)
10. Post-Launch Analysis: 7 days (Depends on Task 9)

Key Milestones:
- Strategy Finalized: August 26, 2024
- Campaign Assets Ready: September 27, 2024
- Product Launch: October 15, 2024
`;

export default function AiGanttPage() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const criticalPath = useMemo(() => new Set<number>(), []); // Placeholder

  const handleGenerateChart = async () => {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to generate a chart.', variant: 'destructive' });
        router.push('/login');
        return;
    }
    
    if (!prompt.trim()) {
        toast({ title: 'Prompt is empty', description: 'Please provide a project plan to generate a chart.', variant: 'destructive'});
        return;
    }

    setIsLoading(true);
    setTasks([]);

    try {
      const result = await generateGanttChart(prompt);
      const parsedTasks = result.tasks.map(task => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end)
      }));
      setTasks(parsedTasks);
      toast({ title: 'Gantt Chart Generated!', description: 'Your project plan is now visualized.'});
    } catch (error) {
      console.error('Failed to generate Gantt chart:', error);
      toast({ title: 'Generation Failed', description: 'Could not generate chart from the prompt. Please check the format.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">AI Gantt Chart Generator</h1>
          <p className="text-muted-foreground">Describe your project, and let AI build the timeline for you.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Plan Prompt</CardTitle>
          <CardDescription>
            Use the template below to describe your project. The AI will parse the tasks, dependencies, and milestones to create a Gantt chart.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your project plan here..."
            rows={15}
            className="font-mono text-sm"
            disabled={isLoading}
          />
          <Button onClick={handleGenerateChart} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Chart
          </Button>
        </CardContent>
      </Card>
      
      {tasks.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle>Generated Gantt Chart</CardTitle>
            </CardHeader>
            <CardContent>
                <GanttDisplay tasks={tasks} view="week" criticalPath={criticalPath} />
            </CardContent>
          </Card>
      )}
    </div>
  );
}
