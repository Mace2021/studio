
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const [value, setValue] = useState('');
  const [shareType, setShareType] = useState<'email' | 'phone'>('email');

  const handleSendInvite = () => {
    if (!value) return;
    toast({
      title: 'Invite Sent!',
      description: `An invitation has been sent to ${value}.`,
    });
    setValue('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Invite collaborators to view or edit this Gantt chart.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={shareType} onValueChange={(v) => setShareType(v as 'email' | 'phone')} className="py-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="space-y-2 pt-4">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={value} onChange={(e) => setValue(e.target.value)} />
            </TabsContent>
            <TabsContent value="phone" className="space-y-2 pt-4">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="(555) 123-4567" value={value} onChange={(e) => setValue(e.target.value)} />
            </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSendInvite}>Send Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
