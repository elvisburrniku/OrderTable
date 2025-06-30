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
  AreaChart,
  Area,
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
  Activity,
  Target,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Star,
  Award,
  Sparkles,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Statistics() {
  const { user, restaurant } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2025, 4, 5)); // May 5, 2025
  const [dateTo, setDateTo] = useState<Date>(new Date(2025, 4, 6)); // May 6, 2025
  const [activeMetric, setActiveMetric] = useState<string>('overview');

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
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
      return [{ name: "No Data", value: 1, color: "#64748B" }];
    }

    // Filter bookings for this specific restaurant
    const restaurantBookings = bookings.filter(
      (booking) => booking.restaurantId === restaurant.id,
    );

    if (restaurantBookings.length === 0) {
      return [{ name: "No Bookings", value: 1, color: "#64748B" }];
    }

    // Group by status
    const statusCounts = restaurantBookings.reduce((acc: any, booking) => {
      const status = booking.status || "confirmed";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Convert to chart format with professional colors
    return Object.entries(statusCounts).map(
      ([status, count]: [string, any]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color:
          status === "confirmed"
            ? "#0F172A"
            : status === "pending"
              ? "#64748B"
              : status === "cancelled"
                ? "#94A3B8"
                : "#CBD5E1",
      }),
    );
  };

  const bookingStatusData = generateBookingStatusData();

  // Generate table utilization based on actual bookings for this restaurant
  const generateTableUtilization = () => {
    const timeSlots = [
      "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00", "23:00",
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

  const StatCard = ({ icon: Icon, title, value, subtitle, delay }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group"
    >
      <Card className="bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">
                {title}
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-slate-400">{subtitle}</p>
              )}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <Icon className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <motion.div 
        className="bg-white border-b border-slate-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <motion.h1 
                className="text-2xl font-semibold text-slate-900 flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <BarChart3 className="w-6 h-6 text-slate-700" />
                <span>Analytics Dashboard</span>
              </motion.h1>
              <motion.p 
                className="text-slate-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Performance insights and metrics for your restaurant
              </motion.p>
            </div>

            {/* Controls */}
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-8">
          {isLoading ? (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-slate-400 animate-spin" />
              <p className="text-slate-600">Loading analytics data...</p>
            </motion.div>
          ) : stats ? (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={CalendarIcon2}
                  title="Total Bookings"
                  value={stats.totalBookings?.toLocaleString() || "0"}
                  subtitle="All-time bookings"
                  delay={0}
                />
                <StatCard
                  icon={Users}
                  title="Total Customers"
                  value={stats.totalCustomers?.toLocaleString() || "0"}
                  subtitle="Unique customers served"
                  delay={0.1}
                />
                <StatCard
                  icon={Target}
                  title="Table Utilization"
                  value={`${stats.tableUtilization?.toFixed(1) || "0.0"}%`}
                  subtitle="Current efficiency"
                  delay={0.2}
                />
                <StatCard
                  icon={DollarSign}
                  title="Monthly Revenue"
                  value={`$${(stats.monthlyRevenue || 0).toLocaleString()}`}
                  subtitle="This month's earnings"
                  delay={0.3}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={Activity}
                  title="Monthly Bookings"
                  value={stats.monthlyBookings?.toLocaleString() || "0"}
                  subtitle="This month"
                  delay={0.4}
                />
                <StatCard
                  icon={Clock}
                  title="Avg Bookings/Day"
                  value={stats.avgBookingsPerDay?.toFixed(1) || "0.0"}
                  subtitle="Daily average"
                  delay={0.5}
                />
                <StatCard
                  icon={Award}
                  title="Total Tables"
                  value={stats.totalTables?.toLocaleString() || "0"}
                  subtitle="Available tables"
                  delay={0.6}
                />
              </div>

              {/* Charts Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Tabs value={activeMetric} onValueChange={setActiveMetric} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4 bg-white border border-slate-200">
                    {[
                      { value: "overview", label: "Overview", icon: BarChart3 },
                      { value: "bookings", label: "Bookings", icon: CalendarIcon2 },
                      { value: "revenue", label: "Revenue", icon: DollarSign },
                      { value: "utilization", label: "Utilization", icon: PieChartIcon }
                    ].map((tab) => (
                      <TabsTrigger 
                        key={tab.value}
                        value={tab.value}
                        className="flex items-center space-x-2 data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900"
                      >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <AnimatePresence mode="wait">
                    <TabsContent value="overview" className="space-y-6">
                      <motion.div 
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Booking Trends Chart */}
                        <Card className="bg-white border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                              <TrendingUp className="w-5 h-5 text-slate-600" />
                              <span>Booking Trends</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={bookingTrendsData}>
                                <defs>
                                  <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0.02}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                                <YAxis stroke="#64748B" fontSize={12} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="bookings"
                                  stroke="#0F172A"
                                  strokeWidth={2}
                                  fill="url(#bookingGradient)"
                                  dot={{ fill: '#0F172A', strokeWidth: 2, r: 3 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* Booking Status Chart */}
                        <Card className="bg-white border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                              <PieChartIcon className="w-5 h-5 text-slate-600" />
                              <span>Booking Status</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={bookingStatusData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {bookingStatusData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.color}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="bookings" className="space-y-6">
                      <motion.div 
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Daily Bookings */}
                        <Card className="bg-white border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                              <CalendarIcon2 className="w-5 h-5 text-slate-600" />
                              <span>Daily Bookings</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={dailyBookingsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                                <YAxis stroke="#64748B" fontSize={12} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                                <Bar 
                                  dataKey="bookings" 
                                  fill="#0F172A"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* Table Utilization */}
                        <Card className="bg-white border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                              <Activity className="w-5 h-5 text-slate-600" />
                              <span>Hourly Utilization</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={tableUtilizationData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="time" stroke="#64748B" fontSize={12} />
                                <YAxis stroke="#64748B" fontSize={12} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="utilization"
                                  stroke="#0F172A"
                                  strokeWidth={2}
                                  dot={{ fill: '#0F172A', strokeWidth: 2, r: 3 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="revenue" className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="bg-white border border-slate-200">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                              <DollarSign className="w-5 h-5 text-slate-600" />
                              <span>Monthly Revenue Trends</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                              <AreaChart data={revenueData}>
                                <defs>
                                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0.02}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                                <YAxis stroke="#64748B" fontSize={12} />
                                <Tooltip 
                                  formatter={(value) => [`$${value?.toLocaleString()}`, 'Revenue']}
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="revenue"
                                  stroke="#0F172A"
                                  strokeWidth={2}
                                  fill="url(#revenueGradient)"
                                  dot={{ fill: '#0F172A', strokeWidth: 2, r: 3 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="utilization" className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Detailed Utilization Chart */}
                          <Card className="bg-white border border-slate-200">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                                <Target className="w-5 h-5 text-slate-600" />
                                <span>Peak Hours Analysis</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={tableUtilizationData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="time" stroke="#64748B" fontSize={12} />
                                  <YAxis stroke="#64748B" fontSize={12} />
                                  <Tooltip 
                                    formatter={(value) => [`${value}%`, 'Utilization']}
                                    contentStyle={{ 
                                      backgroundColor: 'white',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Bar 
                                    dataKey="utilization" 
                                    fill="#0F172A"
                                    radius={[4, 4, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>

                          {/* Utilization Summary */}
                          <Card className="bg-white border border-slate-200">
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                                <Sparkles className="w-5 h-5 text-slate-600" />
                                <span>Performance Insights</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">Peak Hour</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                  {stats.peakHour || 19}:00 ({stats.peakHourBookings || 0} bookings)
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">Occupancy Rate</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                  {stats.occupancyRate || 0}%
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">No Shows</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                  {stats.noShows || 0}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
              </motion.div>
            </>
          ) : (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No Data Available</h3>
              <p className="text-slate-500">Start accepting bookings to see analytics</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}