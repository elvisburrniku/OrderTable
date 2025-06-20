import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Calendar as CalendarIcon2,
  DollarSign,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  Palette,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion"; // Import framer-motion

export default function Statistics() {
  const { user, restaurant } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2025, 4, 5)); // May 5, 2025
  const [dateTo, setDateTo] = useState<Date>(new Date(2025, 4, 6)); // May 6, 2025

  const { data: bookings } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
    ],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/statistics`,
    ],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  if (!user || !restaurant) {
    return null;
  }

  // Generate real chart data based on actual bookings for this specific restaurant
  const generateBookingTrends = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentYear = new Date().getFullYear();
    const avgBookingValue = 75; // Average booking value in USD

    // If no bookings data, return empty data
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return months.map((month) => ({
        month: month.slice(0, 3),
        bookings: 0,
        revenue: 0,
      }));
    }

    // Filter bookings for this specific restaurant
    const restaurantBookings = bookings.filter(
      (booking) => booking.restaurantId === restaurant?.id,
    );

    return months.map((month, index) => {
      const monthBookings = restaurantBookings.filter((booking) => {
        const bookingDate = new Date(booking.bookingDate);
        return (
          bookingDate.getMonth() === index &&
          bookingDate.getFullYear() === currentYear
        );
      });

      // Calculate revenue based on guest count and average price per person
      const totalRevenue = monthBookings.reduce((sum, booking) => {
        return sum + (booking.guestCount || 2) * avgBookingValue;
      }, 0);

      return {
        month: month.slice(0, 3),
        bookings: monthBookings.length,
        revenue: Math.round(totalRevenue),
      };
    });
  };

  const bookingTrendsData = generateBookingTrends();

  // Generate booking status data based on actual bookings for this restaurant
  const generateBookingStatusData = () => {
    // If no bookings data, return empty data
    if (
      !bookings ||
      !Array.isArray(bookings) ||
      bookings.length === 0 ||
      !restaurant?.id
    ) {
      return [{ name: "No Data", value: 1, color: "#9CA3AF" }];
    }

    // Filter bookings for this specific restaurant
    const restaurantBookings = bookings.filter(
      (booking) => booking.restaurantId === restaurant.id,
    );

    if (restaurantBookings.length === 0) {
      return [{ name: "No Bookings", value: 1, color: "#9CA3AF" }];
    }

    // Group by status
    const statusCounts = restaurantBookings.reduce((acc: any, booking) => {
      const status = booking.status || "confirmed";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Convert to chart format
    return Object.entries(statusCounts).map(
      ([status, count]: [string, any]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color:
          status === "confirmed"
            ? "#10B981"
            : status === "pending"
              ? "#F59E0B"
              : status === "cancelled"
                ? "#EF4444"
                : "#6B7280",
      }),
    );
  };

  const bookingStatusData = generateBookingStatusData();

  // Generate table utilization based on actual bookings for this restaurant
  const generateTableUtilization = () => {
    const timeSlots = [
      "09:00",
      "11:00",
      "13:00",
      "15:00",
      "17:00",
      "19:00",
      "21:00",
      "23:00",
    ];
    const totalTables = stats?.totalTables || 1;

    // If no bookings data, return zero data
    if (
      !bookings ||
      !Array.isArray(bookings) ||
      bookings.length === 0 ||
      !restaurant?.id ||
      totalTables === 0
    ) {
      return timeSlots.map((time) => ({ time, utilization: 0 }));
    }

    // Filter bookings for this specific restaurant and last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const restaurantBookings = bookings.filter(
      (booking) =>
        booking.restaurantId === restaurant.id &&
        new Date(booking.bookingDate) >= thirtyDaysAgo &&
        booking.status !== "cancelled",
    );

    return timeSlots.map((time) => {
      const hour = parseInt(time.split(":")[0]);
      const bookingsAtTime = restaurantBookings.filter((booking) => {
        if (!booking.startTime) return false;
        const startHour = parseInt(booking.startTime.split(":")[0]);
        return Math.abs(startHour - hour) <= 1; // Include bookings within 1 hour
      });

      // Calculate average utilization over the 30-day period
      const avgBookingsAtThisTime = bookingsAtTime.length / 30;
      const utilization = Math.min(
        (avgBookingsAtThisTime / totalTables) * 100,
        100,
      );
      return { time, utilization: Math.round(utilization * 10) / 10 }; // Round to 1 decimal
    });
  };

  const tableUtilizationData = generateTableUtilization();

  // Generate daily bookings based on actual data for this restaurant
  const generateDailyBookings = () => {
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyCounts = new Array(7).fill(0);

    // If no bookings data, return sample data for demonstration
    if (
      !bookings ||
      !Array.isArray(bookings) ||
      bookings.length === 0 ||
      !restaurant?.id
    ) {
      return [
        { day: "Sun", bookings: 8 },
        { day: "Mon", bookings: 12 },
        { day: "Tue", bookings: 15 },
        { day: "Wed", bookings: 18 },
        { day: "Thu", bookings: 22 },
        { day: "Fri", bookings: 25 },
        { day: "Sat", bookings: 20 },
      ];
    }

    // Filter bookings for this specific restaurant
    const restaurantBookings = bookings.filter(
      (booking) =>
        booking.restaurantId === restaurant.id &&
        booking.status !== "cancelled",
    );

    console.log(
      "Processing restaurant bookings for daily chart:",
      restaurantBookings.length,
    );

    restaurantBookings.forEach((booking) => {
      try {
        const bookingDate = new Date(booking.bookingDate);
        const dayOfWeek = bookingDate.getDay();
        if (dayOfWeek >= 0 && dayOfWeek <= 6) {
          dailyCounts[dayOfWeek]++;
        }
      } catch (error) {
        console.error(
          "Error processing booking date:",
          booking.bookingDate,
          error,
        );
      }
    });

    console.log("Daily counts:", dailyCounts);

    return dayLabels.map((day, index) => ({
      day,
      bookings: dailyCounts[index],
    }));
  };

  const dailyBookingsData = generateDailyBookings();

  // Generate revenue data based on booking trends
  const revenueData = bookingTrendsData.map((item) => ({
    month: item.month,
    revenue: item.revenue,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6">
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <CalendarIcon2 className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Bookings
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats.totalBookings}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Customers
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats.totalCustomers}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Table Utilization
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats.tableUtilization?.toFixed(1) ?? "0.0"}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Monthly Revenue
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${(stats.monthlyRevenue ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">
                          Monthly Bookings
                        </p>
                        <p className="text-3xl font-bold text-blue-600">
                          {stats.monthlyBookings ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">
                          Avg Bookings/Day
                        </p>
                        <p className="text-3xl font-bold text-green-600">
                          {stats.avgBookingsPerDay ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">
                          Total Tables
                        </p>
                        <p className="text-3xl font-bold text-purple-600">
                          {stats.totalTables ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Trends Chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
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
                          <Line
                            type="monotone"
                            dataKey="bookings"
                            stroke="#3B82F6"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Revenue Chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
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
                          <Tooltip
                            formatter={(value) => [`$${value}`, "Revenue"]}
                          />
                          <Bar dataKey="revenue" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Table Utilization Over Time */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
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
                          <Tooltip
                            formatter={(value) => [`${value}%`, "Utilization"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="utilization"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Daily Bookings */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Bookings by Day of Week</CardTitle>
                      <p className="text-sm text-gray-600">
                        Total data points: {dailyBookingsData?.length || 0}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {dailyBookingsData && dailyBookingsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={dailyBookingsData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip
                              formatter={(value, name) => [
                                `${value} bookings`,
                                "Bookings",
                              ]}
                              labelFormatter={(label) => `${label}`}
                            />
                            <Bar
                              dataKey="bookings"
                              fill="#F59E0B"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                          No booking data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Booking Status Pie Chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
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
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              ></div>
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <div className="font-medium">
                              {entry.value} bookings
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Unable to load statistics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}