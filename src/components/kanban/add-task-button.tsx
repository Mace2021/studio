
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddTaskButtonProps {
    onAdd: (content: string) => void;
}

export const AddTaskButton = ({ onAdd }: AddTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');

  const handleAdd = () => {
    if (content.trim()) {
      onAdd(content);
      setContent('');
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsOpen(true)}>
        <Plus size={18} />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="task-content">Task Name</Label>
            <Input 
                id="task-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g., Finalize project report"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
