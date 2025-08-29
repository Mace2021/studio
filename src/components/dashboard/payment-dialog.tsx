
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

// To prevent script from being loaded multiple times
let payPalScriptLoaded = false;

export function PaymentDialog({ isOpen, onClose, onSuccess }: PaymentDialogProps) {
  const [paymentOption, setPaymentOption] = useState<'onetime' | 'subscription'>('subscription');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleOneTimePayment = async () => {
    setIsProcessing(true);
    toast({ title: 'Processing Payment...', description: 'Please wait while we securely process your payment.' });

    // Simulate one-time payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    onSuccess('onetime');
  };

  useEffect(() => {
    if (isOpen && paymentOption === 'subscription' && !payPalScriptLoaded) {
      const script = document.createElement('script');
      script.src = "https://www.paypal.com/sdk/js?client-id=AY22j6KFLgw89u81LAPEkoK5eS0WNO6h3JSVBSrNiXCJ4NQYAOtGN8mMK6r6ejCkn6L3aiLqLPh9ra_d&vault=true&intent=subscription";
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.onload = () => {
          // @ts-ignore
          if (window.paypal) {
              // @ts-ignore
              window.paypal.Buttons({
                  style: {
                      shape: 'rect',
                      color: 'gold',
                      layout: 'vertical',
                      label: 'subscribe'
                  },
                  createSubscription: function(data, actions) {
                    return actions.subscription.create({
                      /* Creates the subscription */
                      plan_id: 'P-6WA10310SE254683XNCSO6II'
                    });
                  },
                  onApprove: function(data, actions) {
                    toast({ title: 'Subscription Successful!', description: `Subscription ID: ${data.subscriptionID}` });
                    onSuccess('subscription');
                  },
                  onError: function(err) {
                    console.error("PayPal button error:", err);
                    toast({ variant: 'destructive', title: 'Payment Error', description: 'Something went wrong with the payment. Please try again.'});
                  }
              }).render('#paypal-button-container');
          }
      };
      document.body.appendChild(script);
      payPalScriptLoaded = true;
    }
  }, [isOpen, paymentOption, onSuccess, toast]);


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
                <p className="text-sm text-muted-foreground">$5.00 / month</p>
              </div>
            </Label>
          </RadioGroup>
          
          {paymentOption === 'subscription' ? (
              <div id="paypal-button-container" className="min-h-[100px] w-full"></div>
          ) : (
             <div className="text-center text-sm text-muted-foreground pt-4">
                <p>This is a simulation.</p>
                <p>Your card will not be charged.</p>
            </div>
          )}

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancel</Button>
          </DialogClose>
           {paymentOption === 'onetime' && (
               <Button onClick={handleOneTimePayment} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {`Pay with PayPal`}
              </Button>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
