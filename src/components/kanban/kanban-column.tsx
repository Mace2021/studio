
'use client';

import { Droppable, Draggable } from 'react-beautiful-dnd';
import { KanbanCard } from './kanban-card';
import type { Task, Column } from '@/lib/types';
import { AddTaskButton } from './add-task-button';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string, content: string, start?: Date, end?: Date) => void;
  onEditTask: (columnId: string, taskId: string, newContent: string, newDescription?: string, newStart?: Date, newEnd?: Date) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
}

export const KanbanColumn = ({ column, tasks, onAddTask, onEditTask, onDeleteTask }: KanbanColumnProps) => {
  return (
    <div className="flex flex-col w-full md:w-80 bg-muted rounded-lg p-2 shrink-0">
      <div className="flex items-center justify-between p-2 mb-2">
        <h2 className="font-semibold text-lg">{column.title}</h2>
        <AddTaskButton onAdd={(content, start, end) => onAddTask(column.id, content, start, end)} />
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-3 overflow-y-auto p-1 rounded-md transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <KanbanCard 
                        task={task} 
                        isDragging={snapshot.isDragging}
                        onEdit={(newContent, newDescription, newStart, newEnd) => onEditTask(column.id, task.id, newContent, newDescription, newStart, newEnd)}
                        onDelete={() => onDeleteTask(column.id, task.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
