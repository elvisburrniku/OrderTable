import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import {
  format,
  addDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  getDay,
  eachDayOfInterval,
} from "date-fns";
import ActiveSeasonalThemeDisplay from "@/components/active-seasonal-theme-display";
import SeasonalThemeSelector from "@/components/seasonal-theme-selector";
import {
  RestaurantInfoSkeleton,
  CalendarSkeleton,
  TimeSlotsSkeletonGrid,
  BookingFormSkeleton,
  TableSelectionSkeleton,
  ShimmerSkeleton,
} from "@/components/skeletons/booking-skeleton";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Payment form component for Stripe Elements
interface PaymentFormProps {
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  bookingData: any | null;
  paymentAmount: number;
  currency: string;
  paymentSetup?: any;
}

const PaymentForm = ({ onPaymentSuccess, onPaymentError, bookingData, paymentAmount, currency, paymentSetup }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onPaymentError("Payment system not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);

    try {
      // First, submit the payment element to validate inputs
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || "Payment validation failed");
      }

      // Enhanced payment confirmation with better metadata
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?booking=${bookingData.id}&tenant=${bookingData.tenantId}&restaurant=${bookingData.restaurantId}`,
          payment_method_data: {
            billing_details: {
              name: bookingData.customerName,
              email: bookingData.customerEmail,
              phone: bookingData.customerPhone,
            },
          },
        },
      });

      if (error) {
        console.error('Payment error:', error);
        
        // Enhanced error handling with specific user-friendly messages
        if (error.type === "card_error") {
          if (error.code === "card_declined") {
            onPaymentError("Your card was declined. Please check your card details or try a different payment method.");
          } else if (error.code === "expired_card") {
            onPaymentError("Your card has expired. Please use a different payment method.");
          } else if (error.code === "insufficient_funds") {
            onPaymentError("Insufficient funds. Please try a different payment method.");
          } else if (error.code === "incorrect_cvc") {
            onPaymentError("The security code (CVC) you entered is incorrect. Please try again.");
          } else if (error.code === "incorrect_number") {
            onPaymentError("The card number you entered is incorrect. Please check and try again.");
          } else {
            onPaymentError(error.message || "Your card could not be processed. Please check your details and try again.");
          }
        } else if (error.type === "validation_error") {
          onPaymentError("Please check your payment details and try again.");
        } else if (error.code === "payment_intent_authentication_failure") {
          onPaymentError("Payment authentication failed. Your card may require additional verification from your bank.");
        } else if (error.code === "payment_method_unactivated") {
          onPaymentError("This payment method is not yet activated. Please contact your bank or try a different method.");
        } else if (error.code === "rate_limit") {
          onPaymentError("Too many payment attempts. Please wait a moment and try again.");
        } else {
          onPaymentError(error.message || "Payment failed. Please try again or contact the restaurant for assistance.");
        }
      } else if (paymentIntent) {
        // Enhanced payment status handling
        if (paymentIntent.status === 'succeeded') {
          console.log('Payment successful - processing confirmation');
          onPaymentSuccess();
        } else if (paymentIntent.status === 'requires_action') {
          onPaymentError("Payment requires additional verification. Please complete the authentication step.");
        } else if (paymentIntent.status === 'processing') {
          // Payment is being processed - wait a moment and check status
          onPaymentError("Payment is being processed. Please wait a moment and refresh the page to check status.");
        } else {
          onPaymentError("Payment could not be completed. Please try again.");
        }
      } else {
        onPaymentError("Payment failed. Please try again.");
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      onPaymentError("An error occurred while processing your payment. Please try again or contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentTypeTitle = () => {
    if (paymentSetup?.type === 'deposit') return 'Complete Deposit Payment';
    if (paymentSetup?.type === 'prepayment') return 'Complete Prepayment';
    if (paymentSetup?.type === 'reserve') return 'Pay Reservation Fee';
    if (paymentSetup?.type === 'no_show_fee') return 'Pay No-Show Fee';
    return 'Complete Payment';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {getPaymentTypeTitle()}
        </CardTitle>
        <CardDescription>
          {paymentSetup?.description || 'Secure payment to confirm your booking'}
        </CardDescription>
        {paymentSetup && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>{paymentSetup.name}</strong>
              {paymentSetup.type && (
                <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded-full capitalize">
                  {paymentSetup.type.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Summary */}
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <h3 className="font-medium">Booking Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {bookingData ? `${bookingData.customerName} - ${bookingData.guestCount}` : "Guest Booking"} {" "}
                {bookingData ? (bookingData.guestCount === 1 ? "guest" : "guests") : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{bookingData ? new Date(bookingData.bookingDate).toLocaleDateString() : "Selected Date"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{bookingData ? bookingData.startTime : "Selected Time"}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t font-medium">
            <span>Total Amount:</span>
            <span className="text-lg">{formatCurrency(paymentAmount, currency)}</span>
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
              `Pay ${formatCurrency(paymentAmount, currency)}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function GuestBookingResponsive(props: any) {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");

  // Extract parameters from URL path manually if useRoute doesn't work
  const pathParts = window.location.pathname.split("/");
  const pathTenantId = pathParts[2];
  const pathRestaurantId = pathParts[3];

  const tenantId =
    params?.tenantId ||
    pathTenantId ||
    props.params?.tenantId ||
    props.tenantId;
  const restaurantId =
    params?.restaurantId ||
    pathRestaurantId ||
    props.params?.restaurantId ||
    props.restaurantId;
  const { toast } = useToast();

  // Use fallback values if parameters are missing
  const finalTenantId = tenantId || "1";
  const finalRestaurantId = restaurantId || "1";

  const [currentStep, setCurrentStep] = useState(0);

  // Set default guest count based on time of day
  const getDefaultGuestCount = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 7 && currentHour < 12) return 2; // Breakfast - smaller groups
    if (currentHour >= 12 && currentHour < 17) return 3; // Lunch - medium groups
    if (currentHour >= 17 && currentHour < 21) return 4; // Dinner - larger groups
    return 2; // Late night - smaller groups
  };

  const [guestCount, setGuestCount] = useState(getDefaultGuestCount());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: "",
  });
  const [selectedSeasonalTheme, setSelectedSeasonalTheme] = useState<
    string | null
  >(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [bookingCreated, setBookingCreated] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState<any>(null);

  // Restore booking data from localStorage on component mount (in case of page refresh after payment)
  useEffect(() => {
    const savedBookingData = localStorage.getItem('guest_booking_data');
    if (savedBookingData) {
      try {
        const parsedData = JSON.parse(savedBookingData);
        
        // Only restore if we're at the start of the booking flow and no data is already set
        if (!selectedDate && !selectedTime && !customerData.name) {
          if (parsedData.selectedDate) {
            setSelectedDate(new Date(parsedData.selectedDate));
          }
          setSelectedTime(parsedData.selectedTime || "");
          setGuestCount(parsedData.guestCount || 2);
          setCustomerData(parsedData.customerData || {});
          setSelectedSeasonalTheme(parsedData.selectedSeasonalTheme);
        }
      } catch (error) {
        console.error('Error parsing saved booking data:', error);
        localStorage.removeItem('guest_booking_data');
      }
    }
  }, []); // Run only once on mount



  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: [
      `/api/public/tenants/${finalTenantId}/restaurants/${finalRestaurantId}`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch opening hours
  const { data: openingHours, isLoading: openingHoursLoading } = useQuery({
    queryKey: [
      `/api/public/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/opening-hours`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch seasonal themes to determine if Experience step should be shown
  const { data: seasonalThemes = [] } = useQuery({
    queryKey: [
      `/api/public/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/seasonal-themes`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch cut-off times
  const { data: cutOffTimes } = useQuery({
    queryKey: [
      `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/cut-off-times`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch special periods
  const { data: specialPeriods, isLoading: specialPeriodsLoading } = useQuery({
    queryKey: [
      `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/special-periods`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch available slots
  const { data: availableSlots } = useQuery({
    queryKey: [
      `/api/restaurants/${finalRestaurantId}/available-slots`,
      selectedDate,
    ],
    enabled: !!finalRestaurantId && !!selectedDate,
  });

  // Fetch payment setup information
  const { data: paymentInfo, isLoading: paymentInfoLoading } = useQuery({
    queryKey: [
      `/api/public/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/payment-setup`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Fetch booking configuration to get currency settings
  const { data: bookingConfig } = useQuery({
    queryKey: [
      `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/booking-config`,
    ],
    enabled: !!(finalTenantId && finalRestaurantId),
  });

  // Calculate payment amount based on setup and guest count
  const calculatePaymentAmount = () => {
    if (!paymentInfo?.paymentSetup) return 0;
    
    const setup = paymentInfo.paymentSetup;
    const amount = parseFloat(setup.amount) || 0;
    
    if (setup.priceUnit === 'per_guest') {
      return amount * guestCount;
    } else if (setup.priceUnit === 'per_booking') {
      return amount;
    } else {
      // per_table - default to per_booking logic
      return amount;
    }
  };

  const paymentAmount = calculatePaymentAmount();
  
  // Get currency from booking config, defaulting to EUR
  const currency = bookingConfig?.currency || 'EUR';

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(
        `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/bookings/guest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Booking failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBookingId(data.id);
      setCreatedBookingData(data);
      
      const hasPaymentStep = paymentInfo?.requiresPayment && paymentInfo?.stripeConnectReady;
      
      if (hasPaymentStep && data.requiresPayment && data.paymentAmount > 0) {
        // Create payment intent for the booking
        createPaymentIntent(data);
        // Don't set bookingCreated to true yet - wait for payment completion
        console.log(`Booking created with payment required, setting up payment form`);
      } else {
        // No payment required, booking is complete
        setBookingCreated(true);
        setCurrentStep(steps.length); // Go to success screen
        toast({
          title: "Booking Confirmed!",
          description: "Your reservation has been successfully created.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error creating your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create payment intent without booking first
  const createPaymentIntentForGuest = async () => {
    try {
      console.log('Creating payment intent for guest booking (no booking created yet)');
      
      // Store booking data in localStorage before payment to preserve it after redirect
      const bookingData = {
        selectedDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
        selectedTime: selectedTime,
        guestCount: guestCount,
        customerData: customerData,
        selectedSeasonalTheme: selectedSeasonalTheme,
        paymentAmount: paymentAmount,
        restaurant: restaurant?.name || '',
        tenantId: finalTenantId,
        restaurantId: finalRestaurantId
      };
      localStorage.setItem('guest_booking_data', JSON.stringify(bookingData));
      
      const response = await fetch(
        `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/guest-payment-intent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: paymentAmount,
            currency: currency,
            metadata: {
              customerName: customerData.name,
              customerEmail: customerData.email,
              bookingDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
              startTime: selectedTime,
              guestCount: guestCount,
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment setup failed');
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      console.log('Payment intent created successfully');
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      setPaymentError(error.message);
    }
  };

  // Create payment intent for booking (legacy)
  const createPaymentIntent = async (bookingData: any) => {
    try {
      console.log('Creating payment intent for booking:', bookingData);
      
      const response = await fetch(
        `/api/tenants/${finalTenantId}/restaurants/${finalRestaurantId}/bookings/${bookingData.id}/payment-intent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: bookingData.paymentAmount,
            currency: currency,
            description: `Payment for booking at ${restaurant?.name || 'restaurant'} - ${bookingData.customerName}`
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const data = await response.json();
      console.log('Payment intent created:', data);
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      setPaymentError(error.message);
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Unable to set up payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Dynamic steps based on available seasonal themes and payment requirements
  const hasPaymentStep = paymentInfo?.requiresPayment && 
    (paymentInfo?.stripeConnectReady || (paymentInfo?.paymentSetup?.isActive));
  
  const steps = [
    { title: "Date", icon: Calendar },
    { title: "Time", icon: Clock },
    { title: "Guests", icon: Users },
    ...(seasonalThemes.length > 0
      ? [{ title: "Experience", icon: Sparkles }]
      : []),
    { title: "Details", icon: User },
    ...(hasPaymentStep
      ? [{ title: "Payment", icon: CreditCard }]
      : []),
  ];

  // Auto-create payment intent when payment step is reached
  useEffect(() => {
    const isPaymentStep = currentStep === steps.length - 1 && hasPaymentStep;
    
    console.log('Payment intent effect:', {
      currentStep,
      stepsLength: steps.length,
      hasPaymentStep,
      isPaymentStep,
      hasClientSecret: !!clientSecret,
      hasPaymentError: !!paymentError,
      hasCustomerData: !!(customerData.name && customerData.email)
    });
    
    if (isPaymentStep && !clientSecret && !paymentError && customerData.name && customerData.email) {
      console.log('Creating payment intent for guest...');
      createPaymentIntentForGuest();
    }
  }, [currentStep, steps.length, hasPaymentStep, clientSecret, paymentError, customerData]);

  // Handle payment return from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const paymentIntentId = urlParams.get('payment_intent');
    const redirectStatus = urlParams.get('redirect_status');

    // Only handle payment return if we have payment setup and seasonal themes loaded
    if (!paymentInfo || seasonalThemes === undefined) return;

    if (paymentStatus === 'success' && redirectStatus === 'succeeded') {
      // Restore booking data from localStorage
      const savedBookingData = localStorage.getItem('guest_booking_data');
      if (savedBookingData) {
        try {
          const parsedData = JSON.parse(savedBookingData);
          
          // Restore form state
          if (parsedData.selectedDate) {
            setSelectedDate(new Date(parsedData.selectedDate));
          }
          setSelectedTime(parsedData.selectedTime || "");
          setGuestCount(parsedData.guestCount || 2);
          setCustomerData(parsedData.customerData || {});
          setSelectedSeasonalTheme(parsedData.selectedSeasonalTheme);
          
          // Payment was successful - show confirmation
          setBookingCreated(true);
          setPaymentError(null);
          setCurrentStep(steps.length); // Go to success step
          
          toast({
            title: "Payment Successful!",
            description: "Your booking has been confirmed.",
          });

          // Create booking in background since payment was successful
          const bookingData = {
            bookingDate: parsedData.selectedDate,
            startTime: parsedData.selectedTime,
            guestCount: parsedData.guestCount,
            customerName: parsedData.customerData?.name,
            customerEmail: parsedData.customerData?.email,
            customerPhone: parsedData.customerData?.phone,
            specialRequests: parsedData.customerData?.comment || null,
            seasonalThemeId: parsedData.selectedSeasonalTheme ? parseInt(parsedData.selectedSeasonalTheme) : null,
            source: "guest_booking",
            requiresPayment: true,
            paymentAmount: parsedData.paymentAmount,
            paymentDeadlineHours: 24,
            paymentIntentId: paymentIntentId, // Include payment intent ID for webhook matching
          };
          
          // Only create booking if we have the necessary data
          if (parsedData.customerData?.name && parsedData.customerData?.email) {
            createBookingMutation.mutate(bookingData);
          }

          // Clean up localStorage and URL parameters
          localStorage.removeItem('guest_booking_data');
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error parsing saved booking data:', error);
          localStorage.removeItem('guest_booking_data');
        }
      }
    } else if (redirectStatus === 'failed' || paymentStatus === 'failed') {
      // Payment failed - show error and allow retry
      setPaymentError("Payment failed. Please try again with a different payment method.");
      
      // Reset client secret to allow retry
      setClientSecret(null);
      
      toast({
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again.",
        variant: "destructive",
      });

      // Clean up URL parameters but keep localStorage for retry
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [paymentInfo, seasonalThemes, steps.length, toast, createBookingMutation]);

  // Debug logging
  console.log(`Steps configuration: ${steps.map(s => s.title).join(', ')}`);
  console.log(`Current step: ${currentStep}, Payment required: ${paymentInfo?.requiresPayment}, Stripe ready: ${paymentInfo?.stripeConnectReady}, Payment setup:`, paymentInfo?.paymentSetup);
  console.log('Full payment info:', paymentInfo);
  console.log('Payment step detection:', {
    hasPaymentInfo: !!paymentInfo,
    requiresPayment: paymentInfo?.requiresPayment,
    stripeConnectReady: paymentInfo?.stripeConnectReady,
    hasPaymentSetup: !!paymentInfo?.paymentSetup,
    paymentSetupActive: paymentInfo?.paymentSetup?.isActive,
    shouldShowPaymentStep: paymentInfo?.requiresPayment && (paymentInfo?.stripeConnectReady || paymentInfo?.paymentSetup),
    stepsLength: steps.length,
    isPaymentStep: currentStep === steps.length - 1
  });

  const handleNext = () => {
    const detailsStepIndex = seasonalThemes.length > 0 ? 4 : 3;

    console.log('HandleNext called:', {
      currentStep,
      stepsLength: steps.length,
      hasPaymentStep,
      isLastStep: currentStep === steps.length - 1
    });

    if (currentStep < steps.length - 1) {
      // Regular step progression - don't create booking until payment step if payment is required
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - either submit booking or handle payment completion
      if (!hasPaymentStep) {
        // No payment required, create booking directly
        const bookingData = {
          bookingDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
          startTime: selectedTime,
          guestCount: guestCount,
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          specialRequests: customerData.comment || null,
          seasonalThemeId: selectedSeasonalTheme
            ? parseInt(selectedSeasonalTheme)
            : null,
          source: "guest_booking",
          // No payment required for this booking
          requiresPayment: false,
          paymentAmount: 0,
          paymentDeadlineHours: 24,
        };
        createBookingMutation.mutate(bookingData);
      } else {
        // Payment required - just go to payment step (don't create booking yet)
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    const hasThemes = seasonalThemes.length > 0;

    console.log('Step validation:', {
      currentStep,
      hasThemes,
      hasPaymentStep,
      selectedDate: !!selectedDate,
      selectedTime: !!selectedTime,
      guestCount,
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone
    });

    switch (currentStep) {
      case 0:
        return selectedDate !== null;
      case 1:
        return selectedTime !== "";
      case 2:
        return guestCount >= 1;
      case 3:
        if (hasThemes) {
          return true; // Seasonal theme is optional
        } else {
          // If no themes, step 3 is the Details step
          return customerData.name && customerData.email && customerData.phone;
        }
      case 4:
        if (hasThemes) {
          return customerData.name && customerData.email && customerData.phone; // Details step when themes exist
        } else if (hasPaymentStep) {
          return true; // Payment step when no themes
        } else {
          return false;
        }
      case 5:
        if (hasThemes && hasPaymentStep) {
          return true; // Payment step when themes exist
        } else {
          return false;
        }
      default:
        return false;
    }
  };

  // Generate calendar dates for current month view
  const generateCalendarDates = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const calendarDates = generateCalendarDates();

  // Navigation functions
  const goToPreviousMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    // Don't allow going to months before current month
    if (prevMonth >= startOfMonth(new Date())) {
      setCurrentMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Get day names for header
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Utility functions for booking validation and time slot generation

  // Get special period opening hours for a specific date (if restaurant is open during special period)
  const getSpecialPeriodHours = (date: Date) => {
    if (!specialPeriods || !Array.isArray(specialPeriods)) return null;

    const dateStr = format(date, "yyyy-MM-dd");

    const activePeriod = specialPeriods.find((period: any) => {
      if (!period.startDate || !period.endDate || !period.isOpen) return false;

      const startDate = format(new Date(period.startDate), "yyyy-MM-dd");
      const endDate = format(new Date(period.endDate), "yyyy-MM-dd");

      return dateStr >= startDate && dateStr <= endDate;
    });

    if (activePeriod && activePeriod.openTime && activePeriod.closeTime) {
      // Handle midnight close time (00:00) as end of day (23:59)
      let closeTime = activePeriod.closeTime;
      if (closeTime === "00:00") {
        closeTime = "23:59";
      }

      return {
        openTime: activePeriod.openTime,
        closeTime: closeTime,
        isOpen: true,
      };
    }

    return null;
  };

  // Check if a date is blocked by special periods (only when restaurant is closed)
  const isDateBlockedBySpecialPeriods = (date: Date) => {
    if (!specialPeriods || !Array.isArray(specialPeriods)) return false;

    const dateStr = format(date, "yyyy-MM-dd");

    return specialPeriods.some((period: any) => {
      if (!period.startDate || !period.endDate) return false;

      const startDate = format(new Date(period.startDate), "yyyy-MM-dd");
      const endDate = format(new Date(period.endDate), "yyyy-MM-dd");

      // Only block if date is in period AND restaurant is closed during this period
      const isInPeriod = dateStr >= startDate && dateStr <= endDate;
      const isRestaurantClosed = !period.isOpen;

      return isInPeriod && isRestaurantClosed;
    });
  };

  // Helper function to check if date is disabled in opening hours
  const isDateDisabledInOpeningHours = (date: Date) => {
    if (!openingHours || !Array.isArray(openingHours)) return false;

    const dayOfWeek = date.getDay();
    const dayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek);

    // If no configuration found for this day or explicitly marked as closed
    return !dayHours || !dayHours.isOpen;
  };

  // Check if booking is within cut-off time restrictions
  const isWithinCutOffTime = (timeSlot: string, date: Date) => {
    if (!cutOffTimes || !Array.isArray(cutOffTimes) || !timeSlot || !date)
      return false;

    const now = new Date();
    const bookingDateTime = new Date(date);

    // Parse time slot (handle both HH:MM and H:MM formats)
    if (!timeSlot.includes(":")) return false;
    const timeSlotParts = timeSlot.split(":");
    if (timeSlotParts.length !== 2) return false;

    const [slotHour, slotMin] = timeSlotParts.map(Number);
    if (isNaN(slotHour) || isNaN(slotMin)) return false;

    // Set the booking time
    bookingDateTime.setHours(slotHour, slotMin, 0, 0);

    const dayOfWeek = date.getDay();
    const cutOff = cutOffTimes.find((c: any) => c.dayOfWeek === dayOfWeek);

    if (
      cutOff &&
      typeof cutOff.cutOffHours === "number" &&
      cutOff.cutOffHours > 0
    ) {
      // Cut-off time in hours (e.g., 1 = 1 hour before, 2 = 2 hours before)
      const cutOffMinutes = cutOff.cutOffHours * 60;

      // Calculate the minimum allowed booking time from now
      const minAllowedBookingTime = new Date(
        now.getTime() + cutOffMinutes * 60 * 1000,
      );

      // If the requested booking time is before the minimum allowed time, it's not allowed
      // Example: If it's 11:00 AM and cut-off is 1 hour, can't book before 12:00 PM
      return bookingDateTime < minAllowedBookingTime;
    }

    // Legacy support for cutOffTime format (if still used)
    if (cutOff && cutOff.cutOffTime && cutOff.cutOffTime.includes(":")) {
      const cutOffTimeParts = cutOff.cutOffTime.split(":");
      if (cutOffTimeParts.length === 2) {
        const [cutHour, cutMin] = cutOffTimeParts.map(Number);
        if (!isNaN(cutHour) && !isNaN(cutMin)) {
          const cutOffMinutes = cutHour * 60 + cutMin;
          const minAllowedBookingTime = new Date(
            now.getTime() + cutOffMinutes * 60 * 1000,
          );
          return bookingDateTime < minAllowedBookingTime;
        }
      }
    }

    return false;
  };

  // Generate time slots based on opening hours or special period hours
  const generateTimeSlotsForDate = (date: Date) => {
    if (!date) return [];

    // Check for special period hours first
    const specialHours = getSpecialPeriodHours(date);
    let effectiveHours = null;

    if (specialHours) {
      // Use special period hours if restaurant is open during special period
      effectiveHours = specialHours;
    } else if (openingHours && Array.isArray(openingHours)) {
      // Use regular opening hours
      const dayOfWeek = date.getDay();
      const dayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek);
      if (dayHours && dayHours.isOpen) {
        effectiveHours = dayHours;
      }
    }

    if (!effectiveHours || !effectiveHours.isOpen) return [];

    // Validate hours format
    if (
      !effectiveHours.openTime ||
      !effectiveHours.closeTime ||
      !effectiveHours.openTime.includes(":") ||
      !effectiveHours.closeTime.includes(":")
    )
      return [];

    const openTimeParts = effectiveHours.openTime.split(":");
    const closeTimeParts = effectiveHours.closeTime.split(":");

    if (openTimeParts.length !== 2 || closeTimeParts.length !== 2) return [];

    const [openHour, openMin] = openTimeParts.map(Number);
    const [closeHour, closeMin] = closeTimeParts.map(Number);

    if (
      isNaN(openHour) ||
      isNaN(openMin) ||
      isNaN(closeHour) ||
      isNaN(closeMin)
    )
      return [];

    const slots = [];

    // Start from opening time
    let currentHour = openHour;
    let currentMin = openMin;

    // Generate 15-minute intervals until closing time
    while (true) {
      const slotTime = currentHour * 60 + currentMin;
      const closeTime = closeHour * 60 + closeMin;

      // Stop if we've reached or passed closing time
      if (slotTime >= closeTime) break;

      const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
      slots.push(timeString);

      // Add 15 minutes
      currentMin += 15;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    return slots;
  };

  // Check if a date is available based on priority hierarchy
  const isDateAvailable = (date: Date) => {
    // Check if date is in the past
    const today = startOfDay(new Date());
    if (date < today) return false;

    // Priority 1: Check for special periods first (highest priority)
    const specialHours = getSpecialPeriodHours(date);
    if (specialHours) {
      // Special period found - use its configuration
      if (!specialHours.isOpen) {
        // Restaurant is closed during this special period
        return false;
      }
      // Restaurant is open with custom hours during special period - date is available
      return true;
    }

    // Priority 2: Check if date is blocked by special periods (closed periods)
    if (isDateBlockedBySpecialPeriods(date)) {
      return false;
    }

    // Priority 3: Check opening hours configuration (base rule)
    if (isDateDisabledInOpeningHours(date)) {
      return false;
    }

    // Priority 4: Check cut-off times for today only
    const isToday =
      format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    if (isToday && cutOffTimes && Array.isArray(cutOffTimes)) {
      const dayOfWeek = date.getDay();
      const cutOff = cutOffTimes.find((c: any) => c.dayOfWeek === dayOfWeek);

      if (cutOff && cutOff.cutOffTime) {
        // Check if there would be any available slots today considering cut-off
        const sampleSlot = "20:00";
        if (isWithinCutOffTime(sampleSlot, date)) {
          // If even evening slots are blocked by cut-off, the whole day is blocked
          return false;
        }
      }
    }

    return true;
  };

  // Get time slots for the selected date
  const timeSlots = selectedDate ? generateTimeSlotsForDate(selectedDate) : [];

  // Check if a time slot is valid based on priority hierarchy
  const isTimeSlotValid = (timeSlot: string, date: Date) => {
    if (!date || !timeSlot) return false;

    const dayOfWeek = date.getDay();

    // Priority 1: Check for special periods first (highest priority)
    const specialHours = getSpecialPeriodHours(date);
    let effectiveHours = null;

    if (specialHours) {
      // Special period found - use its configuration
      if (!specialHours.isOpen) {
        // Restaurant is closed during this special period
        return false;
      }
      effectiveHours = specialHours;
    } else {
      // Priority 2: Check if date is blocked by special periods (closed periods)
      if (isDateBlockedBySpecialPeriods(date)) {
        return false;
      }

      // Priority 3: Use regular opening hours (base rule)
      if (openingHours && Array.isArray(openingHours)) {
        const dayHours = openingHours.find(
          (h: any) => h.dayOfWeek === dayOfWeek,
        );
        if (dayHours && dayHours.isOpen) {
          effectiveHours = dayHours;
        }
      }

      // If no opening hours found or day is closed
      if (!effectiveHours || !effectiveHours.isOpen) {
        return false;
      }
    }

    // Priority 4: Check cut-off time restrictions (lowest priority)
    if (isWithinCutOffTime(timeSlot, date)) {
      return false;
    }

    // Validate timeSlot format
    if (!timeSlot.includes(":")) return false;

    const timeSlotParts = timeSlot.split(":");
    if (timeSlotParts.length !== 2) return false;

    const [hours, minutes] = timeSlotParts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;

    const slotTime = hours * 60 + minutes; // Convert to minutes

    // Validate effective hours format
    if (
      !effectiveHours.openTime ||
      !effectiveHours.closeTime ||
      !effectiveHours.openTime.includes(":") ||
      !effectiveHours.closeTime.includes(":")
    )
      return false;

    const openTimeParts = effectiveHours.openTime.split(":");
    const closeTimeParts = effectiveHours.closeTime.split(":");

    if (openTimeParts.length !== 2 || closeTimeParts.length !== 2) return false;

    const [openHour, openMin] = openTimeParts.map(Number);
    const [closeHour, closeMin] = closeTimeParts.map(Number);

    if (
      isNaN(openHour) ||
      isNaN(openMin) ||
      isNaN(closeHour) ||
      isNaN(closeMin)
    )
      return false;

    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    if (slotTime < openTime || slotTime > closeTime) return false;

    return true;
  };

  // Generate personalized welcome message based on time of day
  const getWelcomeMessage = () => {
    const currentHour = new Date().getHours();
    const restaurantName = (restaurant as any)?.name || "Our Restaurant";

    if (currentHour >= 5 && currentHour < 12) {
      return {
        greeting: "Good Morning!",
        message: `Start your day with a delicious breakfast at ${restaurantName}`,
        icon: "🌅",
        mealType: "breakfast",
        suggestion:
          "Perfect time for fresh pastries, coffee, and morning specialties",
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      return {
        greeting: "Good Afternoon!",
        message: `Perfect time for lunch at ${restaurantName}`,
        icon: "☀️",
        mealType: "lunch",
        suggestion:
          "Enjoy our midday menu with light dishes and refreshing beverages",
      };
    } else if (currentHour >= 17 && currentHour < 21) {
      return {
        greeting: "Good Evening!",
        message: `Join us for an exceptional dinner at ${restaurantName}`,
        icon: "🌆",
        mealType: "dinner",
        suggestion:
          "Indulge in our signature dishes and fine dining experience",
      };
    } else {
      return {
        greeting: "Welcome!",
        message: `Experience late-night dining at ${restaurantName}`,
        icon: "🌙",
        mealType: "late-night",
        suggestion: "Discover our special late-night menu and cozy atmosphere",
      };
    }
  };

  const welcomeMessage = getWelcomeMessage();

  // Get recommended time slots based on current time and available slots
  const getRecommendedTimeSlots = (availableSlots: string[]) => {
    if (!availableSlots.length) return [];

    const currentHour = new Date().getHours();
    let preferredTimes: string[] = [];

    if (currentHour >= 5 && currentHour < 12) {
      // Morning - recommend breakfast times
      preferredTimes = ["08:00", "09:00", "10:00", "11:00"];
    } else if (currentHour >= 12 && currentHour < 17) {
      // Afternoon - recommend lunch times
      preferredTimes = ["12:00", "12:30", "13:00", "13:30", "14:00"];
    } else if (currentHour >= 17 && currentHour < 21) {
      // Evening - recommend dinner times
      preferredTimes = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
    } else {
      // Late night - recommend available evening slots
      preferredTimes = ["21:00", "21:30", "22:00"];
    }

    // Return only preferred times that are actually available
    return preferredTimes.filter((time) => availableSlots.includes(time));
  };

  const recommendedSlots = getRecommendedTimeSlots(timeSlots);

  // Show success screen only when booking is truly complete (no payment required OR payment successful)
  if (bookingCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            {/* Main Heading */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Confirmed!
            </h1>
            
            {/* Subtitle */}
            <p className="text-gray-600 mb-8">
              Your reservation at {(restaurant as any)?.name} has been successfully created.
            </p>
            
            {/* Booking Details */}
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Booking ID:</span>
                <span className="text-gray-900 font-semibold">#{bookingId}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Date:</span>
                <span className="text-gray-900">
                  {selectedDate && format(selectedDate, "MMMM d, yyyy")}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Time:</span>
                <span className="text-gray-900">{selectedTime}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Guests:</span>
                <span className="text-gray-900">{guestCount}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{customerData.name}</span>
              </div>
            </div>
            
            {/* Email Confirmation Note */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                A confirmation email has been sent to
              </p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {customerData.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-slate-900 via-blue-900 to-indigo-900 bg-[#431b6d]">
      {/* Header with Personalized Welcome */}
      <div className="text-center py-6 md:py-8 px-4 bg-[#431b6d]">
        <div className="mb-4 animate-fade-in">
          <span className="text-4xl md:text-6xl mb-2 block animate-bounce">
            {welcomeMessage.icon}
          </span>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-300 mb-2">
            {welcomeMessage.greeting}
          </h1>
        </div>
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 md:mb-4">
          Reserve Your Table
        </h2>
        <p className="text-sm md:text-lg lg:text-xl text-blue-100 max-w-3xl mx-auto mb-3">
          {welcomeMessage.message}
        </p>
        <p className="text-xs md:text-sm text-blue-200/80 max-w-2xl mx-auto italic">
          {welcomeMessage.suggestion}
        </p>
      </div>
      {/* Progress Steps */}
      <div className="px-4 md:mb-8 bg-[#431b6d] mt-[0px] mb-[0px]">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className={
                      isActive
                        ? "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 bg-blue-500 text-white"
                        : isCompleted
                          ? "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 bg-green-500 text-white"
                          : "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 bg-white/20 text-white/60"
                    }
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      <Icon className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </div>
                  <span
                    className={`text-xs md:text-sm font-medium ${isActive || isCompleted ? "text-white" : "text-white/60"}`}
                  >
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div
                      className={`hidden md:block absolute h-0.5 w-16 lg:w-24 mt-6 ml-16 lg:ml-24 ${isCompleted ? "bg-green-500" : "bg-white/20"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 px-4 pb-6 bg-[#431b6d]">
        {/* Seasonal Theme Display (only if themes exist) */}
        {seasonalThemes.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <ActiveSeasonalThemeDisplay
              restaurantId={parseInt(restaurantId)}
              tenantId={parseInt(tenantId)}
              variant="compact"
            />
          </div>
        )}

        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Date Selection */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                  Select Date
                </h2>

                {/* Show loading skeleton while data is loading */}
                {restaurantLoading ||
                openingHoursLoading ||
                specialPeriodsLoading ? (
                  <CalendarSkeleton />
                ) : (
                  <>
                    {/* Month Navigation Header */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousMonth}
                        disabled={
                          startOfMonth(currentMonth) <= startOfMonth(new Date())
                        }
                        className="flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      <h3 className="text-lg font-semibold text-gray-800">
                        {format(currentMonth, "MMMM yyyy")}
                      </h3>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextMonth}
                        className="flex items-center space-x-1"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-500 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Empty cells for proper day alignment - Monday first */}
                      {(() => {
                        const firstDayOfMonth = getDay(
                          startOfMonth(currentMonth),
                        );
                        // Convert to Monday-first: Sunday=0 -> 6, Monday=1 -> 0, Tuesday=2 -> 1, etc.
                        const mondayFirstOffset =
                          firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

                        return Array.from({ length: mondayFirstOffset }).map(
                          (_, index) => (
                            <div key={`empty-${index}`} className="h-12"></div>
                          ),
                        );
                      })()}

                      {/* Date buttons */}
                      {calendarDates.map((date, index) => {
                        const isSelected =
                          selectedDate &&
                          format(selectedDate, "yyyy-MM-dd") ===
                            format(date, "yyyy-MM-dd");
                        const isToday =
                          format(date, "yyyy-MM-dd") ===
                          format(new Date(), "yyyy-MM-dd");
                        const isPastDate = date < startOfDay(new Date());
                        const isAvailable =
                          !isPastDate && isDateAvailable(date);

                        return (
                          <button
                            key={index}
                            onClick={() => isAvailable && setSelectedDate(date)}
                            disabled={!isAvailable}
                            className={
                              isPastDate
                                ? "h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                : !isAvailable
                                  ? "h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center border-red-300 bg-red-100 text-red-600 cursor-not-allowed"
                                  : isSelected
                                    ? "h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center border-blue-500 bg-blue-500 text-white shadow-lg"
                                    : isToday
                                      ? "h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center border-green-400 bg-green-100 text-green-700 font-semibold"
                                      : "h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100"
                            }
                          >
                            <span className="text-sm font-medium">
                              {format(date, "d")}
                            </span>
                            {isToday && isAvailable && (
                              <span className="text-xs">Today</span>
                            )}
                            {isPastDate && (
                              <span className="text-xs">Past</span>
                            )}
                            {!isAvailable && !isPastDate && (
                              <span className="text-xs">Closed</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center text-sm text-gray-600 space-y-1">
                      <p>Select your preferred date • Today is highlighted</p>
                      <div className="text-xs flex justify-center items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                          <span>Available</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                          <span>Closed</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 1: Time Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    Select Time
                  </h2>

                  {/* Show loading skeleton while data is loading */}
                  {restaurantLoading ||
                  openingHoursLoading ||
                  specialPeriodsLoading ? (
                    <TimeSlotsSkeletonGrid />
                  ) : (
                    <>
                      {timeSlots.length > 0 && (
                        <p className="text-sm text-blue-600 font-medium">
                          ⭐ Recommended for {welcomeMessage.mealType}
                        </p>
                      )}

                      {timeSlots.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">
                            No time slots available for this date
                          </p>
                          <p className="text-sm text-gray-500">
                            Please select a different date
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {timeSlots.map((time) => {
                              const isRecommended =
                                recommendedSlots.includes(time);
                              const isValidByRules = selectedDate
                                ? isTimeSlotValid(time, selectedDate)
                                : false;
                              const isAvailableBySystem =
                                !(availableSlots as any) ||
                                (availableSlots as any).slots?.includes(time);
                              const isAvailable =
                                isValidByRules && isAvailableBySystem;
                              const isSelected = selectedTime === time;

                              return (
                                <button
                                  key={time}
                                  onClick={() =>
                                    isAvailable && setSelectedTime(time)
                                  }
                                  disabled={!isAvailable}
                                  className={
                                    !isAvailable
                                      ? "relative p-3 rounded-lg border-2 transition-all duration-200 border-red-300 bg-red-100 text-red-600 cursor-not-allowed"
                                      : isSelected
                                        ? "relative p-3 rounded-lg border-2 transition-all duration-200 border-blue-500 bg-blue-50 text-blue-700 shadow-lg"
                                        : isRecommended
                                          ? "relative p-3 rounded-lg border-2 transition-all duration-200 border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100"
                                          : "relative p-3 rounded-lg border-2 transition-all duration-200 border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100"
                                  }
                                >
                                  {isRecommended &&
                                    isAvailable &&
                                    !isSelected && (
                                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"></span>
                                    )}
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-xs text-gray-500 text-center space-y-2">
                            <p>
                              Golden dots indicate recommended times for{" "}
                              {welcomeMessage.mealType}
                            </p>
                            <div className="flex justify-center items-center space-x-4">
                              <span className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                                <span>Available</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                                <span>Recommended</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                                <span>Unavailable</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Guest Count */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    Number of Guests
                  </h2>
                  <p className="text-sm text-blue-600 font-medium">
                    Suggested for {welcomeMessage.mealType}:{" "}
                    {getDefaultGuestCount()} guests
                  </p>
                </div>

                {/* Direct Input Option */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <Label
                    htmlFor="guestInput"
                    className="text-sm font-medium text-gray-700"
                  >
                    Enter guests:
                  </Label>
                  <Input
                    id="guestInput"
                    type="number"
                    min="1"
                    max="20"
                    value={guestCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setGuestCount(Math.max(1, Math.min(20, value)));
                    }}
                    className="w-20 text-center text-lg font-bold"
                  />
                  <span className="text-sm text-gray-500">guests</span>
                </div>

                {/* Slider Controls */}
                <div className="flex items-center justify-center space-x-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="w-12 h-12 rounded-full"
                  >
                    -
                  </Button>
                  <div className="text-4xl font-bold text-gray-900 w-16 text-center">
                    {guestCount}
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                    className="w-12 h-12 rounded-full"
                  >
                    +
                  </Button>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex justify-center space-x-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setGuestCount(count)}
                      className={
                        guestCount === count
                          ? "px-3 py-1 rounded-full text-sm transition-all duration-200 bg-blue-500 text-white"
                          : count === getDefaultGuestCount()
                            ? "px-3 py-1 rounded-full text-sm transition-all duration-200 bg-amber-100 text-amber-700 border border-amber-300"
                            : "px-3 py-1 rounded-full text-sm transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-center text-gray-600 text-sm">
                  Type directly, use +/- buttons, or quick select (1-20 guests)
                </p>
              </div>
            )}

            {/* Step 3: Seasonal Theme Selection (only if themes exist) */}
            {currentStep === 3 && seasonalThemes.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    Choose Your Dining Experience
                  </h2>
                  <p className="text-sm text-gray-600">
                    Enhance your visit with a seasonal theme that matches your
                    mood (optional)
                  </p>
                </div>

                <SeasonalThemeSelector
                  restaurantId={parseInt(restaurantId)}
                  tenantId={parseInt(tenantId)}
                  selectedTheme={selectedSeasonalTheme}
                  onThemeSelect={setSelectedSeasonalTheme}
                  variant="inline"
                />
              </div>
            )}

            {/* Customer Details Step (dynamic step number based on themes availability) */}
            {((currentStep === 3 && seasonalThemes.length === 0) ||
              (currentStep === 4 && seasonalThemes.length > 0)) && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                  Your Details
                </h2>

                {/* Show loading skeleton while restaurant data loads */}
                {restaurantLoading ? (
                  <BookingFormSkeleton />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="flex items-center mb-2">
                        <User className="w-4 h-4 mr-2" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={customerData.name}
                        onChange={(e) =>
                          setCustomerData({
                            ...customerData,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter your full name"
                        className="text-lg p-3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="flex items-center mb-2">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerData.email}
                        onChange={(e) =>
                          setCustomerData({
                            ...customerData,
                            email: e.target.value,
                          })
                        }
                        placeholder="Enter your email"
                        className="text-lg p-3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="flex items-center mb-2">
                        <Phone className="w-4 h-4 mr-2" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerData.phone}
                        onChange={(e) =>
                          setCustomerData({
                            ...customerData,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Enter your phone number"
                        className="text-lg p-3"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Step */}
            {currentStep === (seasonalThemes.length > 0 ? 5 : 4) && 
             hasPaymentStep && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    Complete Payment
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Secure your reservation with payment
                  </p>
                </div>

                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Restaurant:</span>
                      <span>{(restaurant as any)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Guests:</span>
                      <span>{guestCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span>{customerData.name}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Payment Amount:</span>
                      <span>{paymentInfo?.paymentSetup?.currency || 'EUR'} {paymentAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Form - Show directly without creating booking first */}
                {paymentError && (
                  <Alert className="bg-red-50 border-red-200 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      {paymentError}
                    </AlertDescription>
                  </Alert>
                )}

                {!clientSecret ? (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Setting up payment...</p>
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentForm
                      bookingData={null} // No booking created yet - payment first
                      paymentAmount={paymentAmount}
                      currency={currency}
                      paymentSetup={paymentInfo?.paymentSetup}
                      onPaymentSuccess={() => {
                        // Clear any previous payment errors
                        setPaymentError(null);
                        
                        // Payment successful - show confirmation immediately
                        console.log('Payment successful, showing confirmation');
                        setBookingCreated(true);
                        setCurrentStep(steps.length); // Go to success screen
                        
                        // Also create the booking record in background
                        const bookingData = {
                          bookingDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
                          startTime: selectedTime,
                          guestCount: guestCount,
                          customerName: customerData.name,
                          customerEmail: customerData.email,
                          customerPhone: customerData.phone,
                          specialRequests: customerData.comment || null,
                          seasonalThemeId: selectedSeasonalTheme ? parseInt(selectedSeasonalTheme) : null,
                          source: "guest_booking",
                          requiresPayment: true,
                          paymentAmount: paymentAmount,
                          paymentDeadlineHours: 24,
                        };
                        createBookingMutation.mutate(bookingData);
                        
                        toast({
                          title: "Payment Successful!",
                          description: "Your booking has been confirmed.",
                        });
                      }}
                      onPaymentError={(error: string) => {
                        setPaymentError(error);
                        console.log('Payment failed:', error);
                        toast({
                          title: "Payment Failed",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                    />
                  </Elements>
                )}

                {/* Retry payment button if there was an error */}
                {paymentError && clientSecret && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Having trouble? You can try again or contact the restaurant directly.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setPaymentError(null);
                        // Force re-render of payment form
                        setClientSecret(null);
                        setTimeout(() => {
                          createPaymentIntentForGuest();
                        }, 100);
                      }}
                      className="mr-2"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Show payment required message if payment setup exists but Stripe Connect is not ready */}
            {currentStep === (seasonalThemes.length > 0 ? 5 : 4) && 
             paymentInfo?.requiresPayment && 
             paymentInfo?.paymentSetup?.isActive &&
             !paymentInfo?.stripeConnectReady && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {paymentInfo?.paymentSetup?.type === 'deposit' && 'Deposit Required'}
                    {paymentInfo?.paymentSetup?.type === 'prepayment' && 'Prepayment Required'}
                    {paymentInfo?.paymentSetup?.type === 'reserve' && 'Reservation Fee Required'}
                    {paymentInfo?.paymentSetup?.type === 'no_show_fee' && 'No-Show Fee Required'}
                    {!paymentInfo?.paymentSetup?.type && 'Payment Required'}
                  </h2>
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-800">
                      This restaurant requires payment to complete your reservation. 
                      However, their payment system is not yet configured. 
                      Please contact the restaurant directly to complete your booking.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button
                onClick={() => {
                  // Don't use handleNext for payment step - PaymentForm handles payment submission
                  const isPaymentStep = (currentStep === (seasonalThemes.length > 0 ? 5 : 4)) && 
                                       paymentInfo?.requiresPayment && 
                                       paymentInfo?.stripeConnectReady;
                  if (!isPaymentStep) {
                    handleNext();
                  }
                }}
                disabled={!isStepValid() || createBookingMutation.isPending}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                style={{
                  display: (currentStep === (seasonalThemes.length > 0 ? 5 : 4) && 
                           hasPaymentStep && 
                           paymentInfo?.stripeConnectReady) ? 'none' : 'flex'
                }}
              >
                {createBookingMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Creating...</span>
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <span>
                      {(paymentInfo?.requiresPayment && paymentInfo?.stripeConnectReady) ? "Complete Payment" : "Complete Booking"}
                    </span>
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Restaurant Info Footer */}
      <div className="text-center py-6 px-4 border-t border-white/10">
        <p className="text-white/80 text-sm">
          {(restaurant as any)?.address && (
            <>📍 {(restaurant as any).address}</>
          )}
          {(restaurant as any)?.phone && <> • 📞 {(restaurant as any).phone}</>}
        </p>
      </div>
    </div>
  );
}
