import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/dashboard-sidebar";
import BookingCalendar from "@/components/booking-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, restaurant, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user || !restaurant) {
      setLocation("/login");
    }
  }, [user, restaurant, setLocation]);

  // Fetch today's bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "bookings", today],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurant?.id}/bookings?date=${today}`);
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Fetch all bookings for the month
  const { data: allBookings = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`],
    enabled: !!restaurant?.id && !!restaurant.tenantId,
  });

  // Fetch tables
  const { data: tables = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`],
    enabled: !!restaurant?.id && !!restaurant.tenantId,
  });

  const getAvailableTablesCount = () => {
    if (!tables || !todayBookings) return 0;
    const currentHour = new Date().getHours();
    const bookedTableIds = todayBookings
      .filter((booking: any) => {
        const bookingHour = new Date(booking.bookingDate).getHours();
        return Math.abs(bookingHour - currentHour) < 2; // Within 2 hours
      })
      .map((booking: any) => booking.tableId);

    return tables.filter((table: any) => !bookedTableIds.includes(table.id)).length;
  };

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'bookings', format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!restaurant
  });

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        bookings={(bookings as any) || []}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {format(selectedDate, 'EEEE dd MMMM yyyy')}
            </h1>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New booking
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Walk in
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Input 
              type="text" 
              placeholder="Customer search" 
              className="w-64"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Bookings</p>
                    <p className="text-2xl font-bold">
                      {todayBookings?.length || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tables</p>
                    <p className="text-2xl font-bold">
                      {tables?.length || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available Now</p>
                    <p className="text-2xl font-bold">
                      {getAvailableTablesCount()}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">
                      {allBookings?.length || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Booking Interface */}
        <div className="flex-1 p-6">
          <BookingCalendar 
            selectedDate={selectedDate}
            bookings={(bookings as any) || []}
            tables={(tables as any) || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}