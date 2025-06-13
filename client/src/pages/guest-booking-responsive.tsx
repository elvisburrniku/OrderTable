import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, Phone, Mail, User, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 18; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function GuestBookingResponsive(props: any) {
  const tenantId = props.params?.tenantId;
  const restaurantId = props.params?.restaurantId;
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Fetch restaurant data
  const { data: restaurant } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/public`],
    enabled: !!restaurantId,
  });

  // Fetch available slots
  const { data: availableSlots } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/available-slots`, selectedDate],
    enabled: !!restaurantId && !!selectedDate,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(`/api/restaurants/${restaurantId}/bookings/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) throw new Error('Booking failed');
      return response.json();
    },
    onSuccess: (data) => {
      setBookingId(data.bookingId || data.id);
      setCurrentStep(4);
      toast({
        title: "Booking Confirmed!",
        description: "Your reservation has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "There was an error creating your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const steps = [
    { title: "Date", icon: Calendar },
    { title: "Time", icon: Clock },
    { title: "Guests", icon: Users },
    { title: "Details", icon: User },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit booking
      const bookingData = {
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        time: selectedTime,
        guests: guestCount,
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        source: 'guest_booking'
      };
      createBookingMutation.mutate(bookingData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return selectedDate !== null;
      case 1: return selectedTime !== '';
      case 2: return guestCount >= 1;
      case 3: return customerData.name && customerData.email && customerData.phone;
      default: return false;
    }
  };

  // Generate next 30 days for date selection
  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  };

  const availableDates = generateDates();

  if (bookingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your reservation at {(restaurant as any)?.name} has been successfully created.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left space-y-2">
              <p><strong>Booking ID:</strong> #{bookingId}</p>
              <p><strong>Date:</strong> {selectedDate && format(selectedDate, 'MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              <p><strong>Guests:</strong> {guestCount}</p>
              <p><strong>Name:</strong> {customerData.name}</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              A confirmation email has been sent to {customerData.email}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="text-center py-6 md:py-8 px-4">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 md:mb-4">
          Reserve Your Table
        </h1>
        <p className="text-sm md:text-lg lg:text-xl text-blue-100">
          at <span className="text-blue-300 font-semibold">{(restaurant as any)?.name || "Our Restaurant"}</span>
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-4 mb-6 md:mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2
                    ${isActive ? 'bg-blue-500 text-white' : 
                      isCompleted ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}
                  `}>
                    {isCompleted ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <Icon className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  <span className={`text-xs md:text-sm font-medium ${isActive || isCompleted ? 'text-white' : 'text-white/60'}`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`hidden md:block absolute h-0.5 w-16 lg:w-24 mt-6 ml-16 lg:ml-24 ${isCompleted ? 'bg-green-500' : 'bg-white/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6">
        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Date Selection */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">Select Date</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableDates.slice(0, 12).map((date, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200 text-center
                        ${selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}
                      `}
                    >
                      <div className="text-sm font-medium">{format(date, 'EEE')}</div>
                      <div className="text-lg font-bold">{format(date, 'd')}</div>
                      <div className="text-xs text-gray-500">{format(date, 'MMM')}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Time Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">Select Time</h2>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      disabled={(availableSlots as any) && !(availableSlots as any).slots?.includes(time)}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        ${selectedTime === time
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : (availableSlots as any) && !(availableSlots as any).slots?.includes(time)
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}
                      `}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Guest Count */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">Number of Guests</h2>
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
                    onClick={() => setGuestCount(Math.min(10, guestCount + 1))}
                    className="w-12 h-12 rounded-full"
                  >
                    +
                  </Button>
                </div>
                <p className="text-center text-gray-600">Select number of guests (1-10)</p>
              </div>
            )}

            {/* Step 3: Customer Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">Your Details</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="flex items-center mb-2">
                      <User className="w-4 h-4 mr-2" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
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
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
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
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                      placeholder="Enter your phone number"
                      className="text-lg p-3"
                    />
                  </div>
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
                onClick={handleNext}
                disabled={!isStepValid() || createBookingMutation.isPending}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                {createBookingMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Creating...</span>
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <span>Complete Booking</span>
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
          {(restaurant as any)?.phone && (
            <> • 📞 {(restaurant as any).phone}</>
          )}
        </p>
      </div>
    </div>
  );
}