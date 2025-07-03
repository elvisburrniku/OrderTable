import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BookingPayment from "@/components/BookingPayment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, CreditCard } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function PaymentPage() {
  const [location] = useLocation();

  // Parse search parameters manually
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const bookingId = urlParams.get("booking");
  const amount = parseFloat(urlParams.get("amount") || "0");
  const currency = urlParams.get("currency") || "USD";
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  // Check if Stripe is configured
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
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
                Payment processing is not configured. Please contact the
                restaurant directly to complete your booking.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch booking details
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID required");
      const response = await apiRequest("GET", `/api/bookings/${bookingId}`);
      return response.json();
    },
    enabled: !!bookingId,
  });

  // Create payment intent
  useEffect(() => {
    if (booking && amount > 0) {
      const createPaymentIntent = async () => {
        try {
          const response = await apiRequest(
            "POST",
            `/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings/${booking.id}/payment`,
            {
              amount,
              currency,
              description: `Payment for booking at ${booking.restaurantName || "restaurant"} - ${booking.name}`,
            },
          );
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
  }, [booking, amount, currency]);

  const handlePaymentSuccess = () => {
    // Redirect to success page
    window.location.href = `/booking-success?booking=${bookingId}`;
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  if (!bookingId || !amount) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
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
                This payment link is invalid or expired. Please contact the
                restaurant to get a new payment link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Payment Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Preparing Payment
            </CardTitle>
            <CardDescription>Setting up your payment...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
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
    <div className="container mx-auto p-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Complete Your Payment</h1>
        <p className="text-muted-foreground">
          Secure payment powered by Stripe
        </p>
      </div>

      {stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <BookingPayment
            booking={booking}
            amount={amount}
            currency={currency}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      ) : (
        <Card className="max-w-md mx-auto">
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
  );
}
