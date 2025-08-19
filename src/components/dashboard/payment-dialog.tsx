
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (type: 'onetime' | 'subscription') => void;
}

declare global {
    interface Window {
        paypal: any;
    }
}

export function PaymentDialog({ isOpen, onClose, onPaymentSuccess }: PaymentDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'onetime' | 'subscription'>('onetime');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);

  useEffect(() => {
    if (isOpen && selectedOption === 'subscription' && !window.paypal) {
      const script = document.createElement('script');
      script.src = "https://www.paypal.com/sdk/js?client-id=AY22j6KFLgw89u81LAPEkoK5eS0WNO6h3JSVBSrNiXCJ4NQYAOtGN8mMK6r6ejCkn6L3aiLqLPh9ra_d&vault=true&intent=subscription";
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.onload = () => {
        setIsSdkReady(true);
      };
      document.body.appendChild(script);
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    if (isSdkReady && window.paypal) {
        window.paypal.Buttons({
            style: {
                shape: 'rect',
                color: 'gold',
                layout: 'vertical',
                label: 'subscribe'
            },
            createSubscription: function(data: any, actions: any) {
              return actions.subscription.create({
                plan_id: 'P-6WA10310SE254683XNCSO6II'
              });
            },
            onApprove: function(data: any, actions: any) {
              onPaymentSuccess('subscription');
            }
        }).render('#paypal-button-container-P-6WA10310SE254683XNCSO6II');
    }
  }, [isSdkReady, onPaymentSuccess]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsSdkReady(false); // Reset SDK state on close
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Unlock PDF Exports</DialogTitle>
          <DialogDescription>
            Choose a plan to export your dashboard as a high-quality PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <RadioGroup value={selectedOption} onValueChange={(val) => setSelectedOption(val as any)}>
                <Label
                    htmlFor="onetime"
                    className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                        selectedOption === 'onetime' && "border-primary ring-2 ring-primary"
                    )}
                >
                    <Zap className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">One-Time Export</span>
                            <span className="font-bold text-xl text-primary">$2</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Pay once to export your current dashboard.</p>
                    </div>
                     <RadioGroupItem value="onetime" id="onetime" />
                </Label>
                <Label
                    htmlFor="subscription"
                    className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all mt-4",
                        selectedOption === 'subscription' && "border-primary ring-2 ring-primary"
                    )}
                >
                    <Gem className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Unlimited Exports</span>
                             <span className="font-bold text-xl text-primary">$5</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Subscribe for unlimited PDF exports. Cancel anytime.</p>
                    </div>
                     <RadioGroupItem value="subscription" id="subscription" />
                </Label>
            </RadioGroup>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancel</Button>
          </DialogClose>
          {selectedOption === 'onetime' ? (
             <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
                <input type="hidden" name="cmd" value="_s-xclick" />
                <input type="hidden" name="hosted_button_id" value="RQKFJNGUZ732E" />
                <input type="hidden" name="currency_code" value="USD" />
                <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Buy Now" />
            </form>
          ) : (
             <div>
                {isSdkReady ? (
                    <div id="paypal-button-container-P-6WA10310SE254683XNCSO6II"></div>
                ) : (
                    <Button disabled={true}>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                    </Button>
                )}
             </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
