
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (type: 'onetime' | 'subscription') => void;
}

export function PaymentDialog({ isOpen, onClose, onSuccess }: PaymentDialogProps) {
  const [paymentOption, setPaymentOption] = useState<'onetime' | 'subscription'>('onetime');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsProcessing(true);
    toast({ title: 'Processing Payment...', description: 'Please wait while we securely process your payment.' });

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsProcessing(false);
    onSuccess(paymentOption);
  };
  
  // This is a placeholder for loading PayPal script.
  // In a real app, you would load the script and then render the buttons.
  useEffect(() => {
    if (isOpen) {
        console.log("Loading PayPal script...");
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock PDF Exports</DialogTitle>
          <DialogDescription>
            Choose a payment option to export your dashboard. Subscribers get unlimited exports.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={paymentOption} onValueChange={(value) => setPaymentOption(value as 'onetime' | 'subscription')}>
            <Label
              htmlFor="onetime"
              className="flex items-center space-x-3 rounded-md border p-4 [&:has([data-state=checked])]:border-primary"
            >
              <RadioGroupItem value="onetime" id="onetime" />
              <div>
                <p className="font-semibold">One-Time Export</p>
                <p className="text-sm text-muted-foreground">$5.00</p>
              </div>
            </Label>
            <Label
              htmlFor="subscription"
              className="flex items-center space-x-3 rounded-md border p-4 [&:has([data-state=checked])]:border-primary"
            >
              <RadioGroupItem value="subscription" id="subscription" />
              <div>
                <p className="font-semibold">Unlimited Exports</p>
                <p className="text-sm text-muted-foreground">$15.00 / month</p>
              </div>
            </Label>
          </RadioGroup>
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>This is a simulation using PayPal's sandbox.</p>
            <p>Your card will not be charged.</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancel</Button>
          </DialogClose>
          <Button onClick={handlePayment} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {`Pay with PayPal`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
