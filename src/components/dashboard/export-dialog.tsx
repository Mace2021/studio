"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

export interface ExportOptions {
  orientation: "portrait" | "landscape";
  chartsPerPage: 1 | 2;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportDialog({ isOpen, onClose, onExport }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    orientation: 'landscape',
    chartsPerPage: 1,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await onExport(options);
    setIsExporting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PDF Export Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="orientation" className="text-right">
              Orientation
            </Label>
            <Select
              value={options.orientation}
              onValueChange={(value: ExportOptions['orientation']) =>
                setOptions({ ...options, orientation: value })
              }
            >
              <SelectTrigger id="orientation" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="charts-per-page" className="text-right">
              Charts/Page
            </Label>
            <Select
              value={String(options.chartsPerPage)}
              onValueChange={(value) =>
                setOptions({ ...options, chartsPerPage: Number(value) as ExportOptions['chartsPerPage'] })
              }
            >
              <SelectTrigger id="charts-per-page" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isExporting}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
