
'use client';

import { useState, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import type { Task as KanbanTask, Column as KanbanColumnData } from '@/lib/types';
import { addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const today = new Date();

const initialData = {
    tasks: {
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
    },
    columns: [
        { id: 'todo', title: 'To Do' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
    ]
}


export default function KanbanPage() {
    const [columns, setColumns] = useState<KanbanColumnData[]>([]);
    const [tasks, setTasks] = useState<{ [key: string]: KanbanTask[] }>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedData = localStorage.getItem('kanbanBoardData');
        if (savedData) {
            const { tasks: savedTasks, columns: savedColumns, timestamp } = JSON.parse(savedData);
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            if (new Date().getTime() - timestamp < thirtyDays) {
                 // Revive date strings to Date objects
                const revivedTasks: { [key: string]: KanbanTask[] } = {};
                for (const colId in savedTasks) {
                    revivedTasks[colId] = savedTasks[colId].map((task: any) => ({
                        ...task,
                        start: task.start ? parseISO(task.start) : undefined,
                        end: task.end ? parseISO(task.end) : undefined,
                    }));
                }
                setTasks(revivedTasks);
                setColumns(savedColumns);
                setIsLoaded(true);
                return;
            }
        }
        // Load default if no valid saved data
        setTasks(initialData.tasks);
        setColumns(initialData.columns);
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
             const dataToSave = {
                tasks,
                columns,
                timestamp: new Date().getTime(),
            };
            localStorage.setItem('kanbanBoardData', JSON.stringify(dataToSave));
        }
    }, [tasks, columns, isLoaded]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColumnId: string, targetTaskId?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const sourceColumnId = e.dataTransfer.getData("sourceColumnId");
        const movedTaskId = e.dataTransfer.getData("taskId");
        
        if (!sourceColumnId || !movedTaskId) return;

        // Find and remove the moved task from its source column
        const sourceTasks = [...(tasks[sourceColumnId] || [])];
        const taskIndex = sourceTasks.findIndex(t => t.id === movedTaskId);
        if (taskIndex === -1) return;
        const [movedTask] = sourceTasks.splice(taskIndex, 1);

        const newTasksState = { ...tasks, [sourceColumnId]: sourceTasks };

        // Add the moved task to the target column
        let targetTasks = [...(newTasksState[targetColumnId] || [])];

        if (targetTaskId) { // Dropped on a specific task
            const dropIndex = targetTasks.findIndex(t => t.id === targetTaskId);
            if (dropIndex !== -1) {
                targetTasks.splice(dropIndex, 0, movedTask);
            } else { // Should not happen if targetTaskId is valid
                targetTasks.push(movedTask);
            }
        } else { // Dropped on the column itself (at the end)
            targetTasks.push(movedTask);
        }
        
        newTasksState[targetColumnId] = targetTasks;
        setTasks(newTasksState);
    };
    
    const handleAddTask = (columnId: string, content: string, start?: Date, end?: Date) => {
        const newTask: KanbanTask = { id: `task-${Date.now()}`, content, description: '', start, end };
        setTasks(prev => ({
            ...prev,
            [columnId]: [...(prev[columnId] || []), newTask]
        }));
    }
    
    const handleEditTask = (columnId: string, taskId: string, newContent: string, newDescription?: string, newStart?: Date, newEnd?: Date) => {
        const newTasks = (tasks[columnId] || []).map(task => 
            task.id === taskId ? { ...task, content: newContent, description: newDescription, start: newStart, end: newEnd } : task
        );
        setTasks(prev => ({ ...prev, [columnId]: newTasks }));
    }

    const handleDeleteTask = (columnId: string, taskId: string) => {
        setTasks(prev => ({
            ...prev,
            [columnId]: (prev[columnId] || []).filter(task => task.id !== taskId)
        }));
    }

    const handleExport = () => {
        let allTasks: any[] = [];
        columns.forEach(column => {
            tasks[column.id]?.forEach(task => {
                allTasks.push({
                    ID: task.id,
                    Status: column.title,
                    Task: task.content,
                    Description: task.description || '',
                    'Start Date': task.start ? task.start.toLocaleDateString() : '',
                    'End Date': task.end ? task.end.toLocaleDateString() : '',
                });
            });
        });

        const worksheet = xlsx.utils.json_to_sheet(allTasks);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Kanban Board");
        xlsx.writeFile(workbook, "KanbanBoardExport.xlsx");
    };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Kanban Board</h1>
                <p className="text-muted-foreground">Visualize your workflow and track task progress.</p>
            </div>
             <Button onClick={handleExport} variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export to Excel
            </Button>
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
                    onDrop={handleDrop}
                />
            ))}
        </div>
    </div>
  );
}
