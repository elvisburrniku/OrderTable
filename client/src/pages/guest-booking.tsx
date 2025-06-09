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
  const [match, params] = useRoute("/guest-booking/:restaurantId");
  const restaurantId = params?.restaurantId;
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: ""
  });

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

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest("POST", `/api/restaurants/${restaurantId}/bookings/public`, bookingData);
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
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots (30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

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

  const handleBookingSubmit = () => {
    if (!selectedDate || !selectedTime || !customerData.name || !customerData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const bookingData = {
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      guestCount,
      bookingDate: selectedDate.toISOString(),
      startTime: selectedTime,
      notes: customerData.comment,
      source: "online"
    };

    createBookingMutation.mutate(bookingData);
  };

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
            </div>
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
              {[1, 2, 3, 4, 5].map((count) => (
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
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
              {[6, 7, 8, 9, 10].map((count) => (
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
            <div className="text-center">
              <p className="text-sm text-gray-600">
                More than 10 people? Call {restaurant.phone || "+38349854504"}
              </p>
            </div>
          </div>
        );

      case 2: // Date
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Select Date</h2>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDates().map((date) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <Button
                      key={date.toISOString()}
                      variant={isSelected ? "default" : "outline"}
                      className={`h-12 ${isToday ? 'ring-2 ring-blue-200' : ''} ${
                        isSelected ? 'bg-green-500 hover:bg-green-600' : ''
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {format(date, 'd')}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3: // Time
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
              </h2>
              <p className="text-gray-600 mb-8">Select your preferred time</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {generateTimeSlots().map((time) => {
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
              
              <div>
                <Label htmlFor="phone">Mobile</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50">
                    <span className="text-sm">🇬🇧 +44</span>
                  </div>
                  <Input
                    id="phone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

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
                    (currentStep === 3 && !selectedTime)
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