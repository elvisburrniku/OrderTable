import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Users, Grid, List, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import InteractiveBookingCalendar from "@/components/interactive-booking-calendar";
import GoogleCalendar from "@/components/google-calendar";
import BookingCalendar from "@/components/booking-calendar";

export default function Calendar() {
  const { restaurant } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("enhanced");

  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  // Fetch bookings for the selected date
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`],
    enabled: !!tenantId && !!restaurantId
  });

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
    enabled: !!tenantId && !!restaurantId
  });

  // Filter bookings for selected date
  const selectedDateBookings = bookings.filter((booking: any) => 
    isSameDay(new Date(booking.bookingDate), selectedDate)
  );

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCalendarView = () => {
    switch (calendarView) {
      case 'enhanced':
        return (
          <InteractiveBookingCalendar 
            selectedDate={selectedDate}
            bookings={selectedDateBookings}
            allBookings={bookings}
            tables={tables}
            isLoading={bookingsLoading || tablesLoading}
            onDateSelect={setSelectedDate}
          />
        );
      case 'google':
        return (
          <GoogleCalendar 
            selectedDate={selectedDate}
            bookings={selectedDateBookings}
            allBookings={bookings}
            tables={tables}
            isLoading={bookingsLoading || tablesLoading}
            onDateSelect={setSelectedDate}
          />
        );
      case 'standard':
        return (
          <BookingCalendar 
            selectedDate={selectedDate}
            bookings={selectedDateBookings}
            allBookings={bookings}
            tables={tables}
            isLoading={bookingsLoading || tablesLoading}
            onDateSelect={setSelectedDate}
          />
        );
      default:
        return null;
    }
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a restaurant to view the calendar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your restaurant bookings with advanced calendar views
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            {format(selectedDate, 'MMMM dd, yyyy')}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Calendar View Selector */}
      <Tabs value={calendarView} onValueChange={setCalendarView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enhanced" className="flex items-center space-x-2">
            <Grid className="w-4 h-4" />
            <span>Enhanced</span>
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Google Style</span>
          </TabsTrigger>
          <TabsTrigger value="standard" className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <span>Standard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Grid className="w-5 h-5" />
                <span>Enhanced Calendar View</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCalendarView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>Google Calendar Style</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCalendarView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <List className="w-5 h-5" />
                <span>Standard Calendar</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCalendarView()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Today's Bookings Summary */}
      {selectedDateBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Bookings for {format(selectedDate, 'MMMM dd, yyyy')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDateBookings.map((booking: any) => (
                <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{booking.customerName}</h4>
                    <Badge className={getBookingStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{booking.startTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{booking.guestCount} guests</span>
                    </div>
                    {booking.tableId && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Table {booking.tableId}</span>
                      </div>
                    )}
                  </div>
                  {booking.notes && (
                    <p className="text-xs text-gray-500 mt-2">{booking.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}