
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, UserPlus } from 'lucide-react';

interface RolesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Role = 'Admin' | 'Editor' | 'Viewer';
interface Collaborator {
    id: number;
    name: string;
    email: string;
    role: Role;
}

const initialCollaborators: Collaborator[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob Williams', email: 'bob@example.com', role: 'Editor' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer' },
]

export function RolesDialog({ isOpen, onClose }: RolesDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('Viewer');

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim() && newName.trim()) {
      const newCollaborator: Collaborator = {
        id: Date.now(),
        name: newName,
        email: newEmail,
        role: newRole,
      };
      setCollaborators([...collaborators, newCollaborator]);
      setNewName('');
      setNewEmail('');
      setNewRole('Viewer');
    }
  };

  const handleRemoveCollaborator = (id: number) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Roles & Permissions</DialogTitle>
          <DialogDescription>
            Add or remove team members and assign them roles for this project.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleAddCollaborator} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 py-4 border-b pb-6">
            <div className="grid gap-1.5 col-span-1">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" placeholder="John Doe" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
             <div className="grid gap-1.5 col-span-1">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="name@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
             <div className="grid gap-1.5 col-span-1">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(value: Role) => setNewRole(value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full md:w-auto">
                <UserPlus className="mr-2 h-4 w-4"/>
                Add Member
            </Button>
        </form>

        <div className="space-y-2">
            <Label>Project Members</Label>
            <div className="rounded-md border max-h-60 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {collaborators.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveCollaborator(user.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
        
        <DialogFooter>
          <Button type="button" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
