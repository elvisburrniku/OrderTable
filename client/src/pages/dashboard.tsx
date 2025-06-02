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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, restaurant, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!user || !restaurant) {
      setLocation("/login");
    }
  }, [user, restaurant, setLocation]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'bookings', format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!restaurant
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'tables'],
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
