import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { CreditCard, Lock, Plus, AlertTriangle } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethodGuardProps {
  children: React.ReactNode;
  onPaymentMethodAdded?: () => void;
  requiredFor?: string;
}

interface BillingInfo {
  customer: any;
  paymentMethods: Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  }>;
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Method Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Payment Method Added",
          description: "Your payment method has been successfully added."
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Setup Failed",
        description: "Failed to add payment method. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        options={{
          layout: 'tabs'
        }}
      />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? 'Adding Payment Method...' : 'Add Payment Method'}
      </Button>
    </form>
  );
}

export function PaymentMethodGuard({ 
  children, 
  onPaymentMethodAdded, 
  requiredFor = "subscription upgrade" 
}: PaymentMethodGuardProps) {
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const { toast } = useToast();

  const { data: billingInfo, isLoading, refetch } = useQuery<BillingInfo>({
    queryKey: ["/api/billing/info"],
  });

  const { data: setupIntent, refetch: refetchSetupIntent } = useQuery({
    queryKey: ["/api/billing/setup-intent"],
    enabled: false, // Only fetch when triggered
  });

  const hasPaymentMethod = billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0;

  const handleDialogOpenChange = (open: boolean) => {
    setShowAddPaymentDialog(open);
    if (open) {
      refetchSetupIntent();
    }
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPaymentDialog(false);
    await refetch();
    onPaymentMethodAdded?.();
    toast({
      title: "Ready to Upgrade",
      description: "You can now proceed with your subscription upgrade."
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no payment method exists, show the payment method requirement
  if (!hasPaymentMethod) {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Payment Method Required:</strong> Please add a payment method before proceeding with {requiredFor}.
          </AlertDescription>
        </Alert>

        <Card className="border-orange-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Add Payment Method</CardTitle>
            <CardDescription>
              Secure your account with a payment method to access premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Why do we need this?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Enables seamless subscription upgrades</li>
                <li>• Secures your account and prevents service interruption</li>
                <li>• No charges until you upgrade your plan</li>
                <li>• 256-bit SSL encryption protects your data</li>
              </ul>
            </div>

            <Dialog open={showAddPaymentDialog} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new payment method to your account
                  </DialogDescription>
                </DialogHeader>
                
                {setupIntent?.client_secret ? (
                  <Elements 
                    stripe={stripePromise} 
                    options={{
                      clientSecret: setupIntent.client_secret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#2563eb',
                        }
                      }
                    }}
                  >
                    <AddPaymentMethodForm onSuccess={handlePaymentMethodAdded} />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading payment form...</span>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <p className="text-xs text-gray-600 text-center">
              We use Stripe for secure payment processing. Your card information is encrypted and never stored on our servers.
            </p>
          </CardContent>
        </Card>



        {/* Blocked Content Preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gray-100 bg-opacity-75 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="text-center p-6">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">Payment Method Required</p>
              <p className="text-sm text-gray-500">Add a payment method to unlock this feature</p>
            </div>
          </div>
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Payment method exists, render children normally
  return <>{children}</>;
}