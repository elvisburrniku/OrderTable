import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, CreditCard, Calendar, Users, Clock, MapPin } from "lucide-react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface BookingPaymentFormProps {
  booking: any;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function BookingPaymentForm({ booking, amount, currency, onSuccess, onError }: BookingPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

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
          return_url: `${window.location.origin}/payment-success?booking=${booking.id}`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else {
        // Payment succeeded, update booking status
        try {
          await apiRequest("PUT", `/api/bookings/${booking.id}/payment-status`, {
            status: "confirmed",
            paymentStatus: "paid"
          });
          onSuccess();
        } catch (updateError) {
          console.error("Failed to update booking status:", updateError);
          onSuccess(); // Still redirect even if status update fails
        }
      }
    } catch (err) {
      onError("An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Secure payment to confirm your booking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Summary */}
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <h3 className="font-medium">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{booking.customerName} - {booking.guestCount} {booking.guestCount === 1 ? "guest" : "guests"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{booking.startTime}</span>
            </div>
            {booking.restaurantName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{booking.restaurantName}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t font-medium">
            <span>Total Amount:</span>
            <span className="text-lg">{formatCurrency(amount, currency)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement 
            options={{
              layout: "tabs"
            }}
          />
          
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing} 
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Processing...
              </div>
            ) : (
              `Pay ${formatCurrency(amount, currency)}`
            )}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          Your payment is secured by Stripe. We do not store your card details.
        </div>
      </CardContent>
    </Card>
  );
}

export default function PrePayment() {
  const [location] = useLocation();
  
  // Parse search parameters manually
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const bookingId = urlParams.get("booking");
  const token = urlParams.get("token"); // For guest access
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Check if Stripe is configured
  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Payment Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment processing is not configured. Please contact the restaurant directly to complete your booking.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch booking details using guest access or authenticated access
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["guest-booking-details", bookingId, token],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID required");
      
      // Use guest access endpoint if token is provided
      const endpoint = token 
        ? `/api/guest/bookings/${bookingId}?token=${token}`
        : `/api/bookings/${bookingId}`;
        
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }
      return response.json();
    },
    enabled: !!bookingId,
  });

  // Create payment intent
  useEffect(() => {
    if (booking && booking.requiresPayment && booking.paymentAmount > 0) {
      const createPaymentIntent = async () => {
        try {
          const response = await fetch(
            `/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings/${booking.id}/payment-intent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amount: booking.paymentAmount,
                currency: "usd",
                description: `Payment for booking at ${booking.restaurantName || "restaurant"} - ${booking.customerName}`,
              }),
            }
          );
          
          if (!response.ok) {
            throw new Error("Failed to create payment intent");
          }
          
          const data = await response.json();
          
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setError(data.message || "Failed to create payment intent");
          }
        } catch (error) {
          console.error("Error creating payment intent:", error);
          setError("Failed to initialize payment. Please try again.");
        }
      };

      createPaymentIntent();
    }
  }, [booking]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Invalid Payment Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This payment link is invalid or expired. Please contact the restaurant to get a new payment link.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bookingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payment Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-green-600">
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              </div>
              <p className="text-lg font-medium">Your booking has been confirmed!</p>
              <p className="text-muted-foreground">
                Payment processed successfully. You should receive a confirmation email shortly.
              </p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Booking Confirmed
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Payment Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Booking Not Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The booking could not be found or you don't have permission to access it.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if payment is required and not already paid
  if (!booking.requiresPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                No Payment Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This booking does not require prepayment. Your booking is already confirmed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (booking.paymentStatus === "paid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Already Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This booking has already been paid for and is confirmed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Preparing Payment
              </CardTitle>
              <CardDescription>
                Setting up your payment...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#0570de",
      colorBackground: "#ffffff",
      colorText: "#30313d",
      colorDanger: "#df1b41",
      fontFamily: "system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "8px",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-600 mt-2">
            Secure payment to confirm your booking
          </p>
        </div>

        {stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <BookingPaymentForm
              booking={booking}
              amount={booking.paymentAmount}
              currency="usd"
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Payment Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment processing is not configured.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}