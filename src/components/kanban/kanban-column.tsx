
'use client';

import { useState } from 'react';
import { KanbanCard } from './kanban-card';
import type { Task, Column } from '@/lib/types';
import { AddTaskButton } from './add-task-button';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string, content: string, start?: Date, end?: Date) => void;
  onEditTask: (columnId: string, taskId: string, newContent: string, newDescription?: string, newStart?: Date, newEnd?: Date) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, columnId: string) => void;
}

export const KanbanColumn = ({ column, tasks, onAddTask, onEditTask, onDeleteTask, onDrop }: KanbanColumnProps) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <div
      className="flex flex-col w-full md:w-80 bg-muted rounded-lg p-2 shrink-0"
      onDrop={(e) => {
        onDrop(e, column.id);
        setIsDraggingOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
    >
      <div className="flex items-center justify-between p-2 mb-2">
        <h2 className="font-semibold text-lg">{column.title}</h2>
        <AddTaskButton onAdd={(content, start, end) => onAddTask(column.id, content, start, end)} />
      </div>
      <div
        className={cn(
          'flex-1 space-y-3 overflow-y-auto p-1 rounded-md transition-colors',
          isDraggingOver ? 'bg-primary/10' : ''
        )}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onEdit={(newContent, newDescription, newStart, newEnd) => onEditTask(column.id, task.id, newContent, newDescription, newStart, newEnd)}
            onDelete={() => onDeleteTask(column.id, task.id)}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("taskId", task.id);
                e.dataTransfer.setData("sourceColumnId", column.id);
            }}
          />
        ))}
        {/* Placeholder to ensure drop zone is available when column is empty */}
        {tasks.length === 0 && (
          <div className="min-h-[50px] rounded-lg border-dashed border-2 border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
};
