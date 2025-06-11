import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth.tsx";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import InternationalPhoneInput from "@/components/international-phone-input";
import { useToast } from "@/hooks/use-toast";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addWeeks, 
  subWeeks,
  addDays,
  startOfDay,
  parseISO,
  getHours,
  getMinutes
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Settings } from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";

interface GoogleCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  allBookings?: Booking[];
  tables: TableType[];
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
}

export default function GoogleCalendar({ selectedDate, bookings, allBookings = [], tables, isLoading, onDateSelect }: GoogleCalendarProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate, { weekStartsOn: 0 }));
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);

  // Fetch opening hours
  const { data: openingHours = [] } = useQuery({
    queryKey: ["openingHours", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/opening-hours`);
      if (!response.ok) throw new Error("Failed to fetch opening hours");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    startTime: "19:00",
    endTime: "20:00",
    tableId: "",
    notes: ""
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const validationResponse = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/validate-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingDate: bookingData.bookingDate,
          bookingTime: bookingData.startTime
        })
      });

      const validation = await validationResponse.json();
      if (!validation.isAllowed) {
        throw new Error("Restaurant is closed at this time");
      }

      return apiRequest("POST", `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        startTime: "19:00",
        endTime: "20:00",
        tableId: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    }
  });

  const getOpeningHoursForDay = (date: Date) => {
    if (!openingHours || !Array.isArray(openingHours)) {
      return null;
    }
    const dayOfWeek = date.getDay();
    return openingHours.find(h => h.dayOfWeek === dayOfWeek);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const weekDays = eachDayOfInterval({ 
    start: currentWeek, 
    end: endOfWeek(currentWeek, { weekStartsOn: 0 }) 
  });

  const getBookingsForDay = (date: Date) => {
    return allBookings.filter(booking => 
      isSameDay(new Date(booking.bookingDate), date)
    );
  };

  const getBookingAtTime = (date: Date, time: string) => {
    const dayBookings = getBookingsForDay(date);
    return dayBookings.find(booking => {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      return bookingStart <= time && (!bookingEnd || bookingEnd > time);
    });
  };

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation checks with clear error messages
    if (!selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a time slot first",
        variant: "destructive"
      });
      return;
    }

    if (!newBooking.customerName.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive"
      });
      return;
    }

    if (!newBooking.customerEmail.trim()) {
      toast({
        title: "Error",
        description: "Customer email is required",
        variant: "destructive"
      });
      return;
    }

    if (newBooking.guestCount < 1) {
      toast({
        title: "Error",
        description: "Guest count must be at least 1",
        variant: "destructive"
      });
      return;
    }

    let tableId = null;
    if (newBooking.tableId && newBooking.tableId !== "auto") {
      tableId = parseInt(newBooking.tableId);
      const selectedTable = tables.find(t => t.id === tableId);
      if (selectedTable && newBooking.guestCount > selectedTable.capacity) {
        toast({
          title: "Error",
          description: `Selected table can only accommodate ${selectedTable.capacity} guests. You have ${newBooking.guestCount} guests.`,
          variant: "destructive"
        });
        return;
      }
    }

    const year = selectedTimeSlot.date.getFullYear();
    const month = String(selectedTimeSlot.date.getMonth() + 1).padStart(2, '0');
    const day = String(selectedTimeSlot.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Show loading feedback
    toast({
      title: "Creating Booking",
      description: "Please wait while we process your booking...",
    });

    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: dateString,
      startTime: selectedTimeSlot.time,
      tableId: tableId,
      restaurantId: restaurant?.id
    });
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    const dayHours = getOpeningHoursForDay(date);
    if (!dayHours || !dayHours.isOpen) {
      toast({
        title: "Restaurant Closed",
        description: "The restaurant is closed on this day.",
        variant: "destructive"
      });
      return;
    }

    const existingBooking = getBookingAtTime(date, time);
    if (existingBooking) {
      // Navigate to booking details or show booking info
      return;
    }

    setSelectedTimeSlot({ date, time });
    const hour = parseInt(time.split(':')[0]);
    setNewBooking(prev => ({
      ...prev,
      startTime: time,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
    }));
    setIsNewBookingOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
          </div>
          
          <Button 
            onClick={() => {
              // Initialize with current date and default time if no time slot selected
              if (!selectedTimeSlot) {
                setSelectedTimeSlot({
                  date: selectedDate,
                  time: "19:00" // Default to 7 PM
                });
                setNewBooking(prev => ({
                  ...prev,
                  startTime: "19:00",
                  endTime: "20:00"
                }));
              }
              setIsNewBookingOpen(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        {/* Mini Calendar */}
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 4))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-medium text-gray-900">
                {format(currentWeek, 'MMMM yyyy')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 4))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Mini calendar grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-xs text-gray-500">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center py-1 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days - simplified for sidebar */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const dayBookings = getBookingsForDay(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onDateSelect(day)}
                      className={`text-xs p-1.5 rounded hover:bg-gray-100 ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : isTodayDate 
                          ? 'bg-blue-100 text-blue-600 font-medium' 
                          : 'text-gray-700'
                      }`}
                    >
                      <div>{format(day, 'd')}</div>
                      {dayBookings.length > 0 && (
                        <div className="w-1 h-1 bg-current rounded-full mx-auto mt-0.5"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* My calendars section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">My calendars</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span>Restaurant Bookings</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span>Events</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={previousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentWeek, 'MMMM yyyy')}
            </h2>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }));
                onDateSelect(today);
              }}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[800px]">
            {/* Week days header */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="p-3 text-xs text-gray-500 border-r border-gray-200 font-medium">
                GMT-05
              </div>
              {weekDays.map(day => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const dayBookings = getBookingsForDay(day);
                
                return (
                  <div 
                    key={day.toISOString()}
                    className={`p-3 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onDateSelect(day)}
                  >
                    <div className="text-xs text-gray-500 font-medium">
                      {format(day, 'EEE').toUpperCase()}
                    </div>
                    <div className={`text-2xl font-medium mt-1 ${
                      isTodayDate 
                        ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                        : isSelected
                        ? 'text-blue-600'
                        : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slots grid */}
            <div className="relative">
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 border-b border-gray-100 hover:bg-gray-25">
                  {/* Time label */}
                  <div className="p-3 text-xs text-gray-500 border-r border-gray-200 font-medium text-right pr-4">
                    {format(new Date(`2000-01-01T${time}`), 'h a')}
                  </div>
                  
                  {/* Day columns */}
                  {weekDays.map(day => {
                    const dayHours = getOpeningHoursForDay(day);
                    const isClosed = !dayHours || !dayHours.isOpen;
                    const booking = getBookingAtTime(day, time);
                    const isInOperatingHours = dayHours && 
                      time >= dayHours.openTime && 
                      time < dayHours.closeTime;
                    
                    return (
                      <div 
                        key={`${day.toISOString()}-${time}`}
                        className={`p-1 border-r border-gray-200 min-h-[48px] cursor-pointer relative ${
                          isClosed || !isInOperatingHours
                            ? 'bg-gray-50'
                            : booking
                            ? 'bg-blue-100 hover:bg-blue-200'
                            : 'hover:bg-blue-50'
                        }`}
                        onClick={() => handleTimeSlotClick(day, time)}
                      >
                        {booking && (
                          <div className="bg-blue-500 text-white text-xs p-1 rounded shadow-sm">
                            <div className="font-medium truncate">
                              {booking.customerName}
                            </div>
                            <div className="text-blue-100">
                              {booking.guestCount} guests
                            </div>
                          </div>
                        )}
                        
                        {isClosed && time === '12:00' && (
                          <div className="text-xs text-gray-400 text-center">
                            Closed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateBooking} className="space-y-4">
            {/* Date and Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bookingDate">Date</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={selectedTimeSlot ? format(selectedTimeSlot.date, 'yyyy-MM-dd') : format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value + 'T12:00:00');
                    setSelectedTimeSlot(prev => ({ 
                      date: newDate, 
                      time: prev?.time || newBooking.startTime 
                    }));
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bookingTime">Time</Label>
                <Select 
                  value={selectedTimeSlot?.time || newBooking.startTime} 
                  onValueChange={(time) => {
                    setSelectedTimeSlot(prev => ({ 
                      date: prev?.date || selectedDate, 
                      time 
                    }));
                    setNewBooking(prev => ({ ...prev, startTime: time }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={newBooking.customerName}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, customerName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={newBooking.customerEmail}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, customerEmail: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <InternationalPhoneInput
                  value={newBooking.customerPhone}
                  onChange={(phone: string) => setNewBooking(prev => ({ ...prev, customerPhone: phone }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="guestCount">Guest Count</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min="1"
                  value={newBooking.guestCount}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, guestCount: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Select 
                  value={newBooking.startTime} 
                  onValueChange={(value) => {
                    const hour = parseInt(value.split(':')[0]);
                    setNewBooking(prev => ({ 
                      ...prev, 
                      startTime: value,
                      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Select 
                  value={newBooking.endTime} 
                  onValueChange={(value) => setNewBooking(prev => ({ ...prev, endTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tableId">Table (Optional)</Label>
              <Select 
                value={newBooking.tableId} 
                onValueChange={(value) => setNewBooking(prev => ({ ...prev, tableId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign</SelectItem>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      Table {table.tableNumber} (Capacity: {table.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={newBooking.notes}
                onChange={(e) => setNewBooking(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special requests, allergies, etc."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNewBookingOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBookingMutation.isPending || !selectedTimeSlot}
                className="min-w-[120px]"
              >
                {createBookingMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Booking"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}