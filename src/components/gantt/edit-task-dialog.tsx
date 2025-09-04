
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MultiSelect } from 'react-multi-select-component';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  task: Task;
  allTasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export function EditTaskDialog({ task, allTasks, isOpen, onClose, onSave }: EditTaskDialogProps) {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });

  useEffect(() => {
    // When the dialog is opened with a new task, reset the state
    setEditedTask({ ...task });
  }, [task, isOpen]);
  
  // Ensure dates are Date objects
  const startDate = editedTask.start instanceof Date ? editedTask.start : parseISO(editedTask.start as any);
  const endDate = editedTask.end instanceof Date ? editedTask.end : parseISO(editedTask.end as any);

  const handleDateChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (date) {
      setEditedTask(prev => ({ ...prev, [field]: date }));
    }
  };

  const handleSave = () => {
    onSave(editedTask);
  };
  
  const dependencyOptions = allTasks
    .filter(t => t.id !== task.id)
    .map(t => ({ label: t.name, value: t.id }));

  const selectedDependencies = editedTask.dependencies.map(depId => {
      const foundTask = allTasks.find(t => t.id === depId);
      return foundTask ? { label: foundTask.name, value: foundTask.id } : null;
  }).filter(Boolean) as { label: string; value: number }[];


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={editedTask.name}
              onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('col-span-3 justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={(d) => handleDateChange('start', d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('col-span-3 justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={(d) => handleDateChange('end', d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
              Progress
            </Label>
            <div className="col-span-3 flex items-center gap-2">
                 <Slider
                    id="progress"
                    min={0}
                    max={100}
                    step={1}
                    value={[editedTask.progress]}
                    onValueChange={(value) => setEditedTask({ ...editedTask, progress: value[0] })}
                />
                <span className="text-sm w-12 text-center">{editedTask.progress}%</span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignee" className="text-right">
              Assignee
            </Label>
            <Input
              id="assignee"
              value={editedTask.assignee || ''}
              onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Dependencies</Label>
              <div className="col-span-3">
                <MultiSelect
                    options={dependencyOptions}
                    value={selectedDependencies}
                    onChange={(selected: { label: string; value: number }[]) => {
                        setEditedTask({...editedTask, dependencies: selected.map(s => s.value)})
                    }}
                    labelledBy="Select dependencies"
                    className="multi-select-custom"
                />
              </div>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
