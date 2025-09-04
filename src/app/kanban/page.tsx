
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const KanbanColumn = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col w-80 bg-muted rounded-lg p-2">
    <div className="flex items-center justify-between p-2 mb-2">
      <h2 className="font-semibold text-lg">{title}</h2>
      <button className="text-muted-foreground hover:text-foreground">
        <Plus size={20} />
      </button>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto p-1">
      {children}
    </div>
  </div>
);

const KanbanCard = ({ title, description }: { title: string; description?: string }) => (
  <Card className="bg-card shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-3">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    {description && (
      <CardContent className="p-3 pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    )}
  </Card>
);

export default function KanbanPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Kanban Board</h1>
        <p className="text-muted-foreground">Visualize your workflow and track task progress.</p>
      </div>
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn title="To Do">
          <KanbanCard title="Requirement Gathering" description="Meet with stakeholders to define project scope." />
          <KanbanCard title="UI/UX Design" />
        </KanbanColumn>
        <KanbanColumn title="In Progress">
          <KanbanCard title="Frontend Development" description="Build out the main dashboard components." />
          <KanbanCard title="Backend Development" description="Set up database schemas and API endpoints." />
        </KanbanColumn>
        <KanbanColumn title="Done">
          <KanbanCard title="Design Approval" />
          <KanbanCard title="Initial Project Setup" />
          <KanbanCard title="Deploy Staging Environment" />
        </KanbanColumn>
      </div>
    </div>
  );
}
