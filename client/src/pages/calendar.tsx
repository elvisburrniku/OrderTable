import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay, startOfDay, endOfDay, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, addMinutes, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users, MapPin, Edit, Trash2, MoreVertical, Coffee, Utensils, Star, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EnhancedCalendarFeatures, CalendarToolbar, BookingConflictDetector } from "@/components/enhanced-calendar-features";

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
  status: 'confirmed' | 'pending' | 'cancelled';
  bookingType?: string;
  createdAt: string;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  roomId?: number;
}

const bookingFormSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  bookingDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  guestCount: z.number().min(1, "Guest count must be at least 1"),
  tableId: z.number().optional(),
  bookingType: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

type ViewMode = 'week' | 'month' | 'day';

export default function CalendarPage() {
  const { tenantId } = useParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [draggedOverSlot, setDraggedOverSlot] = useState<{ date: Date; time: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    guestCount: "all",
    timeRange: "all",
    table: "all",
    bookingType: "all"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Time slots for the calendar (30-minute intervals from 9 AM to 11 PM)
  const timeSlots = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`, currentDate, viewMode],
    queryFn: async () => {
      const dateRange = getDateRange();
      const startDate = format(dateRange[0], 'yyyy-MM-dd');
      const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');
      
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings?startDate=${startDate}&endDate=${endDate}`, "GET");
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
    enabled: !!tenantId,
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/tables`],
    enabled: !!tenantId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings`, "POST", {
        ...data,
        restaurantId: 22,
        tenantId: parseInt(tenantId!),
      });
      if (!response.ok) {
        throw new Error(`Failed to create booking: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`] });
      setIsCreateDialogOpen(false);
      toast({ title: "Booking created successfully" });
    },
    onError: (error) => {
      console.error("Booking creation error:", error);
      toast({ title: "Failed to create booking", variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BookingFormData> }) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings/${id}`, "PATCH", data);
      if (!response.ok) {
        throw new Error(`Failed to update booking: ${response.status}`);
      }
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

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/bookings/${id}`, "DELETE");
      if (!response.ok) {
        throw new Error(`Failed to delete booking: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`] });
      toast({ title: "Booking deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete booking", variant: "destructive" });
    },
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      bookingDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: "19:00",
      endTime: "",
      guestCount: 2,
      tableId: undefined,
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

  // Update form values when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen && selectedDate && selectedTimeSlot) {
      form.setValue('bookingDate', format(selectedDate, 'yyyy-MM-dd'));
      form.setValue('startTime', selectedTimeSlot);
    }
  }, [isCreateDialogOpen, selectedDate, selectedTimeSlot, form]);

  // Update edit form when selectedBooking changes
  useEffect(() => {
    if (selectedBooking && isEditDialogOpen) {
      editForm.reset({
        customerName: selectedBooking.customerName,
        customerEmail: selectedBooking.customerEmail,
        customerPhone: selectedBooking.customerPhone || "",
        bookingDate: selectedBooking.bookingDate,
        startTime: selectedBooking.startTime,
        endTime: selectedBooking.endTime || "",
        guestCount: selectedBooking.guestCount,
        tableId: selectedBooking.tableId || undefined,
        notes: selectedBooking.notes || "",
      });
    }
  }, [selectedBooking, isEditDialogOpen, editForm]);

  // Get the date range for the current view
  const getDateRange = useCallback(() => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      default:
        return [currentDate];
    }
  }, [currentDate, viewMode]);

  const dateRange = getDateRange();

  // Filter and search bookings using useMemo to prevent infinite re-renders
  const displayBookings = useMemo(() => {
    if (!bookings) return [];
    
    let filtered = [...bookings];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.notes && booking.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Apply guest count filter
    if (filters.guestCount !== "all") {
      const range = filters.guestCount;
      filtered = filtered.filter(booking => {
        if (range === "1-2") return booking.guestCount >= 1 && booking.guestCount <= 2;
        if (range === "3-4") return booking.guestCount >= 3 && booking.guestCount <= 4;
        if (range === "5-6") return booking.guestCount >= 5 && booking.guestCount <= 6;
        if (range === "7+") return booking.guestCount >= 7;
        return true;
      });
    }

    // Apply time range filter
    if (filters.timeRange !== "all") {
      filtered = filtered.filter(booking => {
        const hour = parseInt(booking.startTime.split(':')[0]);
        if (filters.timeRange === "morning") return hour >= 9 && hour < 12;
        if (filters.timeRange === "afternoon") return hour >= 12 && hour < 17;
        if (filters.timeRange === "evening") return hour >= 17 && hour < 22;
        if (filters.timeRange === "late") return hour >= 22;
        return true;
      });
    }

    // Apply booking type filter
    if (filters.bookingType !== "all") {
      filtered = filtered.filter(booking => booking.bookingType === filters.bookingType);
    }

    return filtered;
  }, [bookings, searchQuery, filters.status, filters.guestCount, filters.timeRange, filters.table, filters.bookingType]);

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
        setCurrentDate(prev => subWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => addDays(startOfMonth(prev), -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => addDays(endOfMonth(prev), 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get bookings for a specific date and time
  const getBookingsForSlot = (date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return displayBookings.filter((booking) => {
      if (booking.bookingDate !== dateStr) return false;
      
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime || addMinutesToTime(booking.startTime, 120); // Default 2 hours
      
      return isTimeInRange(timeSlot, bookingStart, bookingEnd);
    });
  };

  // Utility function to add minutes to a time string
  const addMinutesToTime = (timeStr: string, minutes: number) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Check if a time is within a range
  const isTimeInRange = (time: string, start: string, end: string) => {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get booking type icon and color
  const getBookingTypeIcon = (bookingType?: string) => {
    switch (bookingType) {
      case 'lunch':
        return Coffee;
      case 'dinner':
        return Utensils;
      case 'brunch':
        return Coffee;
      case 'private_event':
        return PartyPopper;
      case 'special_occasion':
        return Star;
      default:
        return CalendarIcon;
    }
  };

  const getBookingTypeColor = (bookingType?: string) => {
    switch (bookingType) {
      case 'lunch':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'dinner':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'brunch':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'private_event':
        return 'bg-pink-100 border-pink-300 text-pink-800';
      case 'special_occasion':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Handle creating a new booking
  const handleCreateBooking = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(time);
    form.reset({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      bookingDate: format(date, 'yyyy-MM-dd'),
      startTime: time,
      endTime: addMinutesToTime(time, 120),
      guestCount: 2,
      bookingType: "regular",
      notes: "",
    });
    setIsCreateDialogOpen(true);
  };

  // Handle editing a booking
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
      bookingType: booking.bookingType || "regular",
      notes: booking.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle drag and drop
  const handleDragStart = (booking: Booking) => {
    setDraggedBooking(booking);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    setDraggedOverSlot({ date, time });
  };

  const handleDragLeave = () => {
    setDraggedOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, date: Date, time: string, tableId?: number) => {
    e.preventDefault();
    if (draggedBooking) {
      const updateData: any = {
        bookingDate: format(date, 'yyyy-MM-dd'),
        startTime: time,
      };
      
      // If dropping in week view with table assignment
      if (tableId !== undefined) {
        updateData.tableId = tableId;
      }
      
      updateBookingMutation.mutate({
        id: draggedBooking.id,
        data: updateData,
      });
    }
    setDraggedBooking(null);
    setDraggedOverSlot(null);
  };

  // Render booking card
  const renderBooking = (booking: Booking) => {
    const table = tables.find((t) => t.id === booking.tableId);
    const BookingTypeIcon = getBookingTypeIcon(booking.bookingType);
    const bookingTypeColor = getBookingTypeColor(booking.bookingType);
    
    return (
      <Card
        key={booking.id}
        draggable
        onDragStart={() => handleDragStart(booking)}
        onClick={(e) => {
          e.stopPropagation();
          handleEditBooking(booking);
        }}
        className={cn(
          "mb-1 p-2 cursor-pointer hover:shadow-md transition-shadow border-l-4",
          bookingTypeColor,
          booking.status === 'confirmed' && "border-l-green-500",
          booking.status === 'pending' && "border-l-yellow-500",
          booking.status === 'cancelled' && "border-l-red-500"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookingTypeIcon className="w-3 h-3" />
              <p className="text-sm font-medium truncate">{booking.customerName}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{booking.startTime}</span>
              {booking.endTime && <span>- {booking.endTime}</span>}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{booking.guestCount} guests</span>
              {table && (
                <>
                  <MapPin className="w-3 h-3 ml-1" />
                  <span>Table {table.tableNumber}</span>
                </>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleEditBooking(booking);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBookingMutation.mutate(booking.id);
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  };

  // Render time slot
  const renderTimeSlot = (date: Date, timeSlot: string) => {
    const slotBookings = getBookingsForSlot(date, timeSlot);
    const isDraggedOver = draggedOverSlot && 
      isSameDay(draggedOverSlot.date, date) && 
      draggedOverSlot.time === timeSlot;

    return (
      <div
        key={`${format(date, 'yyyy-MM-dd')}-${timeSlot}`}
        className={cn(
          "min-h-[80px] p-2 cursor-pointer transition-colors",
          slotBookings.length === 0 && "hover:bg-blue-50",
          isDraggedOver && "bg-blue-100 border-blue-300"
        )}
        onClick={() => slotBookings.length === 0 && handleCreateBooking(date, timeSlot)}
        onDragOver={(e) => handleDragOver(e, date, timeSlot)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, date, timeSlot)}
      >
        <div className="space-y-1">
          {slotBookings.map(renderBooking)}
        </div>
        {slotBookings.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            Click to add booking
          </div>
        )}
      </div>
    );
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Features */}
      <div className="p-4 border-b">
        <EnhancedCalendarFeatures
          bookings={bookings}
          onFilterChange={setFilters}
          onSearch={setSearchQuery}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
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
          <h2 className="text-xl font-semibold">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : viewMode === 'week'
                ? `${format(dateRange[0], 'MMM d')} - ${format(dateRange[6], 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM d, yyyy')
            }
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Booking Type Filter */}
          <Select value={filters.bookingType} onValueChange={(value) => setFilters(prev => ({ ...prev, bookingType: value }))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Regular
                </div>
              </SelectItem>
              <SelectItem value="lunch">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  Lunch
                </div>
              </SelectItem>
              <SelectItem value="dinner">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Dinner
                </div>
              </SelectItem>
              <SelectItem value="brunch">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  Brunch
                </div>
              </SelectItem>
              <SelectItem value="private_event">
                <div className="flex items-center gap-2">
                  <PartyPopper className="w-4 h-4" />
                  Private Event
                </div>
              </SelectItem>
              <SelectItem value="special_occasion">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Special Occasion
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Booking</DialogTitle>
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
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                    control={form.control}
                    name="bookingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue="regular">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select booking type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="brunch">Brunch</SelectItem>
                            <SelectItem value="private_event">Private Event</SelectItem>
                            <SelectItem value="special_occasion">Special Occasion</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tableId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
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
                      {createBookingMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'week' && (
          <div className="h-full flex flex-col">
            {/* Week header with tables */}
            <div className="border-b bg-gray-50">
              <div className="grid grid-cols-8 border-b">
                <div className="p-2 border-r"></div>
                {dateRange.map((date) => (
                  <div key={date.toISOString()} className="p-2 border-r text-center">
                    <div className="text-sm text-muted-foreground">
                      {format(date, 'EEE')}
                    </div>
                    <div className={cn(
                      "text-lg font-medium",
                      isToday(date) && "text-primary"
                    )}>
                      {format(date, 'd')}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Table headers */}
              <div className="grid grid-cols-8 text-xs">
                <div className="p-1 border-r text-center font-medium">Tables</div>
                {dateRange.map((date) => (
                  <div key={`tables-${date.toISOString()}`} className="border-r">
                    <div className="grid grid-cols-3 gap-px p-1">
                      {tables.slice(0, 3).map((table) => (
                        <div key={table.id} className="text-center text-xs bg-white rounded px-1 py-0.5">
                          T{table.tableNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Time slots with table columns */}
            <div className="flex-1 overflow-y-auto">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 border-b min-h-[60px]">
                  <div className="p-2 border-r bg-gray-50 text-sm text-muted-foreground text-center">
                    {timeSlot}
                  </div>
                  {dateRange.map((date) => (
                    <div key={`${date.toISOString()}-${timeSlot}`} className="border-r">
                      <div className="grid grid-cols-3 gap-px h-full p-1">
                        {tables.slice(0, 3).map((table) => {
                          const tableBookings = displayBookings.filter(booking => 
                            booking.bookingDate === format(date, 'yyyy-MM-dd') &&
                            isTimeInRange(booking.startTime, timeSlot, addMinutesToTime(timeSlot, 60)) &&
                            booking.tableId === table.id
                          );
                          
                          return (
                            <div
                              key={`${table.id}-${timeSlot}`}
                              className="bg-white border border-gray-200 rounded p-1 cursor-pointer hover:bg-gray-50 min-h-[50px] relative"
                              onDragOver={(e) => handleDragOver(e, date, timeSlot)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, date, timeSlot, table.id)}
                              onClick={() => handleCreateBooking(date, timeSlot)}
                            >
                              {tableBookings.map((booking) => {
                                const BookingTypeIcon = getBookingTypeIcon(booking.bookingType);
                                return (
                                  <div
                                    key={booking.id}
                                    className={cn(
                                      "text-xs p-1 rounded mb-1 cursor-pointer border-l-2",
                                      getBookingTypeColor(booking.bookingType),
                                      booking.status === 'confirmed' && "border-l-green-500",
                                      booking.status === 'pending' && "border-l-yellow-500",
                                      booking.status === 'cancelled' && "border-l-red-500"
                                    )}
                                    draggable
                                    onDragStart={() => handleDragStart(booking)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditBooking(booking);
                                    }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <BookingTypeIcon className="w-2 h-2" />
                                      <span className="truncate font-medium">{booking.customerName}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {booking.startTime} • {booking.guestCount}p
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="h-full flex flex-col">
            {/* Day header */}
            <div className="grid grid-cols-[120px_1fr] border-b bg-gray-50">
              <div className="p-3 border-r"></div>
              <div className="p-3 text-center">
                <div className="text-sm text-muted-foreground">
                  {format(currentDate, 'EEEE')}
                </div>
                <div className={cn(
                  "text-lg font-medium",
                  isToday(currentDate) && "text-primary"
                )}>
                  {format(currentDate, 'MMMM d, yyyy')}
                </div>
              </div>
            </div>
            
            {/* Time slots */}
            <div className="flex-1 overflow-y-auto">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-[120px_1fr] border-b min-h-[80px] hover:bg-gray-25">
                  <div className="p-3 border-r bg-gray-50 text-sm text-muted-foreground text-center flex items-center justify-center">
                    {timeSlot}
                  </div>
                  <div className="relative">
                    {renderTimeSlot(currentDate, timeSlot)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dateRange.map((date) => {
                const dayBookings = displayBookings.filter((booking) => 
                  booking.bookingDate === format(date, 'yyyy-MM-dd')
                );
                
                return (
                  <Card
                    key={date.toISOString()}
                    className={cn(
                      "min-h-[120px] p-2 hover:bg-gray-50 cursor-pointer transition-colors",
                      isToday(date) && "ring-2 ring-primary"
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
                      {dayBookings.slice(0, 3).map((booking: Booking) => (
                        <div
                          key={booking.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
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
          </div>
        )}
      </div>

      {/* Edit Dialog */}
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
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                name="bookingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select booking type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="brunch">Brunch</SelectItem>
                        <SelectItem value="private_event">Private Event</SelectItem>
                        <SelectItem value="special_occasion">Special Occasion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                  {updateBookingMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}