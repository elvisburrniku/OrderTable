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
import EnhancedGoogleCalendar from "@/components/enhanced-google-calendar";
import BookingCalendar from "@/components/booking-calendar";

export default function Calendar() {
  const { restaurant } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("google");

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
  const selectedDateBookings = (bookings as any[]).filter((booking: any) => 
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
            restaurantId={restaurantId || 0}
            tenantId={tenantId}
            guestCount={2}
            isPublic={false}
          />
        );
      case 'google':
        return (
          <EnhancedGoogleCalendar 
            selectedDate={selectedDate}
            bookings={selectedDateBookings}
            allBookings={bookings as any[]}
            tables={tables as any[]}
            isLoading={bookingsLoading || tablesLoading}
            onDateSelect={setSelectedDate}
          />
        );
      case 'standard':
        return (
          <BookingCalendar 
            selectedDate={selectedDate}
            bookings={selectedDateBookings}
            allBookings={bookings as any[]}
            tables={tables as any[]}
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
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
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
      <Tabs value={calendarView} onValueChange={setCalendarView} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
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

        <TabsContent value="enhanced" className="flex-1">
          {renderCalendarView()}
        </TabsContent>

        <TabsContent value="google" className="flex-1">
          {renderCalendarView()}
        </TabsContent>

        <TabsContent value="standard" className="flex-1">
          {renderCalendarView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}