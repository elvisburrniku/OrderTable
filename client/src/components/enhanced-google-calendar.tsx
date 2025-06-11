import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfDay, addMinutes, isSameDay, parseISO, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';

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
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  roomId?: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'table-timeline';
type LayoutMode = 'calendar' | 'timeline' | 'split';

const statusColors = {
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
  completed: 'bg-blue-100 border-blue-300 text-blue-800',
  'no-show': 'bg-gray-100 border-gray-300 text-gray-800'
};

const tableColors = [
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-pink-50 border-pink-200',
  'bg-cyan-50 border-cyan-200'
];

export function EnhancedGoogleCalendar() {
  const { tenantId } = useParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('timeline');
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch bookings
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/bookings`],
  });

  // Fetch tables
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/tables`],
  });

  // Generate time slots (30-minute intervals from 9 AM to 11 PM)
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

  // Generate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case 'month':
        const monthStart = startOfWeek(startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)));
        return Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
      case 'table-timeline':
        return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));
      default:
        return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Filter bookings for current view
  const viewBookings = useMemo(() => {
    return bookings.filter(booking => 
      dateRange.some(date => booking.bookingDate === format(date, 'yyyy-MM-dd'))
    );
  }, [bookings, dateRange]);

  // Get bookings for specific table and time slot
  const getBookingsForTableSlot = (tableId: number, date: Date, timeSlot: string) => {
    return viewBookings.filter(booking => 
      booking.tableId === tableId &&
      booking.bookingDate === format(date, 'yyyy-MM-dd') &&
      booking.startTime === timeSlot
    );
  };

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
      case 'table-timeline':
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
      case 'table-timeline':
        setCurrentDate(prev => addDays(prev, 7));
        break;
      case 'month':
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        break;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (booking: Booking) => {
    setDraggedBooking(booking);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, tableId: number, date: Date, timeSlot: string) => {
    e.preventDefault();
    if (draggedBooking) {
      // Here you would update the booking with new table/time
      console.log('Dropping booking', draggedBooking.id, 'to table', tableId, 'at', timeSlot);
      setDraggedBooking(null);
    }
  };

  // Render booking event
  const renderBookingEvent = (booking: Booking, tableIndex?: number) => (
    <div
      key={booking.id}
      draggable
      onDragStart={() => handleDragStart(booking)}
      className={cn(
        "p-2 rounded-md border-l-4 cursor-move text-xs mb-1 hover:shadow-md transition-shadow",
        statusColors[booking.status],
        tableIndex !== undefined && tableColors[tableIndex % tableColors.length]
      )}
    >
      <div className="font-medium truncate">{booking.customerName}</div>
      <div className="text-xs opacity-75">
        {booking.startTime} • {booking.guestCount} guests
      </div>
      {booking.tableId && (
        <div className="text-xs opacity-60">
          Table {tables.find(t => t.id === booking.tableId)?.tableNumber}
        </div>
      )}
    </div>
  );

  // Table Timeline View (Google Calendar Resources-like)
  const renderTableTimelineView = () => (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-1 gap-4">
        {/* Header with table columns */}
        <div className="grid grid-cols-[100px_1fr] gap-2 mb-4">
          <div className="text-sm font-medium text-center py-2">Time</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tables.length}, 1fr)` }}>
            {tables.map((table, index) => (
              <div
                key={table.id}
                className={cn(
                  "text-center py-2 rounded-md border text-sm font-medium",
                  tableColors[index % tableColors.length]
                )}
              >
                Table {table.tableNumber}
                <div className="text-xs opacity-60">Cap: {table.capacity}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots grid */}
        <div className="space-y-1">
          {timeSlots.map(timeSlot => (
            <div key={timeSlot} className="grid grid-cols-[100px_1fr] gap-2 min-h-[60px]">
              <div className="text-sm text-muted-foreground py-2 text-center border-r">
                {timeSlot}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tables.length}, 1fr)` }}>
                {tables.map((table, tableIndex) => (
                  <div
                    key={`${table.id}-${timeSlot}`}
                    className="border rounded-md p-1 min-h-[50px] hover:bg-gray-50 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, table.id, dateRange[0], timeSlot)}
                  >
                    {dateRange.map(date => 
                      getBookingsForTableSlot(table.id, date, timeSlot).map(booking =>
                        renderBookingEvent(booking, tableIndex)
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Week view similar to Google Calendar
  const renderWeekView = () => (
    <div className="h-full overflow-auto">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b mb-4">
        <div className="p-2 border-r bg-gray-50"></div>
        {dateRange.map(date => (
          <div key={date.toISOString()} className="p-2 border-r text-center">
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

      {/* Time grid */}
      <div className="space-y-1">
        {timeSlots.map(timeSlot => (
          <div key={timeSlot} className="grid grid-cols-8 min-h-[60px] border-b border-gray-100">
            <div className="p-2 border-r bg-gray-50 text-sm text-muted-foreground text-center">
              {timeSlot}
            </div>
            {dateRange.map(date => (
              <div
                key={`${date.toISOString()}-${timeSlot}`}
                className="border-r p-1 hover:bg-blue-50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedTable || tables[0]?.id || 0, date, timeSlot)}
                onClick={() => {
                  // Handle slot click for new booking
                  setIsCreateDialogOpen(true);
                }}
              >
                {viewBookings
                  .filter(booking => 
                    booking.bookingDate === format(date, 'yyyy-MM-dd') &&
                    booking.startTime === timeSlot
                  )
                  .map(booking => renderBookingEvent(booking))
                }
              </div>
            ))}
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
          >
            <div className="text-sm font-medium mb-1">
              {format(date, 'd')}
            </div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map(booking => (
                <div
                  key={booking.id}
                  className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
          <h2 className="text-lg">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : viewMode === 'week' || viewMode === 'table-timeline'
              ? `${format(dateRange[0], 'MMM d')} - ${format(dateRange[6], 'MMM d, yyyy')}`
              : format(currentDate, 'EEEE, MMMM d, yyyy')
            }
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex border rounded-md">
            {[
              { mode: 'month' as ViewMode, icon: Calendar as any, label: 'Month' },
              { mode: 'week' as ViewMode, icon: List, label: 'Week' },
              { mode: 'day' as ViewMode, icon: Grid, label: 'Day' },
              { mode: 'table-timeline' as ViewMode, icon: Grid, label: 'Tables' }
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

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                {/* Booking form would go here */}
                <p>Booking form implementation...</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden p-4">
        {viewMode === 'table-timeline' && renderTableTimelineView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderWeekView()} {/* Reuse week view for day */}
      </div>

      {/* Status Legend */}
      <div className="border-t p-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">Status:</span>
          {Object.entries(statusColors).map(([status, colorClass]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={cn("w-3 h-3 rounded border", colorClass)} />
              <span className="capitalize">{status.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}