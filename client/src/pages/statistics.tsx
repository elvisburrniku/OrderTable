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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend } from "recharts";
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
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/statistics`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  if (!user || !restaurant) {
    return null;
  }

  // Chart data
  const bookingTrendsData = [
    { month: 'Jan', bookings: 12, revenue: 1800 },
    { month: 'Feb', bookings: 19, revenue: 2850 },
    { month: 'Mar', bookings: 15, revenue: 2250 },
    { month: 'Apr', bookings: 25, revenue: 3750 },
    { month: 'May', bookings: stats?.totalBookings || 6, revenue: stats?.monthlyRevenue || 300 },
    { month: 'Jun', bookings: 0, revenue: 0 }
  ];

  const bookingStatusData = stats?.bookingsByStatus ? 
    Object.entries(stats.bookingsByStatus).map(([status, count]: [string, any]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'confirmed' ? '#10B981' : status === 'pending' ? '#F59E0B' : '#EF4444'
    })) : [
      { name: 'Confirmed', value: stats?.totalBookings || 6, color: '#10B981' }
    ];

  const tableUtilizationData = [
    { time: '09:00', utilization: 20 },
    { time: '11:00', utilization: 45 },
    { time: '13:00', utilization: 85 },
    { time: '15:00', utilization: 60 },
    { time: '17:00', utilization: 40 },
    { time: '19:00', utilization: 95 },
    { time: '21:00', utilization: 70 },
    { time: '23:00', utilization: 30 }
  ];

  const dailyBookingsData = [
    { day: 'Mon', bookings: 8 },
    { day: 'Tue', bookings: 12 },
    { day: 'Wed', bookings: 6 },
    { day: 'Thu', bookings: 15 },
    { day: 'Fri', bookings: 22 },
    { day: 'Sat', bookings: 18 },
    { day: 'Sun', bookings: 14 }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 1800 },
    { month: 'Feb', revenue: 2850 },
    { month: 'Mar', revenue: 2250 },
    { month: 'Apr', revenue: 3750 },
    { month: 'May', revenue: stats?.monthlyRevenue || 300 },
    { month: 'Jun', revenue: 0 }
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
                          <p className="text-2xl font-bold text-gray-900">${(stats.monthlyRevenue ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Monthly Bookings</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.monthlyBookings ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Avg Bookings/Day</p>
                        <p className="text-3xl font-bold text-green-600">{stats.avgBookingsPerDay ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Total Tables</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.totalTables ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Booking Trends Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Booking Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={bookingTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="bookings" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Revenue Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Table Utilization Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Table Utilization Throughout the Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={tableUtilizationData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                          <Line type="monotone" dataKey="utilization" stroke="#8B5CF6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Daily Bookings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Bookings by Day of Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyBookingsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="bookings" fill="#F59E0B" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Booking Status Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row items-center justify-between">
                      <div className="w-full lg:w-1/2">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={bookingStatusData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {bookingStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full lg:w-1/2 space-y-3">
                        {bookingStatusData.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              ></div>
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <div className="font-medium">{entry.value} bookings</div>
                          </div>
                        ))}
                      </div>
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