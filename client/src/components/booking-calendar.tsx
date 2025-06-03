
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { List, Table, Calendar, Users, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";

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
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    startTime: "19:00",
    endTime: "21:00",
    tableId: "",
    notes: ""
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest("POST", `/api/tenants/1/restaurants/${restaurant?.id}/bookings`, bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/1/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/1/restaurants/${restaurant?.id}/customers`] 
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        startTime: "19:00",
        endTime: "21:00",
        tableId: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    }
  });

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate guest count against selected table capacity if a table is selected
    if (newBooking.tableId && tables) {
      const selectedTable = tables.find(t => t.id.toString() === newBooking.tableId);
      if (selectedTable && newBooking.guestCount > selectedTable.capacity) {
        toast({
          title: "Error",
          description: `Selected table can only accommodate ${selectedTable.capacity} guests. You have ${newBooking.guestCount} guests.`,
          variant: "destructive"
        });
        return;
      }
    }

    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: selectedDate.toISOString(),
      tableId: newBooking.tableId ? parseInt(newBooking.tableId) : null,
      restaurantId: restaurant?.id
    });
  };

  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
  ];

  const getBookingForTableAndTime = (tableId: number, time: string) => {
    return bookings.find(booking => 
      booking.tableId === tableId && booking.startTime === time
    );
  };

  const getBookingsForDate = (date: Date) => {
    const bookingsToUse = activeView === 'calendar' ? allBookings : bookings;
    return bookingsToUse.filter(booking => 
      isSameDay(new Date(booking.bookingDate), date)
    );
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
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-2 border rounded cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-green-100 border-green-300' 
                    : isTodayDate 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onDateSelect(day)}
              >
                <div className={`text-sm font-medium ${
                  isTodayDate ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="mt-1 space-y-1">
                  {dayBookings.slice(0, 2).map(booking => (
                    <div
                      key={booking.id}
                      className="text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded truncate"
                      title={`${booking.customerName} - ${booking.guestCount} guests at ${booking.startTime}`}
                    >
                      {booking.startTime} {booking.customerName}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 2} more
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

  const renderListView = () => (
    <Card className="bg-white border border-gray-200">
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <h3 className="font-medium text-gray-900">
          Bookings for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <span className="text-sm text-gray-500">
          {bookings.length} bookings - {bookings.reduce((sum, b) => sum + b.guestCount, 0)} guests
        </span>
      </div>

      <CardContent className="p-0">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No bookings for this date
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bookings.map(booking => (
              <div key={booking.id} className="p-4 hover:bg-gray-50">
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
                      {booking.tableId && (
                        <span>Table {tables.find(t => t.id === booking.tableId)?.tableNumber}</span>
                      )}
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

  const renderTableView = () => (
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
          {tables.slice(0, 8).map((table) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );

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
          <Button 
            variant={activeView === "table" ? "default" : "ghost"}
            onClick={() => setActiveView("table")}
            className={activeView === "table" ? "bg-green-600 text-white" : ""}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>

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
                <Input
                  id="customerPhone"
                  value={newBooking.customerPhone}
                  onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
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
                  <Select value={newBooking.startTime} onValueChange={(value) => setNewBooking({ ...newBooking, startTime: value })}>
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
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tableId">Table (Optional)</Label>
                <Select value={newBooking.tableId} onValueChange={(value) => setNewBooking({ ...newBooking, tableId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={tables?.length > 0 ? "Auto-assign" : "No tables available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tables && tables.length > 0 ? (
                      tables.map((table) => (
                        <SelectItem key={table.id} value={table.id.toString()}>
                          Table {table.tableNumber} ({table.capacity} seats)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No tables configured
                      </SelectItem>
                    )}
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

      {/* Render based on active view */}
      {activeView === "calendar" && renderCalendarView()}
      {activeView === "list" && renderListView()}
      {activeView === "table" && renderTableView()}

      <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-600 rounded mr-2" />
          <span>Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2" />
          <span>Bookings</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2" />
          <span>Fully booked</span>
        </div>
      </div>
    </div>
  );
}
