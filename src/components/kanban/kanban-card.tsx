
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { format } from 'date-fns';

interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  task: Task;
  onEdit: (newContent: string, newDescription?: string, newStart?: Date, newEnd?: Date) => void;
  onDelete: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export const KanbanCard = ({ task, onEdit, onDelete, onDrop, className, ...props }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(task.content);
  const [description, setDescription] = useState(task.description || '');
  const [startDate, setStartDate] = useState(task.start);
  const [endDate, setEndDate] = useState(task.end);

  const handleSave = () => {
    onEdit(content, description, startDate, endDate);
    setIsEditing(false);
  }

  return (
    <Card 
        className={cn("bg-card shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing", className)}
        onDrop={(e) => onDrop(e, task.id)}
        onDragOver={(e) => e.preventDefault()}
        {...props}
    >
      <CardHeader className="p-3 pb-0">
        {isEditing ? (
            <Input 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="text-base h-8"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
        ) : (
            <CardTitle className="text-base">{task.content}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-2">
        {isEditing ? (
            <div className="space-y-4">
                <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="text-sm"
                />
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal h-8 text-xs', !startDate && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {startDate ? format(startDate, 'MMM d') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label className="text-xs">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal h-8 text-xs', !endDate && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {endDate ? format(endDate, 'MMM d') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
        ) : (
          <>
            {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            {(task.start || task.end) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {task.start ? format(task.start, 'MMM d') : '...'} - {task.end ? format(task.end, 'MMM d') : '...'}
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
                    <Check className="h-4 w-4" />
                </Button>
            ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};
