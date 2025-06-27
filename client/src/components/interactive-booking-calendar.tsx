import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { formatDate, formatTime } from "@/lib/time-formatter";
import { ChevronLeft, ChevronRight, Clock, Users, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TimeSlot {
  time: string;
  available: boolean;
  capacity: number;
  bookedSlots: number;
  bookings: Array<{
    id: number;
    customerName: string;
    guestCount: number;
    tableId?: number;
  }>;
}

interface DayAvailability {
  date: Date;
  isOpen: boolean;
  totalSlots: number;
  availableSlots: number;
  timeSlots: TimeSlot[];
  openTime?: string;
  closeTime?: string;
  closureReason?: string;
  allTimeSlots?: string[];
  noTablesAvailable?: boolean;
}

interface InteractiveBookingCalendarProps {
  restaurantId: number;
  tenantId?: number;
  onTimeSlotSelect?: (date: Date, time: string, isManagerOverride?: boolean) => void;
  guestCount?: number;
  isPublic?: boolean;
  isManager?: boolean;
}

export default function InteractiveBookingCalendar({ 
  restaurantId, 
  tenantId, 
  onTimeSlotSelect, 
  guestCount = 2,
  isPublic = false,
  isManager = false
}: InteractiveBookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showManagerOverrideDialog, setShowManagerOverrideDialog] = useState(false);
  const [overrideDateAndTime, setOverrideDateAndTime] = useState<{date: Date, time: string} | null>(null);
  const [availabilityData, setAvailabilityData] = useState<Map<string, DayAvailability>>(new Map());

  // Get calendar days for current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch opening hours
  const { data: openingHours = [] } = useQuery({
    queryKey: [isPublic ? "public-opening-hours" : "opening-hours", restaurantId, tenantId],
    queryFn: async () => {
      const url = isPublic 
        ? `/api/restaurants/${restaurantId}/opening-hours/public`
        : `/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch opening hours");
      return response.json();
    },
    enabled: !!restaurantId && (!isPublic ? !!tenantId : true),
  });

  // Fetch special periods
  const { data: specialPeriods = [] } = useQuery({
    queryKey: [isPublic ? "public-special-periods" : "special-periods", restaurantId, tenantId],
    queryFn: async () => {
      if (isPublic) return []; // Special periods not exposed for public booking
      const url = `/api/tenants/${tenantId}/restaurants/${restaurantId}/special-periods`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch special periods");
      return response.json();
    },
    enabled: !!restaurantId && !isPublic && !!tenantId,
  });

  // Fetch availability data for visible date range
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      const promises = calendarDays.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        try {
          // Use the new calendar availability API
          const response = await fetch(`/api/restaurants/${restaurantId}/calendar-availability?date=${dateStr}&guests=${guestCount}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch availability for ${dateStr}`);
          }
          
          const availabilityInfo = await response.json();
          
          if (!availabilityInfo.isOpen) {
            // Restaurant is closed
            return [dateStr, {
              date: day,
              isOpen: false,
              totalSlots: 0,
              availableSlots: 0,
              timeSlots: [],
              closureReason: availabilityInfo.closureReason,
              allTimeSlots: [],
              noTablesAvailable: false
            } as DayAvailability];
          }
          
          // Convert to TimeSlot format for compatibility
          const timeSlots: TimeSlot[] = availabilityInfo.allTimeSlots.map((time: string) => ({
            time,
            available: availabilityInfo.availableSlots.includes(time),
            capacity: 0,
            bookedSlots: 0,
            bookings: []
          }));

          return [dateStr, {
            date: day,
            isOpen: true,
            totalSlots: availabilityInfo.allTimeSlots.length,
            availableSlots: availabilityInfo.availableSlots.length,
            timeSlots,
            openTime: availabilityInfo.openTime,
            closeTime: availabilityInfo.closeTime,
            closureReason: null,
            allTimeSlots: availabilityInfo.allTimeSlots,
            noTablesAvailable: availabilityInfo.noTablesAvailable || false
          } as DayAvailability];

        } catch (error) {
          console.error(`Error fetching availability for ${dateStr}:`, error);
          return [dateStr, {
            date: day,
            isOpen: false,
            totalSlots: 0,
            availableSlots: 0,
            timeSlots: [],
            closureReason: 'Error loading availability',
            allTimeSlots: [],
            noTablesAvailable: false
          } as DayAvailability];
        }
      });

      const results = await Promise.all(promises);
      setAvailabilityData(new Map(results));
    };

    if (restaurantId) {
      fetchAvailabilityData();
    }
  }, [currentMonth, restaurantId, guestCount]);

  // Handle manager override functionality
  const handleManagerOverride = () => {
    if (overrideDateAndTime && onTimeSlotSelect) {
      onTimeSlotSelect(overrideDateAndTime.date, overrideDateAndTime.time, true);
      setShowManagerOverrideDialog(false);
      setOverrideDateAndTime(null);
    }
  };

  // Handle time slot selection with override logic
  const handleTimeSlotClick = (date: Date, time: string) => {
    const dayData = availabilityData.get(format(date, 'yyyy-MM-dd'));
    
    if (!dayData) return;
    
    // Check if this is a closed day/time
    if (!dayData.isOpen || (dayData.allTimeSlots && !dayData.allTimeSlots.includes(time))) {
      if (isManager) {
        // Show manager override dialog
        setOverrideDateAndTime({ date, time });
        setShowManagerOverrideDialog(true);
        return;
      } else {
        // Regular users cannot book closed times
        return;
      }
    }
    
    // Check if time slot is available
    const timeSlot = dayData.timeSlots.find(slot => slot.time === time);
    if (!timeSlot?.available && !isManager) {
      // Time slot is not available and user is not a manager
      return;
    }
    
    // If it's not available but user is manager, show override dialog
    if (!timeSlot?.available && isManager) {
      setOverrideDateAndTime({ date, time });
      setShowManagerOverrideDialog(true);
      return;
    }
    
    // Regular booking
    if (onTimeSlotSelect) {
      onTimeSlotSelect(date, time, false);
    }
  };

  // Updated availability check to handle the new API structure
  useEffect(() => {
    const fetchLegacyAvailabilityData = async () => {
      const promises = calendarDays.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        try {
          // Check if there's a special period that affects this date
          const specialPeriod = specialPeriods.find((period: any) => {
            const startDateStr = period.startDate;
            const endDateStr = period.endDate;
            return dateStr >= startDateStr && dateStr <= endDateStr;
          });

          let dayHours;
          if (specialPeriod) {
            // Use special period settings
            dayHours = {
              isOpen: specialPeriod.isOpen,
              openTime: specialPeriod.isOpen ? (specialPeriod.openTime || "09:00") : "00:00",
              closeTime: specialPeriod.isOpen ? (specialPeriod.closeTime || "22:00") : "00:00",
              dayOfWeek: day.getDay()
            };
          } else {
            // Use regular opening hours
            const dayOfWeek = day.getDay();
            dayHours = openingHours && Array.isArray(openingHours) 
              ? openingHours.find((h: any) => h.dayOfWeek === dayOfWeek)
              : null;
          }
          
          if (!dayHours || !dayHours.isOpen) {
            return [dateStr, {
              date: day,
              isOpen: false,
              totalSlots: 0,
              availableSlots: 0,
              timeSlots: []
            } as DayAvailability];
          }

          // Fetch available time slots for this date
          const response = await fetch(
            `/api/restaurants/${restaurantId}/available-times?date=${dateStr}&guests=${guestCount}`
          );
          
          if (!response.ok) {
            return [dateStr, {
              date: day,
              isOpen: true,
              totalSlots: 0,
              availableSlots: 0,
              timeSlots: [],
              openTime: dayHours.openTime,
              closeTime: dayHours.closeTime
            } as DayAvailability];
          }

          const availableTimes = await response.json();
          
          // Generate all possible time slots for this day
          const allTimeSlots = generateTimeSlots(dayHours.openTime, dayHours.closeTime);
          
          const timeSlots: TimeSlot[] = allTimeSlots.map(time => ({
            time,
            available: availableTimes.includes(time),
            capacity: 0, // Will be calculated based on table data
            bookedSlots: 0,
            bookings: []
          }));

          return [dateStr, {
            date: day,
            isOpen: true,
            totalSlots: allTimeSlots.length,
            availableSlots: availableTimes.length,
            timeSlots,
            openTime: dayHours.openTime,
            closeTime: dayHours.closeTime
          } as DayAvailability];

        } catch (error) {
          console.error(`Error fetching availability for ${dateStr}:`, error);
          return [dateStr, {
            date: day,
            isOpen: false,
            totalSlots: 0,
            availableSlots: 0,
            timeSlots: []
          } as DayAvailability];
        }
      });

      const results = await Promise.all(promises);
      setAvailabilityData(new Map(results));
    };

    if (openingHours.length > 0) {
      fetchLegacyAvailabilityData();
    }
  }, [currentMonth, openingHours, restaurantId, guestCount]);

  const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
    const slots = [];
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    let currentHour = openHour;
    let currentMin = openMin;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeStr);

      currentMin += 30; // 30-minute intervals
      if (currentMin >= 60) {
        currentMin -= 60;
        currentHour += 1;
      }
    }

    return slots;
  };

  const getAvailabilityIndicator = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const availability = availabilityData.get(dateStr);
    
    if (!availability || !availability.isOpen) {
      return { color: 'bg-gray-200', text: 'Closed', icon: XCircle };
    }

    const ratio = availability.availableSlots / Math.max(availability.totalSlots, 1);
    
    if (ratio === 0) {
      return { color: 'bg-red-100 border-red-200', text: 'Fully Booked', icon: XCircle };
    } else if (ratio < 0.3) {
      return { color: 'bg-orange-100 border-orange-200', text: 'Limited', icon: AlertCircle };
    } else if (ratio < 0.7) {
      return { color: 'bg-yellow-100 border-yellow-200', text: 'Moderate', icon: Clock };
    } else {
      return { color: 'bg-green-100 border-green-200', text: 'Available', icon: CheckCircle };
    }
  };

  const handleDateClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const availability = availabilityData.get(dateStr);
    
    if (!availability || !availability.isOpen || availability.availableSlots === 0) {
      return; // Cannot select closed days or fully booked days
    }

    setSelectedDate(day);
    setShowTimeSlots(true);
  };

  const handleLegacyTimeSlotClick = (time: string) => {
    if (selectedDate) {
      handleTimeSlotClick(selectedDate, time);
      setShowTimeSlots(false);
    }
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const selectedDateAvailability = selectedDate 
    ? availabilityData.get(format(selectedDate, 'yyyy-MM-dd'))
    : null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Calendar Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select a Date
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-[150px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Calendar Grid */}
            <div className="space-y-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                  const availability = getAvailabilityIndicator(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAvailability = availabilityData.get(dateStr);
                  
                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => !isPast && handleDateClick(day)}
                          disabled={isPast}
                          className={`
                            relative h-16 border rounded-lg p-2 transition-all duration-200
                            ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                            ${isToday(day) ? 'ring-2 ring-blue-500' : ''}
                            ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                            ${availability.color}
                            ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-blue-600' : ''}
                          `}
                        >
                          <div className="text-sm font-medium">
                            {format(day, 'd')}
                          </div>
                          
                          {/* Availability Indicator */}
                          {isCurrentMonth && !isPast && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className={`
                                flex items-center justify-center gap-1 text-xs rounded px-1 py-0.5
                                ${availability.color}
                              `}>
                                <availability.icon className="w-3 h-3" />
                                {dayAvailability && dayAvailability.isOpen && (
                                  <span>{dayAvailability.availableSlots}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      
                      <TooltipContent>
                        <div className="text-sm">
                          <div className="font-medium">{format(day, 'EEEE, MMMM d')}</div>
                          {dayAvailability ? (
                            dayAvailability.isOpen ? (
                              <div>
                                <div>Hours: {dayAvailability.openTime} - {dayAvailability.closeTime}</div>
                                <div>Available slots: {dayAvailability.availableSlots} / {dayAvailability.totalSlots}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  For {guestCount} guest{guestCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            ) : (
                              <div>Restaurant closed</div>
                            )
                          ) : (
                            <div>Loading availability...</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Availability Legend:</div>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                  <span>Limited</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>Fully Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 rounded"></div>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots Dialog */}
        <Dialog open={showTimeSlots} onOpenChange={setShowTimeSlots}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Available Times
              </DialogTitle>
              <div className="text-sm text-gray-500">
                {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {guestCount && ` • ${guestCount} guest${guestCount !== 1 ? 's' : ''}`}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {selectedDateAvailability && selectedDateAvailability.timeSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {selectedDateAvailability.timeSlots
                    .filter(slot => slot.available)
                    .map(slot => (
                      <Button
                        key={slot.time}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTimeSlotClick(slot.time)}
                        className="h-12 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-300"
                      >
                        <div className="font-medium">{formatTime(slot.time)}</div>
                        <div className="text-xs text-gray-500">Available</div>
                      </Button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <div className="font-medium">No Available Times</div>
                  <div className="text-sm">
                    Try selecting a different date or contact the restaurant directly.
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manager Override Dialog */}
        <Dialog open={showManagerOverrideDialog} onOpenChange={setShowManagerOverrideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manager Override Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {overrideDateAndTime && (
                  <>
                    <p>
                      You are attempting to create a booking for{" "}
                      <strong>{format(overrideDateAndTime.date, 'EEEE, MMMM do, yyyy')}</strong> at{" "}
                      <strong>{overrideDateAndTime.time}</strong>
                    </p>
                    <p className="mt-2">
                      This time slot is normally unavailable due to restaurant closure or existing bookings.
                      As a manager, you can override this restriction to create a special booking.
                    </p>
                  </>
                )}
              </div>
              
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  This booking will bypass normal availability restrictions
                </span>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManagerOverrideDialog(false);
                    setOverrideDateAndTime(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManagerOverride}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Create Override Booking
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}