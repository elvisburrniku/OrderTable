import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addWeeks, 
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  startOfDay,
  parseISO,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  isSameMonth,
  isWeekend
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Settings, Grid, List } from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";

interface EnhancedGoogleCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  allBookings?: Booking[];
  tables: TableType[];
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
}

type ViewType = 'day' | 'week' | 'month';

interface DraggedBooking {
  booking: Booking;
  dragStart: { x: number; y: number };
  initialDate: Date;
  initialTime: string;
}

export default function EnhancedGoogleCalendar({ 
  selectedDate, 
  bookings, 
  allBookings = [], 
  tables, 
  isLoading, 
  onDateSelect 
}: EnhancedGoogleCalendarProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);
  const [draggedBooking, setDraggedBooking] = useState<DraggedBooking | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Time slots for the calendar (30-minute intervals from 9 AM to 11 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Get visible dates based on view
  const visibleDates = useMemo(() => {
    switch (view) {
      case 'day':
        return [currentDate];
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 })
        });
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      default:
        return [];
    }
  }, [view, currentDate]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, -1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, -1));
        break;
    }
  }, [view]);

  const navigateNext = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
    }
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Get bookings for a specific date and time slot
  const getBookingsForSlot = useCallback((date: Date, timeSlot?: string) => {
    return allBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      const isSameDate = isSameDay(bookingDate, date);
      
      if (!timeSlot) return isSameDate;
      
      const bookingTime = booking.startTime?.substring(0, 5);
      return isSameDate && bookingTime === timeSlot;
    });
  }, [allBookings]);

  // Drag and drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, booking: Booking) => {
    e.preventDefault();
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedBooking({
      booking,
      dragStart: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      initialDate: new Date(booking.bookingDate),
      initialTime: booking.startTime || ''
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedBooking) return;
    
    // Prevent default to avoid text selection during drag
    e.preventDefault();
    
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add visual feedback for drag position
    const dragElement = document.querySelector(`[data-booking-id="${draggedBooking.booking.id}"]`) as HTMLElement;
    if (dragElement) {
      dragElement.style.transform = `translate(${x - draggedBooking.dragStart.x}px, ${y - draggedBooking.dragStart.y}px)`;
      dragElement.style.zIndex = '1000';
    }
  }, [isDragging, draggedBooking]);

  const handleMouseUp = useCallback((e: React.MouseEvent, targetDate?: Date, targetTime?: string) => {
    if (!isDragging || !draggedBooking) return;
    
    setIsDragging(false);
    
    // Reset drag element styles
    const dragElement = document.querySelector(`[data-booking-id="${draggedBooking.booking.id}"]`) as HTMLElement;
    if (dragElement) {
      dragElement.style.transform = '';
      dragElement.style.zIndex = '';
    }
    
    if (targetDate && targetTime) {
      // Only update if date/time actually changed
      const originalDate = format(draggedBooking.initialDate, 'yyyy-MM-dd');
      const newDate = format(targetDate, 'yyyy-MM-dd');
      
      if (originalDate !== newDate || draggedBooking.initialTime !== targetTime) {
        updateBookingMutation.mutate({
          bookingId: draggedBooking.booking.id,
          newDate: newDate,
          newTime: targetTime
        });
      }
    }
    
    setDraggedBooking(null);
  }, [isDragging, draggedBooking, updateBookingMutation]);

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, newDate, newTime }: { bookingId: number; newDate: string; newTime: string }) => {
      const response = await apiRequest("PATCH", `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${bookingId}`, {
        bookingDate: newDate,
        startTime: newTime
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] });
      toast({
        title: "Booking Updated",
        description: "Booking has been moved successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive"
      });
    }
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest("POST", `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, bookingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] });
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
        title: "Booking Created",
        description: "New booking has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
    }
  });

  const handleCreateBooking = () => {
    if (!selectedTimeSlot) return;
    
    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: format(selectedTimeSlot.date, 'yyyy-MM-dd'),
      bookingTime: selectedTimeSlot.time,
      restaurantId: restaurant?.id,
      tenantId: restaurant?.tenantId
    });
  };

  const openNewBookingDialog = (date: Date, time: string) => {
    setSelectedTimeSlot({ date, time });
    setIsNewBookingOpen(true);
  };

  // Render functions for different views
  const renderDayView = () => {
    const dayBookings = getBookingsForSlot(currentDate);
    
    return (
      <div className="flex-1">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-semibold text-lg">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {timeSlots.map(timeSlot => {
              const slotBookings = getBookingsForSlot(currentDate, timeSlot);
              return (
                <div
                  key={timeSlot}
                  className={`flex items-center space-x-4 p-2 border rounded cursor-pointer transition-all duration-200 ${
                    isDragging ? 'hover:bg-blue-50 hover:border-blue-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => openNewBookingDialog(currentDate, timeSlot)}
                  onMouseUp={(e) => handleMouseUp(e, currentDate, timeSlot)}
                >
                  <div className="w-20 text-sm text-gray-600">{timeSlot}</div>
                  <div className="flex-1 space-y-1">
                    {slotBookings.map(booking => (
                      <div
                        key={booking.id}
                        className="flex items-center space-x-2 p-2 bg-blue-100 text-blue-800 rounded text-sm cursor-move"
                        draggable
                        onMouseDown={(e) => handleMouseDown(e, booking)}
                      >
                        <Users className="w-4 h-4" />
                        <span>{booking.customerName} ({booking.guestCount} guests)</span>
                        {booking.tableId && (
                          <Badge variant="outline">Table {tables.find(t => t.id === booking.tableId)?.tableNumber}</Badge>
                        )}
                      </div>
                    ))}
                    {slotBookings.length === 0 && (
                      <div className="text-xs text-gray-400">Click to add booking</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="flex-1">
        <div className="border rounded-lg overflow-hidden">
          {/* Week header */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-2 text-sm font-medium">Time</div>
            {visibleDates.map(date => (
              <div key={date.toISOString()} className="p-2 text-center border-l">
                <div className="text-sm font-medium">{format(date, 'EEE')}</div>
                <div className={`text-xs ${isToday(date) ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>
          
          {/* Time slots */}
          <div className="max-h-96 overflow-y-auto">
            {timeSlots.map(timeSlot => (
              <div key={timeSlot} className="grid grid-cols-8 border-b">
                <div className="p-2 text-xs text-gray-600 border-r">{timeSlot}</div>
                {visibleDates.map(date => {
                  const slotBookings = getBookingsForSlot(date, timeSlot);
                  return (
                    <div
                      key={`${date.toISOString()}-${timeSlot}`}
                      className="p-1 border-l min-h-[60px] hover:bg-gray-50 cursor-pointer relative"
                      onClick={() => openNewBookingDialog(date, timeSlot)}
                      onMouseUp={(e) => handleMouseUp(e, date, timeSlot)}
                    >
                      {slotBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={`p-1 mb-1 bg-blue-100 text-blue-800 rounded text-xs cursor-move transition-all duration-200 hover:bg-blue-200 hover:shadow-md ${
                            draggedBooking?.booking.id === booking.id ? 'opacity-50 transform scale-95' : ''
                          }`}
                          draggable
                          onMouseDown={(e) => handleMouseDown(e, booking)}
                        >
                          <div className="truncate font-medium">{booking.customerName}</div>
                          <div className="text-xs opacity-75">{booking.guestCount} guests</div>
                          {booking.tableId && (
                            <div className="text-xs opacity-75">
                              Table {tables.find(t => t.id === booking.tableId)?.tableNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const weeks = [];
    for (let i = 0; i < visibleDates.length; i += 7) {
      weeks.push(visibleDates.slice(i, i + 7));
    }

    return (
      <div className="flex-1">
        <div className="border rounded-lg overflow-hidden">
          {/* Month header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium border-l first:border-l-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Month days */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b">
              {week.map(date => {
                const dayBookings = getBookingsForSlot(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`p-2 border-l first:border-l-0 min-h-[120px] cursor-pointer transition-all duration-200 ${
                      !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                    } ${isToday(date) ? 'bg-blue-50' : ''} ${
                      isDragging ? 'hover:bg-blue-50 hover:border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      onDateSelect(date);
                      setCurrentDate(date);
                      setView('day');
                    }}
                    onMouseUp={(e) => handleMouseUp(e, date)}
                  >
                    <div className={`text-sm mb-1 ${isToday(date) ? 'font-bold text-blue-600' : ''}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map(booking => (
                        <div
                          key={booking.id}
                          className="p-1 bg-blue-100 text-blue-800 rounded text-xs truncate cursor-move"
                          draggable
                          onMouseDown={(e) => handleMouseDown(e, booking)}
                        >
                          {booking.customerName}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div 
      ref={calendarRef}
      className={`space-y-4 ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e)}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday}>
              Today
            </Button>
          </div>
          <h2 className="text-xl font-semibold">{getViewTitle()}</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex border rounded-lg">
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className="rounded-r-none"
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="rounded-none border-x-0"
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="rounded-l-none"
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={newBooking.customerName}
                onChange={(e) => setNewBooking(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name"
              />
            </div>
            
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={newBooking.customerEmail}
                onChange={(e) => setNewBooking(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={newBooking.customerPhone}
                onChange={(e) => setNewBooking(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div>
              <Label htmlFor="guestCount">Guest Count</Label>
              <Input
                id="guestCount"
                type="number"
                min="1"
                value={newBooking.guestCount}
                onChange={(e) => setNewBooking(prev => ({ ...prev, guestCount: parseInt(e.target.value) || 1 }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="tableId">Table</Label>
              <Select value={newBooking.tableId} onValueChange={(value) => setNewBooking(prev => ({ ...prev, tableId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      Table {table.tableNumber} (Capacity: {table.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newBooking.notes}
                onChange={(e) => setNewBooking(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special requests or notes..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewBookingOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBooking} 
                disabled={createBookingMutation.isPending || !newBooking.customerName}
              >
                {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}