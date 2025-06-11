import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfDay, addMinutes, isSameDay, parseISO, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Search, Filter, MoreHorizontal, Edit, Trash2, Grid, List, Users, MapPin, Clock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Booking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  guestCount: number;
  tableId?: number;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';
  createdAt: string;
  source?: string;
  waiterId?: number;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  roomId?: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'timeline' | 'split';
type ResourceView = 'table' | 'waiter' | 'status';

const bookingFormSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  guestCount: z.number().min(1, "Guest count must be at least 1"),
  tableId: z.number().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

const statusColors = {
  confirmed: 'bg-green-50 border-l-green-500 text-green-800',
  pending: 'bg-yellow-50 border-l-yellow-500 text-yellow-800',
  cancelled: 'bg-red-50 border-l-red-500 text-red-800',
  completed: 'bg-blue-50 border-l-blue-500 text-blue-800',
  'no-show': 'bg-gray-50 border-l-gray-500 text-gray-800'
};

const tableColors = [
  'bg-blue-50 border-l-blue-400',
  'bg-green-50 border-l-green-400',
  'bg-purple-50 border-l-purple-400',
  'bg-orange-50 border-l-orange-400',
  'bg-pink-50 border-l-pink-400',
  'bg-cyan-50 border-l-cyan-400',
  'bg-indigo-50 border-l-indigo-400',
  'bg-emerald-50 border-l-emerald-400'
];

