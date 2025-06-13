import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { format } from "date-fns";

// Generate time slots from 6:00 PM to 9:00 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 18; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 21 && minute > 0) break; // Stop at 9:00 PM
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function GuestBookingElegant(props: any) {
  // Extract parameters from the URL
  const tenantId = props.params?.tenantId;
  const restaurantId = props.params?.restaurantId;
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: "",
    birthday: false,
    marketing: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

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

  // Fetch available time slots for selected date
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/available-slots`, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const response = await fetch(`/api/restaurants/${restaurantId}/available-slots?date=${selectedDate.toISOString()}&guests=${guestCount}`);
      if (!response.ok) throw new Error("Failed to fetch available slots");
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!restaurantId && !!selectedDate
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !customerData.name || !customerData.email) {
        throw new Error("Please fill in all required fields");
      }

      const bookingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      const response = await fetch(`/api/restaurants/${restaurantId}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          guestCount,
          bookingDate: bookingDateTime.toISOString(),
          comment: customerData.comment,
          source: 'google',
          status: 'confirmed',
          tenantId: parseInt(tenantId as string)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setBookingId(data.id);
      setBookingComplete(true);
      toast({
        title: "Booking Confirmed!",
        description: "Your reservation has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await bookingMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto flex">
          {/* Left side - Restaurant image */}
          <div className="w-1/2 relative">
            <img 
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
              alt="Restaurant Interior"
              className="w-full h-screen object-cover"
            />
          </div>

          {/* Right side - Confirmation */}
          <div className="w-1/2 p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Booking Confirmed!</h1>
              <p className="text-gray-600 mb-6">
                Your reservation at {restaurant?.name} has been successfully created.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p><strong>Booking ID:</strong> #{bookingId}</p>
                <p><strong>Date:</strong> {selectedDate && format(selectedDate, 'MMMM d, yyyy')}</p>
                <p><strong>Time:</strong> {selectedTime}</p>
                <p><strong>Guests:</strong> {guestCount}</p>
                <p><strong>Name:</strong> {customerData.name}</p>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                A confirmation email has been sent to {customerData.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto flex">
        {/* Left side - Restaurant image */}
        <div className="w-1/2 relative">
          <img 
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
            alt="Restaurant Interior"
            className="w-full h-screen object-cover"
          />
          <div className="absolute bottom-8 left-8 text-white">
            <h2 className="text-2xl font-bold">{restaurant?.name || "Restaurant"}</h2>
            <p className="text-white/80">{restaurant?.address}</p>
          </div>
        </div>

        {/* Right side - Booking form */}
        <div className="w-1/2 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{restaurant?.name}</h1>
            
            {/* Step indicators */}
            <div className="flex justify-center space-x-8 mb-8">
              <div className={`flex flex-col items-center ${currentStep >= 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 0 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="text-xs mt-1">Information</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="text-xs mt-1">Guests</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="text-xs mt-1">Date</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>
                  4
                </div>
                <span className="text-xs mt-1">Time</span>
              </div>
              <div className={`flex flex-col items-center ${currentStep >= 4 ? 'text-gray-800' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 4 ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>
                  5
                </div>
                <span className="text-xs mt-1">Confirm</span>
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {/* Step 0: Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Mobile</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Guest count */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">How many guests?</h3>
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => setGuestCount(count)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        guestCount === count
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  More than 10 guests? <span className="text-blue-600 cursor-pointer">+38349654504</span>
                </p>
              </div>
            )}

            {/* Step 2: Date selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Select Date</h3>
                <div className="flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate(date || null)}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || date.getDay() === 0;
                    }}
                    className="rounded-md border"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Time selection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">
                  {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                {slotsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map((time) => {
                      const isAvailable = !availableSlots || availableSlots.includes(time);
                      return (
                        <button
                          key={time}
                          onClick={() => isAvailable && setSelectedTime(time)}
                          disabled={!isAvailable}
                          className={`p-3 rounded-lg border text-sm transition-colors ${
                            selectedTime === time
                              ? 'border-gray-800 bg-gray-800 text-white'
                              : isAvailable
                              ? 'border-gray-200 hover:border-gray-300 bg-green-50'
                              : 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {time}
                          {isAvailable && <div className="text-xs text-green-600 mt-1">PM</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Confirm booking</h3>
                
                {/* Booking summary */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Place</span>
                    <span>{restaurant?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Address</span>
                    <span>{restaurant?.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Number of guests</span>
                    <span>{guestCount} persons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date and time</span>
                    <span>{selectedDate && format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Type</span>
                    <span>Normal booking</span>
                  </div>
                </div>

                {/* Additional options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="birthday"
                      checked={customerData.birthday}
                      onCheckedChange={(checked) => setCustomerData({...customerData, birthday: !!checked})}
                    />
                    <Label htmlFor="birthday" className="text-sm">Birthday</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea
                      id="comment"
                      value={customerData.comment}
                      onChange={(e) => setCustomerData({...customerData, comment: e.target.value})}
                      placeholder="Any special requests or comments..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="marketing"
                      checked={customerData.marketing}
                      onCheckedChange={(checked) => setCustomerData({...customerData, marketing: !!checked})}
                    />
                    <Label htmlFor="marketing" className="text-xs text-gray-600 leading-relaxed">
                      Receive emails with offers and news from {restaurant?.name}. <span className="text-blue-600">Read more</span>
                    </Label>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Processing of personal data</strong></p>
                  <p>
                    By accepting this booking form, you hereby give your consent for processing of personal data in order to improve the 
                    services and solutions. You can at any time withdraw your consent or have your personal data deleted by contacting 
                    the restaurant. You can find more information about how we treat your personal data in our{" "}
                    <span className="text-blue-600">Terms</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-8 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 0 && (!customerData.name || !customerData.email)) ||
                  (currentStep === 2 && !selectedDate) ||
                  (currentStep === 3 && !selectedTime)
                }
                className="flex items-center bg-gray-800 hover:bg-gray-900"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || bookingMutation.isPending}
                className="bg-gray-800 hover:bg-gray-900"
              >
                {isSubmitting || bookingMutation.isPending ? "Booking..." : "Book now"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}