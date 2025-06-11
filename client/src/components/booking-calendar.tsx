import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import InternationalPhoneInput from "@/components/international-phone-input";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { List, Table, Calendar, Users, Plus, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";
import WalkInBookingButton from "@/components/walk-in-booking";

interface BookingCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  allBookings?: Booking[];
  tables: TableType[];
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
}

export default function BookingCalendar({ selectedDate, bookings, allBookings = [], tables, isLoading, onDateSelect }: BookingCalendarProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showTableBookings, setShowTableBookings] = useState(false);

  // Fetch combined tables
  const { data: combinedTables = [], isLoading: combinedTablesLoading } = useQuery({
    queryKey: ["combinedTables", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/combined-tables`);
      if (!response.ok) throw new Error("Failed to fetch combined tables");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

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

  // Fetch special periods
  const { data: specialPeriods = [] } = useQuery({
    queryKey: ["specialPeriods", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/special-periods`);
      if (!response.ok) throw new Error("Failed to fetch special periods");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Fetch cut-off times
  const { data: cutOffTimes = [] } = useQuery({
    queryKey: ["cutOffTimes", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/cut-off-times`);
      if (!response.ok) throw new Error("Failed to fetch cut-off times");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  const getOpeningHoursForDay = (date: Date) => {
    // Check if there's a special period that affects this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const specialPeriod = specialPeriods.find((period: any) => {
      const startDateStr = period.startDate;
      const endDateStr = period.endDate;
      return dateStr >= startDateStr && dateStr <= endDateStr;
    });

    // If there's a special period, use its settings
    if (specialPeriod) {
      return {
        isOpen: specialPeriod.isOpen,
        openTime: specialPeriod.isOpen ? (specialPeriod.openTime || "09:00") : "00:00",
        closeTime: specialPeriod.isOpen ? (specialPeriod.closeTime || "22:00") : "00:00",
        dayOfWeek: date.getDay()
      };
    }

    // Otherwise, use regular opening hours
    if (!openingHours || !Array.isArray(openingHours)) {
      return null;
    }
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = openingHours.find(h => h.dayOfWeek === dayOfWeek);
    return hours;
  };

  // Check if a time slot is blocked by cut-off time restrictions
  const isTimeSlotBlocked = (date: Date, timeSlot: string) => {
    if (!Array.isArray(cutOffTimes) || cutOffTimes.length === 0) {
      return false;
    }

    const dayOfWeek = date.getDay();
    const cutOffTime = cutOffTimes.find((ct: any) => ct.dayOfWeek === dayOfWeek && ct.isEnabled);
    
    if (!cutOffTime || cutOffTime.cutOffHours === 0) {
      return false;
    }

    // Create booking datetime by combining date and time
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const bookingDateTime = new Date(date);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    // Calculate cut-off datetime (current time + cut-off hours)
    const now = new Date();
    const cutOffDateTime = new Date(now.getTime() + (cutOffTime.cutOffHours * 60 * 60 * 1000));
    
    // Check if booking time is before the cut-off time (should be blocked)
    return bookingDateTime <= cutOffDateTime;
  };

  const getDefaultStartTime = () => {
    const dayHours = getOpeningHoursForDay(selectedDate);
    if (dayHours && dayHours.isOpen) {
      return dayHours.openTime;
    }
    return "19:00"; // fallback
  };

  const getDefaultEndTime = (startTime: string) => {
    const startHour = parseInt(startTime.split(':')[0]);
    return `${(startHour + 1).toString().padStart(2, '0')}:00`;
  };

  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    startTime: "19:00", // Initialize with fallback value
    endTime: "20:00", // Initialize with fallback value (1 hour duration)
    tableId: "",
    notes: ""
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      // First validate the booking time
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
        queryKey: [`/api/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/customers`] 
      });
      setIsNewBookingOpen(false);
      // Reset to dynamic default times when opening hours are available
      const defaultStartTime = openingHours.length > 0 ? getDefaultStartTime() : "19:00";
      const defaultEndTime = openingHours.length > 0 ? getDefaultEndTime(defaultStartTime) : "20:00";
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
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

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    let tableId = null;

    // Handle table assignment
    if (newBooking.tableId && newBooking.tableId !== "auto") {
      if (newBooking.tableId.startsWith("combined-")) {
        // For combined tables, we'll need to handle this differently
        // For now, let's not assign a specific table ID for combined tables
        tableId = null;
      } else {
        tableId = parseInt(newBooking.tableId);

        // Validate guest count against selected table capacity
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
    }

    // Format date as YYYY-MM-DD without timezone conversion
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: dateString,
      tableId: tableId,
      restaurantId: restaurant?.id
    });
  };

  const generateTimeSlots = (date?: Date) => {
    const targetDate = date || selectedDate;
    const dayHours = getOpeningHoursForDay(targetDate);
    
    if (!dayHours || !dayHours.isOpen) {
      return [];
    }
    
    const slots = [];
    const openHour = parseInt(dayHours.openTime.split(':')[0]);
    const closeHour = parseInt(dayHours.closeTime.split(':')[0]);
    
    for (let hour = openHour; hour < closeHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getBookingForTableAndTime = (tableId: number, time: string) => {
    return bookings.find(booking => 
      booking.tableId === tableId && booking.startTime === time
    );
  };

  const getBookingsForDate = (date: Date) => {
    // Always use allBookings to ensure we can show bookings for any date
    const bookingsToUse = allBookings;
    return bookingsToUse.filter(booking => 
      isSameDay(new Date(booking.bookingDate), date)
    );
  };

  const getTableDisplayName = (booking: any) => {
    if (!booking.tableId) return "Auto-assigned";

    const table = tables?.find(t => t.id === booking.tableId);
    if (table) {
      return `Table ${table.tableNumber}`;
    }

    const combinedTable = combinedTables?.find(ct => ct.id === booking.tableId);
    if (combinedTable) {
      return `Combined Table ${combinedTable.name}`;
    }

    return `Table ${booking.tableId}`;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  const renderCalendarView = () => (
    <Card className="bg-white border border-gray-200">
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map(day => {
            const dayBookings = getBookingsForDate(day);
            const dayHours = getOpeningHoursForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isClosed = !dayHours || !dayHours.isOpen;

            // Generate hourly time slots for this day
            const generateTimeSlots = () => {
              if (isClosed) return [];
              
              const slots = [];
              const openHour = parseInt(dayHours.openTime.split(':')[0]);
              const closeHour = parseInt(dayHours.closeTime.split(':')[0]);
              
              for (let hour = openHour; hour < closeHour; hour++) {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const booking = dayBookings.find(b => b.startTime === timeStr);
                slots.push({ time: timeStr, booking });
              }
              return slots;
            };

            const timeSlots = generateTimeSlots();

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[160px] border rounded transition-colors cursor-pointer ${
                  isSelected 
                    ? 'bg-green-50 border-green-300 shadow-md' 
                    : isTodayDate 
                    ? 'bg-green-50 border-green-200' 
                    : isClosed
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:shadow-sm hover:border-green-200'
                }`}
                onClick={() => onDateSelect(day)}
              >
                {/* Day Header */}
                <div 
                  className={`p-2 border-b bg-gradient-to-r cursor-pointer hover:from-green-50 hover:to-green-25 ${
                    isSelected 
                      ? 'from-green-100 to-green-50 border-green-200' 
                      : isTodayDate 
                      ? 'from-green-100 to-green-50 border-green-200' 
                      : isClosed
                      ? 'from-gray-100 to-gray-50 border-gray-200'
                      : 'from-white to-gray-50 border-gray-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateSelect(day);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className={`text-sm font-semibold hover:text-green-600 transition-colors ${
                        isSelected ? 'text-green-700' : isTodayDate ? 'text-green-700' : isClosed ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                        {dayBookings.length}
                      </div>
                    )}
                  </div>
                  
                  {/* Opening Hours */}
                  <div className="mt-1">
                    {isClosed ? (
                      <div className="text-xs text-gray-500 italic font-medium">Closed</div>
                    ) : (
                      <div className="text-xs text-gray-600 font-medium">
                        {dayHours.openTime} - {dayHours.closeTime}
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Slots Grid */}
                <div className="p-1">
                  {isClosed ? (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-400">
                      Restaurant Closed
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {timeSlots.map(({ time, booking }) => (
                        <div
                          key={time}
                          className={`h-8 rounded-sm text-xs font-medium flex items-center justify-center cursor-pointer transition-all duration-200 ${
                            booking
                              ? 'bg-red-100 border border-red-200 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 border border-green-200 text-green-800 hover:bg-green-200 hover:scale-105'
                          }`}
                          title={
                            booking 
                              ? `${time} - ${booking.customerName} (${booking.guestCount} guests) - ${getTableDisplayName(booking)}`
                              : `${time} - Available`
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!booking) {
                              onDateSelect(day);
                              setNewBooking(prev => ({
                                ...prev,
                                startTime: time,
                                endTime: `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
                              }));
                              setIsNewBookingOpen(true);
                            }
                          }}
                        >
                          {booking ? (
                            <div className="text-center">
                              <div className="text-xs leading-tight">{time.split(':')[0]}</div>
                              <div className="text-xs leading-tight opacity-75 truncate w-full">
                                {booking.customerName.split(' ')[0]}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-xs">{time.split(':')[0]}</div>
                              <div className="text-xs opacity-60">+</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderListView = () => {
    const selectedDateBookingsData = getBookingsForDate(selectedDate);
    const selectedDayHours = getOpeningHoursForDay(selectedDate);
    const isClosed = !selectedDayHours || !selectedDayHours.isOpen;

    return (
      <Card className="bg-white border border-gray-200">
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <h3 className="font-medium text-gray-900">
            Bookings for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="mt-1 space-y-1">
            <div className="text-sm text-gray-600">
              {isClosed ? (
                <span className="text-red-600 font-medium">Restaurant Closed</span>
              ) : (
                <span>Open: {selectedDayHours.openTime} - {selectedDayHours.closeTime}</span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {selectedDateBookingsData.length} bookings - {selectedDateBookingsData.reduce((sum, b) => sum + b.guestCount, 0)} guests
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          {selectedDateBookingsData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No bookings for this date
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {selectedDateBookingsData.map(booking => (
                <div 
                  key={booking.id} 
                  className="p-3 bg-white rounded border cursor-pointer hover:bg-gray-50"
                  onClick={() => window.location.href = `/${restaurant.tenantId}/bookings/${booking.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium text-gray-900">
                          {booking.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customerEmail}
                        </div>
                        {booking.customerPhone && (
                          <div className="text-sm text-gray-500">
                            {booking.customerPhone}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>{booking.startTime} - {booking.endTime}</span>
                        <span>{booking.guestCount} guests</span>
                        <span>{getTableDisplayName(booking)}</span>
                      </div>
                      {booking.notes && (
                        <div className="mt-1 text-sm text-gray-500">
                          Notes: {booking.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {booking.status || 'Confirmed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTableView = () => {
    const getTableBookingsForDate = (table: TableType) => {
      return allBookings?.filter(booking =>
        booking.tableId === table.id && isSameDay(new Date(booking.bookingDate), selectedDate)
      );
    };

    return (
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Table Overview</h3>
            <span className="text-sm text-gray-500">
              {bookings.length} bookings - {bookings.reduce((sum, b) => sum + b.guestCount, 0)} guests
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Time header */}
          <div className="grid grid-cols-13 gap-2 mb-4 text-sm text-gray-600">
            <div></div>
            {timeSlots.map((time) => (
              <div key={time} className="text-center">{time}</div>
            ))}
          </div>

          {/* Table rows */}
          <div className="space-y-2">
            {tables.slice(0, 8).map((table) => {
              const tableBookings = getTableBookingsForDate(table);
              const isTableBooked = tableBookings && tableBookings.length > 0;

              return (
                <div key={table.id} className="grid grid-cols-13 gap-2 items-center">
                  <div className="text-sm text-gray-600">
                    {table.tableNumber} ({table.capacity})
                  </div>
                  {timeSlots.map((time) => {
                    const booking = getBookingForTableAndTime(table.id, time);
                    const isSelected = newBooking.startTime === time && newBooking.tableId === table.id.toString();
                    return (
                      <div
                        key={time}
                        className={`h-8 rounded ${
                          booking
                            ? "bg-red-200 border border-red-300"
                            : isSelected
                            ? "bg-green-200 border border-green-300"
                            : "bg-gray-100 hover:bg-green-50 cursor-pointer"
                        }`}
                        title={booking ? `${booking.customerName} - ${booking.guestCount} guests` : isSelected ? "Selected for new booking" : "Available"}
                        onClick={() => {
                          if (!booking && isNewBookingOpen) {
                            setNewBooking({
                              ...newBooking,
                              tableId: table.id.toString(),
                              startTime: time
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant={activeView === "calendar" ? "default" : "ghost"}
            onClick={() => setActiveView("calendar")}
            className={activeView === "calendar" ? "bg-green-600 text-white" : ""}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button 
            variant={activeView === "list" ? "default" : "ghost"}
            onClick={() => setActiveView("list")}
            className={activeView === "list" ? "bg-green-600 text-white" : ""}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        {/* Booking Action Buttons */}
        <div className="flex items-center space-x-2">
          <WalkInBookingButton />
          
          {/* New Booking Dialog */}
          <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={newBooking.customerName}
                    onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newBooking.customerEmail}
                    onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <InternationalPhoneInput
                    value={newBooking.customerPhone}
                    onChange={(phone: string) => setNewBooking({ ...newBooking, customerPhone: phone })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="guestCount">Number of Guests</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    min="1"
                    max="12"
                    value={newBooking.guestCount}
                    onChange={(e) => setNewBooking({ ...newBooking, guestCount: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Select value={newBooking.startTime} onValueChange={(value) => {
                      setNewBooking({ 
                        ...newBooking, 
                        startTime: value,
                        endTime: getDefaultEndTime(value)
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Select value={newBooking.endTime} onValueChange={(value) => setNewBooking({ ...newBooking, endTime: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.filter(time => time > newBooking.startTime).map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tableId">Table (Optional)</Label>
                  <Select value={newBooking.tableId} onValueChange={(value) => setNewBooking({ ...newBooking, tableId: value === "auto" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-assign</SelectItem>
                      {tables && tables.length > 0 ? (
                        tables.map((table) => (
                          <SelectItem key={`table-${table.id}`} value={table.id.toString()}>
                            Table {table.tableNumber} ({table.capacity} seats)
                          </SelectItem>
                        ))
                      ) : null}
                      {combinedTables && combinedTables.length > 0 ? (
                        combinedTables.map((combinedTable) => (
                          <SelectItem key={`combined-${combinedTable.id}`} value={`combined-${combinedTable.id}`}>
                            Combined Table {combinedTable.name} ({combinedTable.totalCapacity} seats)
                          </SelectItem>
                        ))
                      ) : null}
                    </SelectContent>
                  </Select>
                  {tables && tables.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No tables configured. Tables will be auto-assigned if available.
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Render based on active view */}
      {activeView === "calendar" && renderCalendarView()}
      {activeView === "list" && renderListView()}
      {activeView === "table" && renderTableView()}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-6 h-4 bg-green-100 border border-green-200 rounded mr-2 flex items-center justify-center">
            <span className="text-xs text-green-800">+</span>
          </div>
          <span>Available Time Slot</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-4 bg-red-100 border border-red-200 rounded mr-2 flex items-center justify-center">
            <span className="text-xs text-red-800">●</span>
          </div>
          <span>Booked Time Slot</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 rounded mr-2" />
          <span>Closed Days</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <span>Click green slots to book instantly</span>
        </div>
      </div>
    </div>
  );
}