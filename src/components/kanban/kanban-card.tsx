
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface KanbanCardProps {
  task: Task;
  isDragging: boolean;
  onEdit: (newContent: string) => void;
  onDelete: () => void;
}

export const KanbanCard = ({ task, isDragging, onEdit, onDelete }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(task.content);

  const handleSave = () => {
    onEdit(content);
    setIsEditing(false);
  }

  return (
    <Card className={cn("bg-card shadow-sm hover:shadow-md transition-shadow group", isDragging && "shadow-lg scale-105")}>
      <CardHeader className="p-3 pb-0">
        {isEditing ? (
            <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="text-base"
                autoFocus
                onBlur={handleSave}
            />
        ) : (
            <CardTitle className="text-base">{task.content}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};
