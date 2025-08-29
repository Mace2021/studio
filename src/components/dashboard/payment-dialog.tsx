
"use client";

import { useState, useEffect, useRef } from 'react';
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

const PayPalForm = ({ formRef }: { formRef: React.RefObject<HTMLFormElement> }) => (
    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" ref={formRef} style={{ display: 'none' }}>
      <input type="hidden" name="cmd" value="_s-xclick" />
      <input type="hidden" name="hosted_button_id" value="RQKFJNGUZ732E" />
      <input type="hidden" name="currency_code" value="USD" />
      <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_paynowCC_LG.gif" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Buy Now" />
    </form>
);


export function PaymentDialog({ isOpen, onClose, onSuccess }: PaymentDialogProps) {
  const [paymentOption, setPaymentOption] = useState<'onetime' | 'subscription'>('subscription');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);


  const handleOneTimePayment = () => {
    if (formRef.current) {
        formRef.current.submit();
    }
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
                <p className="text-sm text-muted-foreground">$2.00</p>
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
            <PayPalForm formRef={formRef} />
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
