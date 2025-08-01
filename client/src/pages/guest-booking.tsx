import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, isSameDay, isAfter, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  Info,
  CheckCircle,
  Phone,
  Mail,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import InteractiveBookingCalendar from "@/components/interactive-booking-calendar";
import InternationalPhoneInput from "@/components/international-phone-input";

interface BookingStep {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
}

const steps: BookingStep[] = [
  { id: 'info', title: 'Information', icon: Info },
  { id: 'guests', title: 'Guests', icon: Users },
  { id: 'date', title: 'Date', icon: Calendar },
  { id: 'time', title: 'Time', icon: Clock },
  { id: 'confirm', title: 'Confirm', icon: CheckCircle },
];

export default function GuestBooking() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const restaurantId = params?.restaurantId;
  const tenantId = params?.tenantId;
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: ""
  });

  // Extract settings with defaults
  const bookingSettings = restaurantSettings?.bookingSettings || {};
  const generalSettings = restaurantSettings?.generalSettings || {};
  const emailSettings = restaurantSettings?.emailSettings || {};
  
  // Booking rules based on settings
  const minGuests = bookingSettings.onlineBooking?.minGuests || 1;
  const maxGuests = bookingSettings.onlineBooking?.maxGuests || 10;
  
  // Initialize guest count with a valid value within the min/max range
  const [guestCount, setGuestCount] = useState(() => {
    return Math.max(minGuests, Math.min(2, maxGuests));
  });

  // Update guest count when settings change and current value is out of range
  useEffect(() => {
    if (guestCount < minGuests || guestCount > maxGuests) {
      setGuestCount(Math.max(minGuests, Math.min(guestCount, maxGuests)));
    }
  }, [minGuests, maxGuests, guestCount]);
  const defaultDuration = bookingSettings.defaultDuration || bookingConfig?.defaultBookingDuration || 120;
  const maxAdvanceDays = bookingSettings.maxAdvanceBookingDays || 30;
  const minNoticeHours = bookingSettings.minBookingNotice || 2;
  const contactMethod = bookingSettings.contactMethod || 'both';
  const allowSameDayBookings = bookingSettings.allowSameDayBookings !== false;
  const requireDeposit = bookingSettings.requireDeposit || false;
  const depositAmount = bookingSettings.depositAmount || 0;
  
  // Date/time formatting based on settings
  const dateFormat = generalSettings.dateFormat || 'MM/dd/yyyy';
  const timeFormat = generalSettings.timeFormat || '12h';
  const timeZone = generalSettings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/public`],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/public`);
      if (!response.ok) throw new Error("Restaurant not found");
      return response.json();
    },
    enabled: !!restaurantId
  });

  // Fetch complete restaurant settings including booking configuration
  const { data: restaurantSettings } = useQuery({
    queryKey: [`/api/public/tenants/${tenantId}/restaurants/${restaurantId}/settings`],
    queryFn: async () => {
      const response = await fetch(`/api/public/tenants/${tenantId}/restaurants/${restaurantId}/settings`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!restaurantId && !!tenantId
  });

  // Fetch booking configuration (legacy endpoint, will be replaced by settings)
  const { data: bookingConfig } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/booking-config`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/booking-config`);
      if (!response.ok) return { defaultBookingDuration: 120 };
      return response.json();
    },
    enabled: !!restaurantId && !!tenantId
  });

  // Fetch opening hours
  const { data: openingHours } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/opening-hours/public`],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/opening-hours/public`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!restaurantId
  });

  // Fetch available time slots for selected date
  const { data: timeSlots } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/available-times`, selectedDate, guestCount],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/restaurants/${restaurantId}/available-times?date=${dateStr}&guests=${guestCount}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!restaurantId && !!selectedDate
  });

    // Fetch special periods
    const { data: specialPeriods } = useQuery({
      queryKey: [`/api/restaurants/${restaurantId}/special-periods/public`],
      queryFn: async () => {
        const response = await fetch(`/api/restaurants/${restaurantId}/special-periods/public`);
        if (!response.ok) return [];
        return response.json();
      },
      enabled: !!restaurantId
    });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/guest`, bookingData);
    },
    onSuccess: (data) => {
      toast({
        title: "Booking Confirmed!",
        description: "Your reservation has been successfully created. You'll receive a confirmation email shortly.",
      });
      // Reset form or redirect
      setCurrentStep(0);
      setGuestCount(2);
      setSelectedDate(null);
      setSelectedTime("");
      setCustomerData({ name: "", email: "", phone: "", comment: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to create your booking. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate calendar dates (next 30 days)
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Generate dates for current month and next month
    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
      const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);

        // Skip dates in the past
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (date < todayStart) {
          continue;
        }

        // Check if restaurant is open on this day based on opening hours
        const dayOfWeek = date.getDay();
        const dayHours = openingHours?.find((oh: any) => oh.dayOfWeek === dayOfWeek);

        let isOpen = dayHours?.isOpen || false;
        let actualOpenTime = dayHours?.openTime;
        let actualCloseTime = dayHours?.closeTime;

        // Check for special periods that might override normal hours
        const dateStr = date.toISOString().split('T')[0];
        const specialPeriod = specialPeriods?.find((sp: any) => 
          dateStr >= sp.startDate && dateStr <= sp.endDate
        );

        if (specialPeriod) {
          if (specialPeriod.isClosed) {
            isOpen = false;
          } else if (specialPeriod.openTime && specialPeriod.closeTime) {
            isOpen = true;
            actualOpenTime = specialPeriod.openTime;
            actualCloseTime = specialPeriod.closeTime;
          }
        }

        let status = 'closed';

        if (isOpen) {
          // Basic availability - could be improved by checking actual table availability
          // For now, mark as available if restaurant is open
          status = 'available';
        }

        dates.push({
          date: date,
          day: day,
          month: month,
          year: year,
          status: status,
          isCurrentMonth: month === (currentMonth + monthOffset)
        });
      }
    }

    return dates;
  };

  const calendarDates = generateCalendarDates();



  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Calculate end time based on start time and duration from settings
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  };

  const handleBookingSubmit = () => {
    // Validate required fields based on contact method setting
    const requiredFieldsValid = customerData.name && 
      ((contactMethod === 'phone' && customerData.phone) ||
       (contactMethod === 'email' && customerData.email) ||
       (contactMethod === 'both' && customerData.email && customerData.phone) ||
       (contactMethod === 'either' && (customerData.email || customerData.phone)));

    if (!selectedDate || !selectedTime || !requiredFieldsValid) {
      let missingFields = [];
      if (!customerData.name) missingFields.push("Name");
      if (contactMethod === 'phone' && !customerData.phone) missingFields.push("Phone");
      if (contactMethod === 'email' && !customerData.email) missingFields.push("Email");
      if (contactMethod === 'both' && (!customerData.email || !customerData.phone)) {
        if (!customerData.email) missingFields.push("Email");
        if (!customerData.phone) missingFields.push("Phone");
      }
      if (contactMethod === 'either' && !customerData.email && !customerData.phone) {
        missingFields.push("Email or Phone");
      }

      toast({
        title: "Missing Information",
        description: `Please provide: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate booking time against minimum notice requirement
    const bookingDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`);
    const now = new Date();
    const hoursDifference = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < minNoticeHours) {
      toast({
        title: "Booking Too Soon",
        description: `Bookings require at least ${minNoticeHours} hours advance notice.`,
        variant: "destructive",
      });
      return;
    }

    const endTime = calculateEndTime(selectedTime, defaultDuration);

    const bookingData = {
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      guestCount,
      bookingDate: selectedDate.toISOString(),
      startTime: selectedTime,
      endTime: endTime,
      notes: customerData.comment,
      source: "online",
      requiresPayment: requireDeposit,
      paymentAmount: requireDeposit ? depositAmount : null,
      paymentDeadlineHours: 24
    };

    createBookingMutation.mutate(bookingData);
  };

  // Early return for missing parameters
  if (!restaurantId || !tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking URL</h1>
          <p className="text-gray-600">Please check the booking URL and try again.</p>
        </div>
      </div>
    );
  }

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Check if guest booking is disabled
  if (restaurant && !restaurant.guestBookingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Online Booking Unavailable</h1>
          <p className="text-gray-600 mb-6">
            Online bookings are currently disabled for {restaurant.name}. Please contact the restaurant directly to make a reservation.
          </p>
          {restaurant.phone && (
            <div className="bg-white p-4 rounded-lg border mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" />
                <span className="font-medium">{restaurant.phone}</span>
              </div>
            </div>
          )}
          {restaurant.address && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{restaurant.address}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Information
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
              {restaurant.address && (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant.description && (
                <p className="text-gray-600 mt-4">{restaurant.description}</p>
              )}
            </div>
          </div>
        );

      case 1: // Guests
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">How many guests?</h2>
              <p className="text-gray-600 text-sm">
                Bookings available for {minGuests} to {maxGuests} guests
              </p>
            </div>
            {/* Generate guest count buttons dynamically based on min/max settings */}
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
              {Array.from({ length: Math.min(5, maxGuests - minGuests + 1) }, (_, i) => minGuests + i)
                .filter(count => count <= maxGuests)
                .map((count) => (
                  <Button
                    key={count}
                    variant={guestCount === count ? "default" : "outline"}
                    className="h-16 text-lg"
                    onClick={() => setGuestCount(count)}
                  >
                    {count}
                  </Button>
                ))}
            </div>
            {maxGuests > minGuests + 4 && (
              <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                {Array.from({ length: Math.min(5, maxGuests - (minGuests + 4)) }, (_, i) => minGuests + 5 + i)
                  .filter(count => count <= maxGuests)
                  .map((count) => (
                    <Button
                      key={count}
                      variant={guestCount === count ? "default" : "outline"}
                      className="h-16 text-lg"
                      onClick={() => setGuestCount(count)}
                    >
                      {count}
                    </Button>
                  ))}
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                More than 10 people? Call {restaurant.phone || "+38349854504"}
              </p>
            </div>
          </div>
        );

      case 2: // Date & Time
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Select Date & Time</h2>
              <p className="text-gray-600">
                Choose your preferred date and time for {guestCount} guest{guestCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <InteractiveBookingCalendar
                restaurantId={parseInt(restaurantId!)}
                guestCount={guestCount}
                isPublic={true}
                onTimeSlotSelect={(date: Date, time: string) => {
                  setSelectedDate(date);
                  setSelectedTime(time);
                  setCurrentStep(3); // Skip to confirmation step
                }}
              />
            </div>
          </div>
        );

      case 3: // Confirmation
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
              </h2>
              <p className="text-gray-600 mb-8">Select your preferred time</p>
            </div>

            {timeSlots && timeSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No available time slots for this date.</p>
                <p className="text-sm text-gray-500">
                  Please select a different date or contact the restaurant directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                {(timeSlots as string[] || []).map((time: string) => {
                  const isSelected = selectedTime === time;
                  return (
                    <Button
                      key={time}
                      variant={isSelected ? "default" : "outline"}
                      className={`h-16 ${
                        isSelected ? 'bg-green-500 hover:bg-green-600' : ''
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{time}</div>
                        <div className="text-xs opacity-75">
                          {parseInt(time.split(':')[0]) < 12 ? 'AM' : 'PM'}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}

            {timeSlots && timeSlots.length > 0 && (
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  Time slots are based on restaurant availability and booking policies
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Confirm
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Confirm booking</h2>
            </div>

            {/* Booking Summary */}
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Restaurant:</span>
                  <span className="font-medium">{restaurant.name}</span>
                </div>
                {restaurant.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-sm">{restaurant.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium">{guestCount} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                {selectedTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {Math.floor(defaultDuration / 60)}h {defaultDuration % 60}m
                      {selectedTime && (
                        <span className="text-gray-500 text-sm ml-1">
                          (until {calculateEndTime(selectedTime, defaultDuration)})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {requireDeposit && depositAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Required:</span>
                    <span className="font-medium text-red-600">
                      {generalSettings.currency || 'EUR'} {depositAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Normal booking
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information Form */}
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </div>

              {(contactMethod === 'phone' || contactMethod === 'both' || contactMethod === 'either') && (
                <div>
                  <Label htmlFor="phone">
                    Phone {contactMethod === 'phone' || contactMethod === 'both' ? '*' : ''}
                  </Label>
                  <InternationalPhoneInput
                    value={customerData.phone}
                    onChange={(phone) => setCustomerData(prev => ({ ...prev, phone }))}
                    placeholder="Phone number"
                  />
                </div>
              )}

              {(contactMethod === 'email' || contactMethod === 'both' || contactMethod === 'either') && (
                <div>
                  <Label htmlFor="email">
                    Email {contactMethod === 'email' || contactMethod === 'both' ? '*' : ''}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                    required={contactMethod === 'email' || contactMethod === 'both'}
                  />
                </div>
              )}

              {contactMethod === 'either' && (
                <p className="text-sm text-gray-600">
                  Please provide either email or phone number for booking confirmation.
                </p>
              )}

              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={customerData.comment}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Any special requests or comments..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{restaurant.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">🇬🇧</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isActive ? 'bg-blue-500 text-white' : 
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs text-center ${
                    isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm min-h-[500px] flex">
          {/* Restaurant Image */}
          <div className="w-1/3 bg-gradient-to-br from-amber-100 to-orange-200 rounded-l-lg flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="w-16 h-16 bg-amber-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
              <p className="text-sm font-medium">{restaurant.name}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-8">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleBookingSubmit}
                  disabled={createBookingMutation.isPending}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {createBookingMutation.isPending ? "Creating..." : "Confirm Booking"}
                  <CheckCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !guestCount) ||
                    (currentStep === 2 && !selectedDate) ||
                    (currentStep === 3 && (!selectedTime || !timeSlots || timeSlots.length === 0))
                  }
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}