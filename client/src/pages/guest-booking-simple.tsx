import { useState } from "react";
import { useRoute } from "wouter";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Users, Calendar, Clock, CheckCircle, MapPin, Phone } from "lucide-react";
import { format } from "date-fns";

const timeSlots = [
  "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45", "16:00", "16:15",
  "16:30", "16:45", "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45", "19:00", "19:15",
  "19:30", "19:45", "20:00"
];

interface BookingStep {
  id: string;
  title: string;
  icon: any;
}

const steps: BookingStep[] = [
  { id: 'info', title: 'Information', icon: Users },
  { id: 'guests', title: 'Guests', icon: Users },
  { id: 'date', title: 'Date', icon: Calendar },
  { id: 'time', title: 'Time', icon: Clock },
  { id: 'confirm', title: 'Confirm', icon: CheckCircle },
];

export default function GuestBookingSimple() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const tenantId = params?.tenantId;
  const restaurantId = params?.restaurantId;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

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

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !customerData.name || !customerData.email) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          guestCount: guestCount,
          bookingDate: selectedDate.toISOString().split('T')[0],
          startTime: selectedTime,
          specialRequests: customerData.comment
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBookingId(result.id);
        setBookingComplete(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create booking'}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Your reservation has been successfully created. Booking ID: #{bookingId}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-medium">{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Guests:</span>
              <span className="font-medium">{guestCount}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            A confirmation email has been sent to {customerData.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TROFTA Restaurant</h1>
          <p className="text-gray-600">Reserve your table in a few simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    index <= currentStep
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${index <= currentStep ? 'text-amber-600' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 0: Restaurant Info */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span>Downtown Location • Fine Dining</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span>+1 (555) 123-4567</span>
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">Welcome to TROFTA</h3>
                <p className="text-gray-700 leading-relaxed">
                  Experience exceptional dining in our elegant atmosphere. Our reservation system 
                  makes it easy to secure your perfect table for any occasion.
                </p>
              </div>
              <Button onClick={nextStep} className="w-full bg-amber-600 hover:bg-amber-700">
                Start Reservation
              </Button>
            </div>
          )}

          {/* Step 1: Guest Count */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">How many guests?</h3>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
                  <button
                    key={count}
                    onClick={() => setGuestCount(count)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      guestCount === count
                        ? 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-semibold">{count}</div>
                    <div className="text-xs text-gray-500">
                      {count === 1 ? 'Guest' : 'Guests'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Select your date</h3>
              <div className="flex justify-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center gap-4">
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
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate(date || null)}
                    disabled={(date) => date < new Date()}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Time Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">
                Choose your time for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-lg border transition-all text-sm font-medium ${
                      selectedTime === time
                        ? 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Customer Details & Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center">Your details</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="comment">Special Requests</Label>
                  <Textarea
                    id="comment"
                    value={customerData.comment}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Any special requests or dietary requirements?"
                    rows={3}
                  />
                </div>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold">Reservation Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Restaurant:</span>
                    <span className="font-medium">TROFTA Restaurant</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span className="font-medium">{guestCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
              disabled={
                (currentStep === 1 && !guestCount) ||
                (currentStep === 2 && !selectedDate) ||
                (currentStep === 3 && !selectedTime)
              }
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !customerData.name ||
                !customerData.email ||
                !selectedDate ||
                !selectedTime
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Creating Booking...' : 'Confirm Reservation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}