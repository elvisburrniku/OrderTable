import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, Clock, Printer, ArrowLeft } from "lucide-react";

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : Promise.resolve(null);

interface PrintOrderPaymentProps {
  clientSecret: string;
  order: any;
  savedPaymentMethods?: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }>;
  onPaymentSuccess?: (order: any) => void;
  onCancel?: () => void;
}

function PaymentForm({ order, savedPaymentMethods, onPaymentSuccess, onCancel }: {
  order: any;
  savedPaymentMethods?: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }>;
  onPaymentSuccess?: (order: any) => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const { toast } = useToast();



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/print-orders/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const response = await fetch('/api/print-orders/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setPaymentSuccessful(true);
          toast({
            title: "Payment Successful",
            description: `Your print order ${order.orderNumber} has been confirmed!`,
          });
          
          if (onPaymentSuccess) {
            onPaymentSuccess(result.order);
          }
        } else {
          throw new Error('Failed to confirm payment on server');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentSuccessful) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400">
            Your print order has been confirmed and is being processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Order Number:</span>
              <Badge variant="secondary">{order.orderNumber}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Estimated Completion:</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {order.rushOrder ? '24 hours' : '2-3 business days'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Paid:</span>
              <span className="font-semibold">${(order.totalAmount / 100).toFixed(2)}</span>
            </div>
          </div>
          <Separator />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>We've sent a confirmation email to {order.customerEmail} with your order details and tracking information.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Secure payment processing powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Print Type:</span>
                <span className="capitalize">{order.printType}</span>
              </div>
              <div className="flex justify-between">
                <span>Size & Quality:</span>
                <span>{order.printSize} - {order.printQuality}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{order.quantity} copies</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span className="capitalize">{order.deliveryMethod}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${(order.totalAmount / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {savedPaymentMethods && savedPaymentMethods.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Payment Methods</h3>
              <div className="space-y-2">
                {savedPaymentMethods.map((method) => (
                  <div key={method.id} className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          {method.brand?.toUpperCase()} ending in {method.last4}
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Expires {method.exp_month}/{method.exp_year}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Stripe will use your saved payment method or allow you to add a new one
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Information</h3>
            <PaymentElement />
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Pay ${(order.totalAmount / 100).toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PrintOrderPayment({ 
  clientSecret, 
  order, 
  savedPaymentMethods,
  onPaymentSuccess, 
  onCancel 
}: PrintOrderPaymentProps) {
  if (!stripePromise) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-300">Payment Unavailable</CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Stripe payment processing is not configured. Please contact support.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="text-yellow-700 dark:text-yellow-300">Payment Setup Required</CardTitle>
          <CardDescription className="text-yellow-600 dark:text-yellow-400">
            Payment information is missing. Please try creating your order again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0F172A',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm 
        order={order} 
        savedPaymentMethods={savedPaymentMethods}
        onPaymentSuccess={onPaymentSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
}