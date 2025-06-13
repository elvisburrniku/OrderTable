import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Info, Users, Calendar, Clock, CheckCircle } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, isSameDay } from "date-fns";

interface BookingStep {
  id: string;
  title: string;
  icon: any;
}

const steps: BookingStep[] = [
  { id: 'info', title: 'Information', icon: Info },
  { id: 'guests', title: 'Guests', icon: Users },
  { id: 'date', title: 'Date', icon: Calendar },
  { id: 'time', title: 'Time', icon: Clock },
  { id: 'confirm', title: 'Confirm', icon: CheckCircle },
];

const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Generate time slots from 1:30 PM to 8:00 PM in 15-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  const startHour = 13; // 1 PM
  const startMinute = 30;
  const endHour = 20; // 8 PM
  
  for (let hour = startHour; hour <= endHour; hour++) {
    const startMin = hour === startHour ? startMinute : 0;
    const endMin = hour === endHour ? 0 : 45;
    
    for (let minute = startMin; minute <= endMin; minute += 15) {
      if (hour === endHour && minute > 0) break;
      
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      
      slots.push({ value: time24, display: displayTime });
    }
  }
  
  return slots;
};

const timeSlots = generateTimeSlots();

export default function GuestBookingNew() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const restaurantId = params?.restaurantId;
  const tenantId = params?.tenantId;
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

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (!response.ok) throw new Error('Failed to create booking');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "Your reservation has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime || !customerData.name || !customerData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const bookingData = {
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      guestCount,
      bookingDate: selectedDate,
      startTime: selectedTime,
      specialRequests: customerData.comment,
      source: "guest_booking"
    };

    createBookingMutation.mutate(bookingData);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Information step (always can proceed)
      case 1: return guestCount > 0; // Guests step
      case 2: return selectedDate !== null; // Date step
      case 3: return selectedTime !== ""; // Time step
      case 4: return customerData.name && customerData.email; // Confirm step
      default: return false;
    }
  };

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
          <p className="text-gray-600">The restaurant you're looking for doesn't exist or isn't accepting bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <div className="flex items-center gap-2">
              <img src="/api/placeholder/24/24" alt="UK Flag" className="w-6 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive 
                      ? 'border-emerald-600 bg-emerald-600 text-white' 
                      : isCompleted 
                        ? 'border-emerald-600 bg-emerald-100 text-emerald-600'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 ${
                    isActive ? 'text-emerald-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Restaurant Image */}
          <div className="relative">
            <img 
              src="/api/placeholder/400/300"
              alt="Restaurant Interior"
              className="w-full h-64 lg:h-80 object-cover rounded-lg shadow-lg"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'a\' x1=\'0\' y1=\'0\' x2=\'1\' y2=\'1\'%3E%3Cstop offset=\'0\' stop-color=\'%23d4a574\'/%3E%3Cstop offset=\'1\' stop-color=\'%238b4513\'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=\'400\' height=\'300\' fill=\'url(%23a)\'/%3E%3Cg opacity=\'0.3\'%3E%3Ccircle cx=\'100\' cy=\'100\' r=\'30\' fill=\'%23fff\'/%3E%3Ccircle cx=\'300\' cy=\'150\' r=\'25\' fill=\'%23fff\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'35\' fill=\'%23fff\'/%3E%3C/g%3E%3C/svg%3E")',
                backgroundSize: 'cover'
              }}
            />
          </div>

          {/* Right side - Booking Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Step 0: Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Restaurant Information</h2>
                <div className="space-y-4 text-gray-600">
                  <p><strong>Address:</strong> {restaurant.address}</p>
                  <p><strong>Cuisine:</strong> {restaurant.cuisine}</p>
                  <p><strong>Price Range:</strong> {restaurant.priceRange}</p>
                  {restaurant.phone && <p><strong>Phone:</strong> {restaurant.phone}</p>}
                </div>
                <p className="text-sm text-gray-500">
                  Welcome to our booking system. Let's get started with your reservation.
                </p>
              </div>
            )}

            {/* Step 1: Guest Count */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">How many guests?</h2>
                <div className="grid grid-cols-5 gap-3">
                  {guestOptions.map((count) => (
                    <button
                      key={count}
                      onClick={() => setGuestCount(count)}
                      className={`h-12 rounded-lg border-2 font-medium transition-colors ${
                        guestCount === count
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  More than 10 pers, call <span className="text-emerald-600">+383908854504</span>
                </p>
              </div>
            )}

            {/* Step 2: Date Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Select Date</h2>
                <div className="flex items-center justify-between mb-4">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-medium">
                    {format(selectedDate || new Date(), 'MMMM yyyy')}
                  </h3>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || null)}
                  disabled={(date) => date < new Date()}
                  className="w-full"
                />
              </div>
            )}

            {/* Step 3: Time Selection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
                </h2>
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setSelectedTime(slot.value)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        selectedTime === slot.value
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{slot.display.split(' ')[0]}</div>
                      <div className="text-xs opacity-75">{slot.display.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Confirm booking</h2>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Place</span>
                    <div className="font-medium">{restaurant.name}</div>
                    <div className="text-gray-600">{restaurant.address}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Type</span>
                    <div className="font-medium">Normal booking</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Number of guests</span>
                    <div className="font-medium">{guestCount} persons</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Date and time</span>
                    <div className="font-medium">
                      {selectedDate && format(selectedDate, 'dd MMMM yyyy')} at {
                        timeSlots.find(slot => slot.value === selectedTime)?.display
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Mobile</Label>
                    <div className="flex">
                      <select className="px-3 py-2 border border-r-0 rounded-l-md bg-gray-50">
                        <option>🇬🇧 +44</option>
                      </select>
                      <Input
                        id="phone"
                        value={customerData.phone}
                        onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                        placeholder="Your phone number"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="comment">Comment</Label>
                    <textarea
                      id="comment"
                      value={customerData.comment}
                      onChange={(e) => setCustomerData({ ...customerData, comment: e.target.value })}
                      placeholder="Special requests or comments"
                      className="w-full p-2 border rounded-md resize-none h-20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || createBookingMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createBookingMutation.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}