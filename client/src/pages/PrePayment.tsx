import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, CreditCard, Calendar, Users, Clock, MapPin } from "lucide-react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          onError(error.message || "Payment failed");
        } else {
          onError("An unexpected error occurred.");
        }
      } else {
        // Payment succeeded
        onSuccess();
      }
    } catch (error) {
      onError("An error occurred while processing payment");
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
      </CardContent>
    </Card>
  );
}

export default function PrePayment() {
  const [location] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestingLink, setRequestingLink] = useState(false);
  const [linkRequestSubmitted, setLinkRequestSubmitted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Parse search parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const bookingId = urlParams.get("booking");
  const amount = parseFloat(urlParams.get("amount") || "0");
  const currency = urlParams.get("currency") || "USD";

  // Fetch booking details
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ["guest-booking-details", bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID required");
      
      const response = await fetch(`/api/guest/bookings/${bookingId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Booking not found");
        }
        throw new Error("Failed to fetch booking details");
      }
      return response.json();
    },
    enabled: !!bookingId,
    retry: 1,
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

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestingLink(true);

    try {
      const response = await fetch(`/api/guest/bookings/${bookingId}/request-payment-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          customerPhone,
        }),
      });

      if (response.ok) {
        setLinkRequestSubmitted(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to request new payment link");
      }
    } catch (error) {
      setError("Failed to request new payment link. Please try again.");
    } finally {
      setRequestingLink(false);
    }
  };

  const handlePaymentSuccess = () => {
    window.location.href = `/payment-success?booking=${bookingId}`;
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!bookingId || !amount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Invalid Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This payment link is invalid.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (linkRequestSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Request Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your request for a new payment link has been sent to the restaurant. 
                  They will contact you with a new link shortly.
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

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Payment Link Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This payment link is invalid or expired. You can request a new payment link below.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">Request New Payment Link</h3>
                <p className="text-sm text-muted-foreground">
                  Please provide your contact information to verify your identity and receive a new payment link.
                </p>
                
                <form onSubmit={handleRequestNewLink} className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={requestingLink || !customerEmail}
                    className="w-full"
                  >
                    {requestingLink ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        Sending Request...
                      </div>
                    ) : (
                      "Request New Payment Link"
                    )}
                  </Button>
                </form>
              </div>
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
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Payment Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Payment Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment processing is not available at this time. Please contact the restaurant directly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto max-w-md">
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <BookingPaymentForm
              booking={booking}
              amount={amount}
              currency={currency}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        )}
        
        {!clientSecret && (
          <Card>
            <CardHeader>
              <CardTitle>Loading Payment...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}