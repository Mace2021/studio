
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuccessDialog({ isOpen, onClose }: SuccessDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
            <div className="flex justify-center pb-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          <DialogTitle className="text-center text-2xl">Payment Successful!</DialogTitle>
          <DialogDescription className="text-center">
            Thank you for your purchase. You can now proceed to export your PDF.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Continue to Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
