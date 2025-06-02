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

export default function Statistics() {
  const { user, restaurant } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2025, 4, 5)); // May 5, 2025
  const [dateTo, setDateTo] = useState<Date>(new Date(2025, 4, 6)); // May 6, 2025

  const { data: bookings } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'bookings'],
    enabled: !!restaurant
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
              <a href="/bookings" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Bookings</span>
              </a>
              <a href="/waiting-list" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Waiting List</span>
              </a>
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Statistics</span>
              </div>
              <a href="/activity-log" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Log</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Statistics</h2>
              
              {/* Date Range Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                    </PopoverContent>
                  </Popover>
                  <span>-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="bookings" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="bookings">Bookings and guests</TabsTrigger>
                  <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
                  <TabsTrigger value="geography">Geography</TabsTrigger>
                  <TabsTrigger value="nps">NPS</TabsTrigger>
                </TabsList>

                <TabsContent value="bookings" className="space-y-6">
                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium">2 bookings, 1002 guests</h3>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Booking Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Booking status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={bookingStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {bookingStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Active</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Booking Origin */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Booking origin</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={bookingOriginData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {bookingOriginData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Manual</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Google My Business</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Guests per day */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Guests per day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={guestsPerDayData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Line type="monotone" dataKey="guests" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Arrival times charts */}
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Arrival times (bookings)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={arrivalTimesBookingsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis />
                              <Bar dataKey="bookings" fill="#6366F1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Arrival times (guests)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={arrivalTimesGuestsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" />
                              <YAxis />
                              <Bar dataKey="guests" fill="#6366F1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Guests</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Group sizes and Booking durations */}
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Group sizes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupSizesData} layout="horizontal">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="size" type="category" />
                              <Bar dataKey="count" fill="#6366F1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Booking durations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bookingDurationsData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="duration" />
                              <YAxis />
                              <Bar dataKey="count" fill="#6366F1" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Booking creation time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Booking creation time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={bookingCreationTimeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Bar dataKey="online" fill="#6366F1" />
                            <Bar dataKey="manual" fill="#EF4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Online</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Manual</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bottom charts */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Booking types */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Booking types</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={bookingTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {bookingTypeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">None</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tags */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center">
                          <span className="text-gray-500">No data</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="satisfaction">
                  <div className="text-center py-12 text-gray-500">
                    Satisfaction data not available
                  </div>
                </TabsContent>

                <TabsContent value="geography">
                  <div className="text-center py-12 text-gray-500">
                    Geography data not available
                  </div>
                </TabsContent>

                <TabsContent value="nps">
                  <div className="text-center py-12 text-gray-500">
                    NPS data not available
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}