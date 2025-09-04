
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentDialog } from '@/components/dashboard/payment-dialog';
import { SuccessDialog } from '@/components/dashboard/success-dialog';
import { Check, PartyPopper } from 'lucide-react';
import Link from 'next/link';

const premiumFeatures = [
    "Unlimited PDF Exports",
    "Full access to the interactive Gantt Chart",
    "Advanced project insights and analysis",
    "Team collaboration features",
    "Priority support"
];


export default function SubscribePage() {
    const { user, isSubscribed } = useAuth();
    const router = useRouter();
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

    const handleSubscribeClick = () => {
        if (!user) {
            router.push('/login');
        } else {
            setIsPaymentDialogOpen(true);
        }
    }
    
    const handlePaymentSuccess = () => {
        setIsPaymentDialogOpen(false);
        setIsSuccessDialogOpen(true);
    }

    return (
        <>
            <PaymentDialog 
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                onSuccess={handlePaymentSuccess}
            />
             <SuccessDialog 
                isOpen={isSuccessDialogOpen}
                onClose={() => setIsSuccessDialogOpen(false)}
            />
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-headline">
                            {isSubscribed ? "You're a Premium Member!" : "Unlock Premium"}
                        </CardTitle>
                        <CardDescription>
                            {isSubscribed 
                                ? "Thank you for your support. You have access to all premium features." 
                                : "Get unlimited access to all features with our simple monthly subscription."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSubscribed ? (
                            <div className="flex flex-col items-center text-center">
                                <PartyPopper className="h-16 w-16 text-primary mb-4" />
                                <Button asChild>
                                    <Link href="/">Go to Dashboard</Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <p className="text-4xl font-bold text-center mb-2">
                                        $5<span className="text-lg text-muted-foreground">/month</span>
                                    </p>
                                </div>
                                <ul className="space-y-3 mb-8">
                                {premiumFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-primary" />
                                        <span className="text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                                </ul>
                                <Button onClick={handleSubscribeClick} className="w-full">
                                    {user ? 'Subscribe Now' : 'Login to Subscribe'}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
