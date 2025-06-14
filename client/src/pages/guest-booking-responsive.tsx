import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, Phone, Mail, User, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format, addDays, startOfDay, startOfMonth, endOfMonth, addMonths, subMonths, getDay, eachDayOfInterval } from 'date-fns';
import ActiveSeasonalThemeDisplay from '@/components/active-seasonal-theme-display';
import SeasonalThemeSelector from '@/components/seasonal-theme-selector';

// Dynamic time slot generation will be done based on opening hours

export default function GuestBookingResponsive(props: any) {
  const tenantId = props.params?.tenantId;
  const restaurantId = props.params?.restaurantId;
  const { toast } = useToast();

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
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    comment: ''
  });
  const [selectedSeasonalTheme, setSelectedSeasonalTheme] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Fetch restaurant data
  const { data: restaurant } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/public`],
    enabled: !!restaurantId,
  });

  // Fetch opening hours
  const { data: openingHours } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`],
    enabled: !!(tenantId && restaurantId),
  });

  // Fetch cut-off times
  const { data: cutOffTimes } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/cut-off-times`],
    enabled: !!(tenantId && restaurantId),
  });

  // Fetch special periods
  const { data: specialPeriods } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/special-periods`],
    enabled: !!(tenantId && restaurantId),
  });

  // Fetch available slots
  const { data: availableSlots } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/available-slots`, selectedDate],
    enabled: !!restaurantId && !!selectedDate,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/guest`, {
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
    { title: "Experience", icon: Sparkles },
    { title: "Details", icon: User },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit booking
      const bookingData = {
        bookingDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        startTime: selectedTime,
        guestCount: guestCount,
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        specialRequests: customerData.comment || null,
        seasonalThemeId: selectedSeasonalTheme ? parseInt(selectedSeasonalTheme) : null,
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
      case 3: return true; // Seasonal theme is optional
      case 4: return customerData.name && customerData.email && customerData.phone;
      default: return false;
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
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate time slots based on restaurant opening hours for selected date
  const generateTimeSlotsForDate = (date: Date) => {
    if (!date || !openingHours || !Array.isArray(openingHours)) return [];
    
    const dayOfWeek = date.getDay();
    const dayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek);
    
    if (!dayHours || !dayHours.isOpen) return [];
    
    const slots = [];
    const [openHour, openMin] = dayHours.openTime.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.closeTime.split(':').map(Number);
    
    // Start from opening time
    let currentHour = openHour;
    let currentMin = openMin;
    
    // Generate 15-minute intervals until closing time
    while (true) {
      const slotTime = currentHour * 60 + currentMin;
      const closeTime = closeHour * 60 + closeMin;
      
      // Stop if we've reached or passed closing time
      if (slotTime >= closeTime) break;
      
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
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

  // Get time slots for the selected date
  const timeSlots = selectedDate ? generateTimeSlotsForDate(selectedDate) : [];

  // Check if a date is available based on opening hours and special periods
  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if date is in the past
    const today = startOfDay(new Date());
    if (date < today) return false;
    
    // Check special periods first (restaurant-specific closures)
    if (specialPeriods && Array.isArray(specialPeriods)) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasSpecialPeriod = specialPeriods.some((period: any) => {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const checkDate = new Date(dateStr);
        return checkDate >= start && checkDate <= end && !period.isOpen;
      });
      if (hasSpecialPeriod) return false;
    }

    // Check regular opening hours
    if (openingHours && Array.isArray(openingHours)) {
      const dayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek);
      if (!dayHours || !dayHours.isOpen) return false;
    }

    // Check cut-off times (advance booking requirements)
    if (cutOffTimes && Array.isArray(cutOffTimes)) {
      const now = new Date();
      const cutOff = cutOffTimes.find((c: any) => c.dayOfWeek === dayOfWeek);
      if (cutOff && cutOff.hoursInAdvance > 0) {
        const requiredTime = new Date(date);
        requiredTime.setHours(requiredTime.getHours() - cutOff.hoursInAdvance);
        if (now > requiredTime) return false;
      }
    }

    return true;
  };

  // Check if a time slot is valid based on opening hours and cut-off times
  const isTimeSlotValid = (timeSlot: string, date: Date) => {
    if (!date) return false;
    
    const dayOfWeek = date.getDay();
    
    // Check opening hours for the day
    if (openingHours && Array.isArray(openingHours)) {
      const dayHours = openingHours.find((h: any) => h.dayOfWeek === dayOfWeek);
      if (!dayHours || !dayHours.isOpen) return false;
      
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotTime = hours * 60 + minutes; // Convert to minutes
      
      const [openHour, openMin] = dayHours.openTime.split(':').map(Number);
      const [closeHour, closeMin] = dayHours.closeTime.split(':').map(Number);
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      
      if (slotTime < openTime || slotTime > closeTime) return false;
    }

    // Check cut-off times
    if (cutOffTimes && Array.isArray(cutOffTimes)) {
      const now = new Date();
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      
      if (isToday) {
        const cutOff = cutOffTimes.find((c: any) => c.dayOfWeek === dayOfWeek);
        if (cutOff) {
          const [cutHour, cutMin] = cutOff.cutOffTime.split(':').map(Number);
          const cutOffMinutes = cutHour * 60 + cutMin;
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          
          const [slotHour, slotMin] = timeSlot.split(':').map(Number);
          const slotMinutes = slotHour * 60 + slotMin;
          
          // If current time + cut-off buffer > slot time, slot is not available
          if (currentMinutes + cutOffMinutes > slotMinutes) return false;
        }
      }
    }

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
        suggestion: "Perfect time for fresh pastries, coffee, and morning specialties"
      };
    } else if (currentHour >= 12 && currentHour < 17) {
      return {
        greeting: "Good Afternoon!",
        message: `Perfect time for lunch at ${restaurantName}`,
        icon: "☀️",
        mealType: "lunch", 
        suggestion: "Enjoy our midday menu with light dishes and refreshing beverages"
      };
    } else if (currentHour >= 17 && currentHour < 21) {
      return {
        greeting: "Good Evening!",
        message: `Join us for an exceptional dinner at ${restaurantName}`,
        icon: "🌆",
        mealType: "dinner",
        suggestion: "Indulge in our signature dishes and fine dining experience"
      };
    } else {
      return {
        greeting: "Welcome!",
        message: `Experience late-night dining at ${restaurantName}`,
        icon: "🌙",
        mealType: "late-night",
        suggestion: "Discover our special late-night menu and cozy atmosphere"
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
      preferredTimes = ['08:00', '09:00', '10:00', '11:00'];
    } else if (currentHour >= 12 && currentHour < 17) {
      // Afternoon - recommend lunch times
      preferredTimes = ['12:00', '12:30', '13:00', '13:30', '14:00'];
    } else if (currentHour >= 17 && currentHour < 21) {
      // Evening - recommend dinner times
      preferredTimes = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    } else {
      // Late night - recommend available evening slots
      preferredTimes = ['21:00', '21:30', '22:00'];
    }
    
    // Return only preferred times that are actually available
    return preferredTimes.filter(time => availableSlots.includes(time));
  };

  const recommendedSlots = getRecommendedTimeSlots(timeSlots);

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
    <div className="min-h-screen from-slate-900 via-blue-900 to-indigo-900 bg-[#431b6d]">
      {/* Header with Personalized Welcome */}
      <div className="text-center py-6 md:py-8 px-4 bg-[#431b6d]">
        <div className="mb-4 animate-fade-in">
          <span className="text-4xl md:text-6xl mb-2 block animate-bounce">{welcomeMessage.icon}</span>
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
      <div className="flex-1 px-4 pb-6 bg-[#431b6d]">
        {/* Seasonal Theme Display */}
        <div className="max-w-2xl mx-auto mb-6">
          <ActiveSeasonalThemeDisplay
            restaurantId={parseInt(restaurantId)}
            tenantId={parseInt(tenantId)}
            variant="compact"
          />
        </div>
        
        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Date Selection */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">Select Date</h2>
                
                {/* Month Navigation Header */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousMonth}
                    disabled={startOfMonth(currentMonth) <= startOfMonth(new Date())}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <h3 className="text-lg font-semibold text-gray-800">
                    {format(currentMonth, 'MMMM yyyy')}
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
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for proper day alignment - Monday first */}
                  {(() => {
                    const firstDayOfMonth = getDay(startOfMonth(currentMonth));
                    // Convert to Monday-first: Sunday=0 -> 6, Monday=1 -> 0, Tuesday=2 -> 1, etc.
                    const mondayFirstOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                    
                    return Array.from({ length: mondayFirstOffset }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-12"></div>
                    ));
                  })()}
                  
                  {/* Date buttons */}
                  {calendarDates.map((date, index) => {
                    const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const isPastDate = date < startOfDay(new Date());
                    const isAvailable = !isPastDate && isDateAvailable(date);
                    

                    
                    return (
                      <button
                        key={index}
                        onClick={() => isAvailable && setSelectedDate(date)}
                        disabled={!isAvailable}
                        className={`
                          h-12 w-full rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center
                          ${isPastDate
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : !isAvailable
                            ? 'border-red-300 bg-red-100 text-red-600 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-500 bg-blue-500 text-white shadow-lg'
                            : isToday
                            ? 'border-green-400 bg-green-100 text-green-700 font-semibold'
                            : 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100'}
                        `}
                      >
                        <span className="text-sm font-medium">{format(date, 'd')}</span>
                        {isToday && isAvailable && <span className="text-xs">Today</span>}
                        {isPastDate && <span className="text-xs">Past</span>}
                        {!isAvailable && !isPastDate && <span className="text-xs">Closed</span>}
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
              </div>
            )}

            {/* Step 1: Time Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Select Time</h2>
                  {timeSlots.length > 0 && (
                    <p className="text-sm text-blue-600 font-medium">
                      ⭐ Recommended for {welcomeMessage.mealType}
                    </p>
                  )}
                </div>
                
                {timeSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No time slots available for this date</p>
                    <p className="text-sm text-gray-500">Please select a different date</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {timeSlots.map((time) => {
                        const isRecommended = recommendedSlots.includes(time);
                        const isValidByRules = selectedDate ? isTimeSlotValid(time, selectedDate) : false;
                        const isAvailableBySystem = !(availableSlots as any) || (availableSlots as any).slots?.includes(time);
                        const isAvailable = isValidByRules && isAvailableBySystem;
                        const isSelected = selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => isAvailable && setSelectedTime(time)}
                            disabled={!isAvailable}
                            className={`
                              relative p-3 rounded-lg border-2 transition-all duration-200
                              ${!isAvailable
                                ? 'border-red-300 bg-red-100 text-red-600 cursor-not-allowed'
                                : isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                                : isRecommended
                                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
                                : 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100'}
                            `}
                          >
                            {isRecommended && isAvailable && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"></span>
                            )}
                            {time}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 text-center space-y-2">
                      <p>Golden dots indicate recommended times for {welcomeMessage.mealType}</p>
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
              </div>
            )}

            {/* Step 2: Guest Count */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Number of Guests</h2>
                  <p className="text-sm text-blue-600 font-medium">
                    Suggested for {welcomeMessage.mealType}: {getDefaultGuestCount()} guests
                  </p>
                </div>
                
                {/* Direct Input Option */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <Label htmlFor="guestInput" className="text-sm font-medium text-gray-700">
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
                      className={`
                        px-3 py-1 rounded-full text-sm transition-all duration-200
                        ${guestCount === count 
                          ? 'bg-blue-500 text-white' 
                          : count === getDefaultGuestCount()
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                      `}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-center text-gray-600 text-sm">Type directly, use +/- buttons, or quick select (1-20 guests)</p>
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