export default function EnhancedCalendarPage() {
  const { tenantId } = useParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [resourceView, setResourceView] = useState<ResourceView>('table');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [draggedOverSlot, setDraggedOverSlot] = useState<{ date: Date; time: string; tableId?: number } | null>(null);
  const [visibleTables, setVisibleTables] = useState<Set<number>>(new Set());
  const [showSplitView, setShowSplitView] = useState(false);
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bookings
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`],
  });

  // Fetch tables
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/tables`],
  });

  // Initialize visible tables when tables load
  React.useEffect(() => {
    if (tables.length > 0 && visibleTables.size === 0) {
      setVisibleTables(new Set(tables.map(t => t.id)));
    }
  }, [tables]);

  // Generate time slots (15-minute intervals from 9 AM to 11 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Generate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case 'week':
      case 'timeline':
        const weekStart = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case 'month':
        const monthStart = startOfWeek(startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)));
        return Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
      default:
        return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Filter visible tables
  const filteredTables = useMemo(() => {
    return tables.filter(table => visibleTables.has(table.id));
  }, [tables, visibleTables]);

  // Filter bookings for current view
  const viewBookings = useMemo(() => {
    return bookings.filter(booking => 
      dateRange.some(date => booking.bookingDate === format(date, 'yyyy-MM-dd'))
    );
  }, [bookings, dateRange]);

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings`, "POST", {
        ...data,
        restaurantId: 22,
        tenantId: parseInt(tenantId!),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`] });
      setIsCreateDialogOpen(false);
      toast({ title: "Booking created successfully" });
      form.reset();
    },
    onError: (error) => {
      console.error("Booking creation error:", error);
      toast({ title: "Failed to create booking", variant: "destructive" });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BookingFormData> }) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings/${id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`] });
      setIsEditDialogOpen(false);
      toast({ title: "Booking updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update booking", variant: "destructive" });
    },
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      bookingDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: selectedTimeSlot || "19:00",
      endTime: "",
      guestCount: 2,
      tableId: selectedTableId || undefined,
      notes: "",
    },
  });

  const editForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      bookingDate: "",
      startTime: "",
      endTime: "",
      guestCount: 2,
      notes: "",
    },
  });

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
      case 'timeline':
        setCurrentDate(prev => addDays(prev, -7));
        break;
      case 'month':
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'week':
      case 'timeline':
        setCurrentDate(prev => addDays(prev, 7));
        break;
      case 'month':
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get bookings for specific table and time slot
  const getBookingsForSlot = (tableId: number, date: Date, timeSlot: string) => {
    return viewBookings.filter(booking => 
      booking.tableId === tableId &&
      booking.bookingDate === format(date, 'yyyy-MM-dd') &&
      booking.startTime === timeSlot
    );
  };

  // Check for conflicts when dropping a booking
  const checkForConflicts = (tableId: number, date: Date, timeSlot: string, excludeBookingId?: number) => {
    const conflicts = getBookingsForSlot(tableId, date, timeSlot)
      .filter(booking => excludeBookingId ? booking.id !== excludeBookingId : true);
    return conflicts;
  };

  // Drag and drop handlers
  const handleDragStart = (booking: Booking) => {
    setDraggedBooking(booking);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, time: string, tableId?: number) => {
    e.preventDefault();
    setDraggedOverSlot({ date, time, tableId });
  };

  const handleDrop = (e: React.DragEvent, date: Date, time: string, tableId?: number) => {
    e.preventDefault();
    if (draggedBooking && tableId) {
      const conflicts = checkForConflicts(tableId, date, time, draggedBooking.id);
      if (conflicts.length > 0) {
        toast({
          title: "Conflict Detected",
          description: `Table ${tables.find(t => t.id === tableId)?.tableNumber} is already booked at ${time}`,
          variant: "destructive"
        });
        setDraggedOverSlot(null);
        setDraggedBooking(null);
        return;
      }

      // Update booking
      updateBookingMutation.mutate({
        id: draggedBooking.id,
        data: {
          tableId,
          bookingDate: format(date, 'yyyy-MM-dd'),
          startTime: time,
          customerName: draggedBooking.customerName,
          customerEmail: draggedBooking.customerEmail,
          customerPhone: draggedBooking.customerPhone,
          guestCount: draggedBooking.guestCount,
          notes: draggedBooking.notes
        }
      });
    }
    setDraggedOverSlot(null);
    setDraggedBooking(null);
  };

  // Handle slot click for new booking
  const handleSlotClick = (date: Date, time: string, tableId?: number) => {
    setSelectedDate(date);
    setSelectedTimeSlot(time);
    setSelectedTableId(tableId || null);
    
    // Check for conflicts
    if (tableId) {
      const conflicts = checkForConflicts(tableId, date, time);
      if (conflicts.length > 0) {
        toast({
          title: "Time Slot Occupied",
          description: `This time slot is already booked. Please select a different time.`,
          variant: "destructive"
        });
        return;
      }
    }

    form.reset({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      bookingDate: format(date, 'yyyy-MM-dd'),
      startTime: time,
      endTime: "",
      guestCount: 2,
      tableId: tableId || undefined,
      notes: "",
    });
    setIsCreateDialogOpen(true);
  };

  // Handle booking edit
  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    editForm.reset({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone || "",
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime || "",
      guestCount: booking.guestCount,
      tableId: booking.tableId,
      notes: booking.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Render booking event
  const renderBookingEvent = (booking: Booking, tableIndex?: number) => {
    const table = tables.find(t => t.id === booking.tableId);
    const colorClass = tableIndex !== undefined ? tableColors[tableIndex % tableColors.length] : statusColors[booking.status];
    
    return (
      <div
        key={booking.id}
        draggable
        onDragStart={() => handleDragStart(booking)}
        className={cn(
          "p-2 rounded-md border-l-4 cursor-move text-xs mb-1 hover:shadow-md transition-all duration-200",
          colorClass,
          draggedBooking?.id === booking.id && "opacity-50"
        )}
        onClick={() => handleEditBooking(booking)}
      >
        <div className="font-semibold truncate">{booking.customerName}</div>
        <div className="text-xs opacity-75 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {booking.startTime}
          {booking.endTime && ` - ${booking.endTime}`}
        </div>
        <div className="text-xs opacity-75 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {booking.guestCount} guests
        </div>
        {table && (
          <div className="text-xs opacity-60 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Table {table.tableNumber}
          </div>
        )}
        <Badge variant="secondary" className="text-xs px-1 py-0 mt-1">
          {booking.status}
        </Badge>
      </div>
    );
  };

  // Timeline view (Google Calendar Resources-like)
  const renderTimelineView = () => (
    <div className="h-full overflow-auto">
      {/* Header with table columns */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="grid grid-cols-[120px_1fr] gap-0">
          <div className="text-sm font-medium text-center py-3 border-r bg-gray-50">
            Time
          </div>
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${filteredTables.length}, 1fr)` }}>
            {filteredTables.map((table, index) => (
              <div
                key={table.id}
                className={cn(
                  "text-center py-3 border-r text-sm font-medium",
                  tableColors[index % tableColors.length]
                )}
              >
                <div>Table {table.tableNumber}</div>
                <div className="text-xs opacity-60">Capacity: {table.capacity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time slots grid */}
      <div className="space-y-0">
        {timeSlots.map(timeSlot => (
          <div key={timeSlot} className="grid grid-cols-[120px_1fr] gap-0 border-b border-gray-100">
            <div className="text-sm text-muted-foreground py-3 text-center border-r bg-gray-50 flex items-center justify-center">
              {timeSlot}
            </div>
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${filteredTables.length}, 1fr)` }}>
              {filteredTables.map((table, tableIndex) => {
                const slotBookings = dateRange.flatMap(date => 
                  getBookingsForSlot(table.id, date, timeSlot)
                );
                
                return (
                  <div
                    key={`${table.id}-${timeSlot}`}
                    className={cn(
                      "border-r p-2 min-h-[60px] hover:bg-blue-50 transition-colors cursor-pointer",
                      draggedOverSlot?.tableId === table.id && 
                      draggedOverSlot?.time === timeSlot && 
                      "bg-blue-100 border-blue-300"
                    )}
                    onDragOver={(e) => handleDragOver(e, dateRange[0], timeSlot, table.id)}
                    onDrop={(e) => handleDrop(e, dateRange[0], timeSlot, table.id)}
                    onClick={() => handleSlotClick(dateRange[0], timeSlot, table.id)}
                  >
                    {slotBookings.map(booking => renderBookingEvent(booking, tableIndex))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Week view
  const renderWeekView = () => (
    <div className="h-full overflow-auto">
      {/* Week header */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="grid grid-cols-8 gap-0">
          <div className="p-3 border-r bg-gray-50"></div>
          {dateRange.map(date => (
            <div key={date.toISOString()} className="p-3 border-r text-center">
              <div className="text-sm text-muted-foreground">
                {format(date, 'EEE')}
              </div>
              <div className={cn(
                "text-lg font-medium",
                isToday(date) && "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
              )}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="space-y-0">
        {timeSlots.filter((_, index) => index % 4 === 0).map(timeSlot => (
          <div key={timeSlot} className="grid grid-cols-8 min-h-[80px] border-b border-gray-100">
            <div className="p-3 border-r bg-gray-50 text-sm text-muted-foreground text-center flex items-center justify-center">
              {timeSlot}
            </div>
            {dateRange.map(date => {
              const dayBookings = viewBookings.filter(booking => 
                booking.bookingDate === format(date, 'yyyy-MM-dd') &&
                booking.startTime >= timeSlot &&
                booking.startTime < format(addMinutes(parseISO(`2000-01-01T${timeSlot}`), 60), 'HH:mm')
              );
              
              return (
                <div
                  key={`${date.toISOString()}-${timeSlot}`}
                  className="border-r p-2 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => handleSlotClick(date, timeSlot)}
                >
                  {dayBookings.map(booking => renderBookingEvent(booking))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // Month view
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1 h-full">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
          {day}
        </div>
      ))}
      {dateRange.map(date => {
        const dayBookings = viewBookings.filter(booking => 
          booking.bookingDate === format(date, 'yyyy-MM-dd')
        );
        
        return (
          <Card
            key={date.toISOString()}
            className={cn(
              "min-h-[120px] p-2 hover:bg-gray-50 cursor-pointer transition-colors",
              isToday(date) && "ring-2 ring-blue-500"
            )}
            onClick={() => {
              setCurrentDate(date);
              setViewMode('day');
            }}
          >
            <div className="text-sm font-medium mb-1">
              {format(date, 'd')}
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map(booking => (
                <div
                  key={booking.id}
                  className={cn(
                    "text-xs p-1 rounded border-l-2 truncate",
                    statusColors[booking.status]
                  )}
                >
                  {booking.startTime} - {booking.customerName}
                </div>
              ))}
              {dayBookings.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{dayBookings.length - 3} more
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Restaurant Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <h2 className="text-lg font-medium">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : viewMode === 'week' || viewMode === 'timeline'
              ? `${format(dateRange[0], 'MMM d')} - ${format(dateRange[6], 'MMM d, yyyy')}`
              : format(currentDate, 'EEEE, MMMM d, yyyy')
            }
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex border rounded-md">
            {[
              { mode: 'month' as ViewMode, icon: CalendarIcon, label: 'Month' },
              { mode: 'week' as ViewMode, icon: List, label: 'Week' },
              { mode: 'day' as ViewMode, icon: Grid, label: 'Day' },
              { mode: 'timeline' as ViewMode, icon: Users, label: 'Timeline' }
            ].map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Table Visibility Toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Tables ({visibleTables.size})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Visible Tables</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tables.map(table => (
                    <div key={table.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`table-${table.id}`}
                        checked={visibleTables.has(table.id)}
                        onCheckedChange={(checked) => {
                          const newVisible = new Set(visibleTables);
                          if (checked) {
                            newVisible.add(table.id);
                          } else {
                            newVisible.delete(table.id);
                          }
                          setVisibleTables(newVisible);
                        }}
                      />
                      <label
                        htmlFor={`table-${table.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Table {table.tableNumber} (Cap: {table.capacity})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* New Booking Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createBookingMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bookingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="guestCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guests</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time (Optional)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="tableId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tables.map((table) => (
                              <SelectItem key={table.id} value={table.id.toString()}>
                                Table {table.tableNumber} (Capacity: {table.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBookingMutation.isPending}>
                      {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderWeekView()}
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => 
              selectedBooking && updateBookingMutation.mutate({ id: selectedBooking.id, data })
            )} className="space-y-4">
              <FormField
                control={editForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="bookingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="guestCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guests</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id.toString()}>
                            Table {table.tableNumber} (Capacity: {table.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateBookingMutation.isPending}>
                  {updateBookingMutation.isPending ? "Updating..." : "Update Booking"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Status Legend */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">Status:</span>
            {Object.entries(statusColors).map(([status, colorClass]) => (
              <div key={status} className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded border-l-4", colorClass)} />
                <span className="capitalize">{status.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Drag bookings to reschedule • Click time slots to create new bookings
          </div>
        </div>
      </div>
    </div>
  );
}