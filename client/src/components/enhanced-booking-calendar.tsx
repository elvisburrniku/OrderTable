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
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

type ViewMode = 'month' | 'week' | 'day' | 'timeline';
type ResourceView = 'table' | 'waiter' | 'status';

interface EnhancedBookingCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  tables: Table[];
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
  tenantId: number;
  restaurantId: number;
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

export default function EnhancedBookingCalendar({
  selectedDate,
  bookings = [],
  tables = [],
  isLoading,
  onDateSelect,
  tenantId,
  restaurantId
}: EnhancedBookingCalendarProps) {
  console.log('EnhancedBookingCalendar props:', { selectedDate, bookings, tables, isLoading, tenantId, restaurantId });
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [resourceView, setResourceView] = useState<ResourceView>('table');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [draggedOverSlot, setDraggedOverSlot] = useState<{ date: Date; time: string; tableId?: number } | null>(null);
  const [visibleTables, setVisibleTables] = useState<Set<number>>(new Set());
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize visible tables when tables load
  React.useEffect(() => {
    if (tables.length > 0 && visibleTables.size === 0) {
      setVisibleTables(new Set(tables.map(t => t.id)));
    }
  }, [tables]);

  // Sync with parent selectedDate
  React.useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

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

  // Group bookings by date and table
  const groupedBookings = useMemo(() => {
    const grouped: Record<string, Record<number, Booking[]>> = {};
    
    bookings.forEach(booking => {
      const dateKey = format(parseISO(booking.bookingDate), 'yyyy-MM-dd');
      const tableId = booking.tableId || 0;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][tableId]) {
        grouped[dateKey][tableId] = [];
      }
      
      grouped[dateKey][tableId].push(booking);
    });
    
    return grouped;
  }, [bookings]);

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`, 'POST', data);
      if (!response.ok) throw new Error('Failed to create booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    }
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<BookingFormData>) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/${id}`, 'PATCH', data);
      if (!response.ok) throw new Error('Failed to update booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`] });
      setIsEditDialogOpen(false);
      setSelectedBooking(null);
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    }
  });

  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/${id}`, 'DELETE');
      if (!response.ok) throw new Error('Failed to delete booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`] });
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      bookingDate: format(selectedDate, 'yyyy-MM-dd'),
      startTime: selectedTimeSlot || '19:00',
      endTime: '',
      guestCount: 2,
      tableId: selectedTableId || undefined,
      notes: '',
    }
  });

  const editForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: selectedBooking ? {
      customerName: selectedBooking.customerName,
      customerEmail: selectedBooking.customerEmail,
      customerPhone: selectedBooking.customerPhone || '',
      bookingDate: selectedBooking.bookingDate,
      startTime: selectedBooking.startTime,
      endTime: selectedBooking.endTime || '',
      guestCount: selectedBooking.guestCount,
      tableId: selectedBooking.tableId,
      notes: selectedBooking.notes || '',
    } : {}
  });

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    let newDate: Date;
    switch (viewMode) {
      case 'day':
        newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
        break;
      case 'week':
      case 'timeline':
        newDate = addDays(currentDate, direction === 'next' ? 7 : -7);
        break;
      case 'month':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1);
        break;
      default:
        newDate = currentDate;
    }
    setCurrentDate(newDate);
    onDateSelect(newDate);
  };

  const handleCreateBooking = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  const handleUpdateBooking = (data: BookingFormData) => {
    if (selectedBooking) {
      updateBookingMutation.mutate({ id: selectedBooking.id, ...data });
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    editForm.reset({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone || '',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime || '',
      guestCount: booking.guestCount,
      tableId: booking.tableId,
      notes: booking.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleTimeSlotClick = (date: Date, time: string, tableId?: number) => {
    setSelectedTimeSlot(time);
    setSelectedTableId(tableId || null);
    form.reset({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      bookingDate: format(date, 'yyyy-MM-dd'),
      startTime: time,
      endTime: '',
      guestCount: 2,
      tableId: tableId,
      notes: '',
    });
    setIsCreateDialogOpen(true);
  };

  const getBookingAtTimeSlot = (date: Date, time: string, tableId: number) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const tableBookings = groupedBookings[dateKey]?.[tableId] || [];
    
    return tableBookings.find(booking => {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime || addMinutes(parseISO(`${booking.bookingDate}T${booking.startTime}`), 60).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return time >= bookingStart && time < bookingEnd;
    });
  };

  const renderTimelineView = () => {
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-[100px_1fr] border-b">
            <div className="p-2 bg-gray-50 border-r"></div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 1fr)` }}>
              {dateRange.map(date => (
                <div key={date.toISOString()} className="p-2 text-center border-r bg-gray-50">
                  <div className="font-medium">{format(date, 'EEE')}</div>
                  <div className={cn("text-sm", isToday(date) && "text-blue-600 font-semibold")}>
                    {format(date, 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table rows */}
          {filteredTables.map((table, tableIndex) => (
            <div key={table.id} className="grid grid-cols-[100px_1fr] border-b">
              <div className="p-2 bg-gray-50 border-r flex items-center">
                <div className="flex items-center space-x-2">
                  <div className={cn("w-3 h-3 rounded", tableColors[tableIndex % tableColors.length])}></div>
                  <span className="font-medium">Table {table.tableNumber}</span>
                  <span className="text-xs text-gray-500">({table.capacity})</span>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 1fr)` }}>
                {dateRange.map(date => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const tableBookings = groupedBookings[dateKey]?.[table.id] || [];
                  
                  return (
                    <div key={`${table.id}-${date.toISOString()}`} className="border-r min-h-[60px] p-1">
                      {tableBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={cn(
                            "p-1 mb-1 rounded text-xs cursor-pointer border-l-4",
                            statusColors[booking.status]
                          )}
                          onClick={() => handleBookingClick(booking)}
                        >
                          <div className="font-medium truncate">{booking.customerName}</div>
                          <div className="text-xs opacity-75">
                            {booking.startTime} • {booking.guestCount} guests
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs opacity-50 hover:opacity-100"
                        onClick={() => handleTimeSlotClick(date, '19:00', table.id)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                onDateSelect(today);
              }}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Grid className="h-4 w-4 mr-2" />
                  {viewMode === 'timeline' ? 'Timeline' : viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setViewMode('day')}>Day</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('week')}>Week</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('month')}>Month</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('timeline')}>Timeline</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Table Visibility */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Tables ({visibleTables.size}/{tables.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <h4 className="font-medium">Visible Tables</h4>
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
                      <label htmlFor={`table-${table.id}`} className="text-sm">
                        Table {table.tableNumber} ({table.capacity} seats)
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => handleTimeSlotClick(currentDate, '19:00')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'timeline' && renderTimelineView()}
      </CardContent>

      {/* Create Booking Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateBooking)} className="space-y-4">
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
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <FormField
                  control={form.control}
                  name="tableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select table" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tables.map(table => (
                            <SelectItem key={table.id} value={table.id.toString()}>
                              Table {table.tableNumber} ({table.capacity} seats)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateBooking)} className="space-y-4">
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
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <FormField
                  control={editForm.control}
                  name="tableId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select table" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tables.map(table => (
                            <SelectItem key={table.id} value={table.id.toString()}>
                              Table {table.tableNumber} ({table.capacity} seats)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (selectedBooking && confirm('Are you sure you want to delete this booking?')) {
                      deleteBookingMutation.mutate(selectedBooking.id);
                      setIsEditDialogOpen(false);
                    }
                  }}
                >
                  Delete
                </Button>
                <div className="flex space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateBookingMutation.isPending}>
                    {updateBookingMutation.isPending ? 'Updating...' : 'Update Booking'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}