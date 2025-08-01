import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Calendar,
  Users,
  Clock,
  MapPin,
} from "lucide-react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

interface BookingPaymentFormProps {
  booking: any;
  amount: number;
  currency: string;
  token?: string;
  hash?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function BookingPaymentForm({
  booking,
  amount,
  currency,
  token,
  hash,
  onSuccess,
  onError,
}: BookingPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    console.log("Formatting currency:", amount, currency);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Enhanced payment processing with better error handling and user feedback
  const processPayment = async () => {
    if (!stripe || !elements) {
      onError("Payment system not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);

    try {
      // First, submit the payment element to validate all inputs
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || "Payment validation failed");
      }

      // Confirm the payment with enhanced metadata and better error handling
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?booking=${booking.id}&tenant=${booking.tenantId}&restaurant=${booking.restaurantId}`,
          payment_method_data: {
            billing_details: {
              name: booking.customerName,
              email: booking.customerEmail,
              phone: booking.customerPhone,
            },
          },
        },
        redirect: "if_required",
      });

      if (confirmError) {
        console.error("Payment confirmation error:", confirmError);
        
        // Enhanced error handling for different error types
        if (confirmError.type === "card_error") {
          if (confirmError.code === "card_declined") {
            throw new Error("Your card was declined. Please check your card details or try a different payment method.");
          } else if (confirmError.code === "expired_card") {
            throw new Error("Your card has expired. Please use a different payment method.");
          } else if (confirmError.code === "insufficient_funds") {
            throw new Error("Insufficient funds. Please try a different payment method.");
          } else if (confirmError.code === "incorrect_cvc") {
            throw new Error("The security code (CVC) you entered is incorrect. Please try again.");
          } else {
            throw new Error(confirmError.message || "Your card could not be processed. Please check your details and try again.");
          }
        } else if (confirmError.type === "validation_error") {
          throw new Error("Please check your payment details and try again.");
        } else if (confirmError.code === "payment_intent_authentication_failure") {
          throw new Error("Payment authentication failed. Your card may require additional verification from your bank.");
        } else {
          throw new Error(confirmError.message || "Payment failed. Please try again.");
        }
      }

      if (paymentIntent?.status === "succeeded") {
        console.log("Payment successful, triggering success callback");
        onSuccess();
      } else if (paymentIntent?.status === "requires_action") {
        // Handle 3D Secure or other authentication requirements
        onError("Payment requires additional authentication. Please complete the verification step and try again.");
      } else if (paymentIntent?.status === "processing") {
        onError("Your payment is being processed. Please wait a moment and check your booking status.");
      } else {
        onError("Payment processing failed. Please try again or contact the restaurant for assistance.");
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      onError(error.message || "Payment failed. Please try again or contact support for assistance.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await processPayment();

    try {
      // Construct return URL based on payment method (secure token or legacy hash)
      const returnUrl = token
        ? `${window.location.origin}/payment-success?token=${encodeURIComponent(token)}`
        : `${window.location.origin}/payment-success?booking=${booking.id}&hash=${hash}`;

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
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
              <span>
                {booking.customerName} - {booking.guestCount}{" "}
                {booking.guestCount === 1 ? "guest" : "guests"}
              </span>
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
              layout: "tabs",
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

  // Parse search parameters - now using secure token
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Legacy support for old hash-based URLs (to be removed)
  const bookingId = urlParams.get("booking");
  const hash = urlParams.get("hash");
  const legacyAmount = parseFloat(urlParams.get("amount") || "0");
  const legacyCurrency = urlParams.get("currency") || "USD";

  // Fetch booking details using secure token endpoint
  const {
    data: booking,
    isLoading: bookingLoading,
    error: bookingError,
  } = useQuery({
    queryKey: ["secure-booking-details", token || bookingId, hash],
    queryFn: async () => {
      // Support both new token system and legacy hash system
      if (token) {
        const response = await fetch(
          `/api/secure/prepayment/token?token=${encodeURIComponent(token)}`,
        );

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
              throw new Error("Invalid or expired payment link");
            }
            if (response.status === 404) {
              throw new Error("Booking not found");
            }
            if (
              response.status === 400 &&
              errorData.code === "stripe_connect_not_setup"
            ) {
              throw new Error("stripe_connect_not_setup");
            }
            if (
              response.status === 400 &&
              errorData.message === "This booking has already been paid"
            ) {
              // Set a flag to show payment complete instead of error
              setError("payment_already_complete");
              return null;
            }
            throw new Error(
              errorData.message || "Failed to fetch booking details",
            );
          }
        const data = await response.json();

        // If response indicates payment is already complete, mark booking as paid
        if (data.isPaid || data.paymentStatus === 'paid') {
          data.paymentStatus = 'paid';
        }

        return data;
      } else if (bookingId && hash) {
        // Legacy support for hash-based URLs
        const response = await fetch(
          `/api/secure/prepayment/${bookingId}?hash=${hash}`,
        );

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
              throw new Error("Invalid or expired payment link");
            }
            if (response.status === 404) {
              throw new Error("Booking not found");
            }
            if (
              response.status === 400 &&
              errorData.code === "stripe_connect_not_setup"
            ) {
              throw new Error("stripe_connect_not_setup");
            }
            if (
              response.status === 400 &&
              errorData.message === "This booking has already been paid"
            ) {
              // Set a flag to show payment complete instead of error
              setError("payment_already_complete");
              return null;
            }
            throw new Error(
              errorData.message || "Failed to fetch booking details",
            );
          }
        const data = await response.json();

        // If response indicates payment is already complete, mark booking as paid
        if (data.isPaid || data.paymentStatus === 'paid') {
          data.paymentStatus = 'paid';
        }

        return data;
      } else {
        throw new Error(
          "Invalid payment link - missing token or booking parameters",
        );
      }
    },
    enabled: !!(token || (bookingId && hash)),
    retry: 1,
  });

  // Get amount and currency from booking data (secure token) or URL params (legacy)
  const amount = booking?.paymentAmount || legacyAmount;
  const currency = booking?.currency || legacyCurrency || "EUR";

  // Create payment intent using secure endpoint
  useEffect(() => {
    if (
      booking &&
      booking.requiresPayment &&
      booking.paymentAmount > 0 &&
      (token || hash)
    ) {
      const createPaymentIntent = async () => {
        try {
          const response = await fetch(
            `/api/secure/prepayment/payment-intent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                token
                  ? {
                      token: token,
                      amount: booking.paymentAmount,
                      currency: currency,
                    }
                  : {
                      hash: hash,
                      tenant: booking.tenantId,
                      restaurant: booking.restaurantId,
                      bookingId: booking.id,
                      amount: booking.paymentAmount,
                      currency: currency,
                    },
              ),
            },
          );

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 403) {
              setError("invalid_hash");
            } else if (
              response.status === 400 &&
              errorData.code === "stripe_connect_not_setup"
            ) {
              setError("stripe_connect_not_setup");
            } else {
              throw new Error(
                errorData.message || "Failed to create payment intent",
              );
            }
          } else {
            const data = await response.json();

            if (data.clientSecret) {
              setClientSecret(data.clientSecret);
            } else {
              setError(data.message || "Failed to create payment intent");
            }
          }
        } catch (error) {
          console.error("Error creating payment intent:", error);
          setError("Failed to initialize payment. Please try again.");
        }
      };

      createPaymentIntent();
    }
  }, [booking, hash, token]);

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestingLink(true);

    try {
      // Get the actual booking ID from the booking data or URL params
      const actualBookingId = booking?.id || bookingId;

      if (!actualBookingId) {
        setError("Unable to identify booking. Please contact the restaurant directly.");
        setRequestingLink(false);
        return;
      }

      const response = await fetch(
        `/api/guest/bookings/${actualBookingId}/request-payment-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerEmail,
            customerPhone,
          }),
        },
      );

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

  const handleContactRestaurant = async () => {
    setRequestingLink(true);

    try {
      // Get the actual booking ID from the booking data or URL params
      const actualBookingId = booking?.id || bookingId;

      if (!actualBookingId) {
        setError("Unable to identify booking. Please contact the restaurant directly.");
        setRequestingLink(false);
        return;
      }

      const response = await fetch(
        `/api/guest/bookings/${actualBookingId}/contact-restaurant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            issue: "payment_system_not_setup",
            customerEmail: booking?.customerEmail,
            customerName: booking?.customerName,
          }),
        },
      );

      if (response.ok) {
        setLinkRequestSubmitted(true);
      } else {
        setError("Failed to contact restaurant. Please try again.");
      }
    } catch (error) {
      setError("Failed to contact restaurant. Please try again.");
    } finally {
      setRequestingLink(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Use token for new system or fallback to legacy hash system
    if (token) {
      window.location.href = `/payment-success?token=${encodeURIComponent(token)}`;
    } else {
      const actualBookingId = booking?.id || bookingId;
      window.location.href = `/payment-success?booking=${actualBookingId}&hash=${hash}`;
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Validate required parameters for secure access (token or legacy hash system)
  if (!token && (!bookingId || !hash)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Invalid Payment Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This payment link is invalid or missing required security
                  information. Please contact the restaurant for a new payment
                  link.
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
                  Your request for a new payment link has been sent to the
                  restaurant. They will contact you with a new link shortly.
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

  // Check if booking is already paid
  if (booking && booking.paymentStatus === "paid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Payment Complete
              </CardTitle>
              <CardDescription>
                Your booking payment has been successfully processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Booking Summary */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">
                      {booking.customerName} - {booking.guestCount}{" "}
                      {booking.guestCount === 1 ? "guest" : "guests"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">{booking.startTime}</span>
                  </div>
                  {booking.restaurantName && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">
                        {booking.restaurantName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-3 p-4 bg-white rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800">Payment Status</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">Amount Paid:</span>
                  <span className="text-lg font-semibold text-green-800">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currency.toUpperCase(),
                    }).format(amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">Status:</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Paid
                    </span>
                  </div>
                </div>
                {booking.paymentPaidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">Paid On:</span>
                    <span className="text-sm font-medium text-green-800">
                      {new Date(booking.paymentPaidAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </div>
                )}
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your booking is confirmed and payment has been processed
                  successfully. You should receive a confirmation email shortly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bookingError || (!booking && error !== "payment_already_complete")) {
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
                  This payment link is invalid or expired. You can request a new
                  payment link below.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">Request New Payment Link</h3>
                <p className="text-sm text-muted-foreground">
                  Please provide your contact information to verify your
                  identity and receive a new payment link.
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

  if (error === "payment_already_complete") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
                <div className="container mx-auto max-w-md">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-700">
                                <CheckCircle className="h-5 w-5" />
                                Payment Complete
                            </CardTitle>
                            <CardDescription>
                                This booking has already been paid.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    The payment for this booking has already been completed.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }


  if (error) {
    // Handle Stripe Connect not setup case
    if (error === "stripe_connect_not_setup") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-12 px-4">
          <div className="container mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-5 w-5" />
                  Payment System Not Available
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    The restaurant hasn't set up their payment system yet. We'll
                    notify them about this issue.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-medium">What happens next?</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll contact the restaurant to set up their payment system.
                    They will reach out to you with payment instructions.
                  </p>

                  <Button
                    onClick={handleContactRestaurant}
                    disabled={requestingLink}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {requestingLink ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        Contacting Restaurant...
                      </div>
                    ) : (
                      "Contact Restaurant"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

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
                  Payment processing is not available at this time. Please
                  contact the restaurant directly.
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
              token={token}
              hash={hash}
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