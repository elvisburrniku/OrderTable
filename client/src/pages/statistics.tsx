import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Calendar as CalendarIcon2, DollarSign } from "lucide-react";


export default function Statistics() {
  const { user, restaurant } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2025, 4, 5)); // May 5, 2025
  const [dateTo, setDateTo] = useState<Date>(new Date(2025, 4, 6)); // May 6, 2025

  const { data: bookings } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'bookings'],
    enabled: !!restaurant
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/restaurants", restaurant?.id, "statistics"],
    enabled: !!restaurant?.id,
  });

  if (!user || !restaurant) {
    return null;
  }

  // Sample data for charts based on screenshots
  const bookingStatusData = [
    { name: 'Active', value: 100, color: '#10B981' }
  ];

  const bookingOriginData = [
    { name: 'Manual', value: 50, color: '#3B82F6' },
    { name: 'Google My Business', value: 50, color: '#EF4444' }
  ];

  const guestsPerDayData = [
    { date: '28/05/2025', guests: 1000 }
  ];

  const arrivalTimesBookingsData = [
    { time: '12:00', bookings: 1 },
    { time: '14:45', bookings: 1 }
  ];

  const arrivalTimesGuestsData = [
    { time: '12:00', guests: 1000 },
    { time: '14:45', guests: 2 }
  ];

  const groupSizesData = [
    { size: '2', count: 1 },
    { size: '1K', count: 1 }
  ];

  const bookingDurationsData = [
    { duration: '2 hours', count: 2 }
  ];

  const bookingCreationTimeData = [
    { hour: '12', online: 1, manual: 1 }
  ];

  const bookingTypeData = [
    { name: 'None', value: 100, color: '#F97316' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Statistics</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              <a href={`/${restaurant.tenantId}/bookings`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Bookings</span>
              </a>
              <a href={`/${restaurant.tenantId}/waiting-list`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Waiting List</span>
              </a>
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Statistics</span>
              </div>
              <a href={`/${restaurant.tenantId}/activity-log`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Log</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Statistics & Analytics</h1>
              <p className="text-sm text-gray-600">
                Monitor your restaurant's performance and booking trends.
              </p>
            </div>

            {isLoading ? (
              <div className="text-center text-gray-500 mt-8">Loading...</div>
            ) : stats ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <CalendarIcon2 className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Customers</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Table Utilization</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.tableUtilization?.toFixed(1) ?? '0.0'}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Booking Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.bookingsByStatus).map(([status, count]: [string, any]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={status === 'confirmed' ? 'default' : 'secondary'}>
                              {status}
                            </Badge>
                          </div>
                          <div className="font-medium">{count} bookings</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                Unable to load statistics
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}