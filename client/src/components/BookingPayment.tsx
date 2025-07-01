import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, RefreshCw } from "lucide-react";

interface BookingPaymentProps {
  booking: {
    id: number;
    tenantId: number;
    restaurantId: number;
    name: string;
    email: string;
    guestCount: number;
    dateTime: string;
  };
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function BookingPayment({ 
  booking, 
  amount, 
  currency = "USD", 
  onSuccess, 
  onError 
}: BookingPaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-success?booking=${booking.id}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        onError?.(error.message || "Payment failed");
      } else {
        toast({
          title: "Payment Successful",
          description: "Your booking payment has been processed successfully!",
        });
        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Complete your booking payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Summary */}
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <h3 className="font-medium">Booking Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Guest:</span>
              <span>{booking.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Party Size:</span>
              <span>{booking.guestCount} {booking.guestCount === 1 ? "guest" : "guests"}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{new Date(booking.dateTime).toLocaleDateString()} at {new Date(booking.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total Amount:</span>
              <span>{formatCurrency(amount, currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          
          <Button 
            type="submit" 
            disabled={!stripe || !elements || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatCurrency(amount, currency)}
              </>
            )}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          <p>Your payment is processed securely by Stripe.</p>
          <p>You will receive a confirmation email after successful payment.</p>
        </div>
      </CardContent>
    </Card>
  );
}