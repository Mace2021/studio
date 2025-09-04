
'use client';

import { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import type { Task as KanbanTask, Column as KanbanColumnData } from '@/lib/types';
import { addDays } from 'date-fns';

const today = new Date();

const initialTasks: { [key: string]: KanbanTask[] } = {
  'todo': [
    { id: 'task-1', content: 'Requirement Gathering', description: 'Meet with stakeholders to define project scope.', start: today, end: addDays(today, 2) },
    { id: 'task-2', content: 'UI/UX Design', description: 'Create wireframes and mockups for the new interface.', start: addDays(today, 3), end: addDays(today, 7) },
  ],
  'in-progress': [
    { id: 'task-3', content: 'Frontend Development', description: 'Build out the main dashboard components.', start: addDays(today, 8), end: addDays(today, 20) },
    { id: 'task-4', content: 'Backend Development', description: 'Set up database schemas and API endpoints.', start: addDays(today, 8), end: addDays(today, 22) },
  ],
  'done': [
    { id: 'task-5', content: 'Design Approval', start: addDays(today, 1), end: addDays(today, 1)},
    { id: 'task-6', content: 'Initial Project Setup', description: 'Configure the development environment and repositories.' },
    { id: 'task-7', content: 'Deploy Staging Environment' },
  ],
};

const initialColumns: KanbanColumnData[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
]


export default function KanbanPage() {
    const [columns, setColumns] = useState(initialColumns);
    const [tasks, setTasks] = useState(initialTasks);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) {
            return;
        }

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }
        
        const startColumnTasks = Array.from(tasks[source.droppableId]);
        const [movedTask] = startColumnTasks.splice(source.index, 1);
        
        if (source.droppableId === destination.droppableId) {
            // Moving within the same column
            startColumnTasks.splice(destination.index, 0, movedTask);
            setTasks({
                ...tasks,
                [source.droppableId]: startColumnTasks
            });
        } else {
            // Moving to a different column
            const finishColumnTasks = Array.from(tasks[destination.droppableId]);
            finishColumnTasks.splice(destination.index, 0, movedTask);
            setTasks({
                ...tasks,
                [source.droppableId]: startColumnTasks,
                [destination.droppableId]: finishColumnTasks
            });
        }
    };
    
    const handleAddTask = (columnId: string, content: string, start?: Date, end?: Date) => {
        const newTask: KanbanTask = { id: `task-${Date.now()}`, content, description: '', start, end };
        setTasks(prev => ({
            ...prev,
            [columnId]: [...prev[columnId], newTask]
        }));
    }
    
    const handleEditTask = (columnId: string, taskId: string, newContent: string, newDescription?: string, newStart?: Date, newEnd?: Date) => {
        const newTasks = tasks[columnId].map(task => 
            task.id === taskId ? { ...task, content: newContent, description: newDescription, start: newStart, end: newEnd } : task
        );
        setTasks(prev => ({ ...prev, [columnId]: newTasks }));
    }

    const handleDeleteTask = (columnId: string, taskId: string) => {
        setTasks(prev => ({
            ...prev,
            [columnId]: prev[columnId].filter(task => task.id !== taskId)
        }));
    }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col h-full p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Kanban Board</h1>
                <p className="text-muted-foreground">Visualize your workflow and track task progress.</p>
            </div>
            <div className="flex flex-col md:flex-row flex-1 gap-6 overflow-x-auto md:pb-4">
                {columns.map(column => (
                    <KanbanColumn 
                        key={column.id} 
                        column={column} 
                        tasks={tasks[column.id] || []}
                        onAddTask={handleAddTask}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                    />
                ))}
            </div>
        </div>
    </DragDropContext>
  );
}
