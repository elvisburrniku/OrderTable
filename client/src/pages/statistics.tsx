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
  RefreshCw
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

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend, delay }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, type: "spring", stiffness: 100 }}
      whileHover={{ 
        scale: 1.02, 
        y: -5,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
                {title}
              </p>
              <motion.p 
                className="text-3xl font-bold tracking-tight"
                style={{ color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
              >
                {value}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
            <motion.div 
              className={`p-4 rounded-2xl bg-gradient-to-br shadow-lg`}
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${color}15, ${color}25)`
              }}
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Icon className="w-8 h-8" style={{ color }} />
            </motion.div>
          </div>
          {trend && (
            <motion.div 
              className="mt-4 flex items-center text-xs"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.4 }}
            >
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{trend}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Premium Header */}
      <motion.div 
        className="relative overflow-hidden bg-white/40 backdrop-blur-md border-b border-slate-200/60"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5" />
        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <motion.h1 
                className="text-4xl font-bold tracking-tight flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </motion.div>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  Analytics Dashboard
                </span>
              </motion.h1>
              <motion.p 
                className="text-slate-600 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Real-time insights and performance metrics for your restaurant
              </motion.p>
            </div>

            {/* Premium Controls */}
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-lg">
                <motion.div
                  animate={{ rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw className="w-5 h-5 text-slate-600" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-8">
        <div className="space-y-8">
          {isLoading ? (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              </motion.div>
              <p className="text-slate-600 text-lg">Loading analytics data...</p>
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
                  color="#3B82F6"
                  trend="+12% from last month"
                  delay={0}
                />
                <StatCard
                  icon={Users}
                  title="Total Customers"
                  value={stats.totalCustomers?.toLocaleString() || "0"}
                  subtitle="Unique customers served"
                  color="#10B981"
                  trend="+8% from last month"
                  delay={0.1}
                />
                <StatCard
                  icon={Target}
                  title="Table Utilization"
                  value={`${stats.tableUtilization?.toFixed(1) || "0.0"}%`}
                  subtitle="Current efficiency"
                  color="#8B5CF6"
                  trend="+3.2% this week"
                  delay={0.2}
                />
                <StatCard
                  icon={DollarSign}
                  title="Monthly Revenue"
                  value={`$${(stats.monthlyRevenue || 0).toLocaleString()}`}
                  subtitle="This month's earnings"
                  color="#F59E0B"
                  trend="+15% from last month"
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
                  color="#EF4444"
                  delay={0.4}
                />
                <StatCard
                  icon={Clock}
                  title="Avg Bookings/Day"
                  value={stats.avgBookingsPerDay?.toFixed(1) || "0.0"}
                  subtitle="Daily average"
                  color="#06B6D4"
                  delay={0.5}
                />
                <StatCard
                  icon={Award}
                  title="Total Tables"
                  value={stats.totalTables?.toLocaleString() || "0"}
                  subtitle="Available tables"
                  color="#84CC16"
                  delay={0.6}
                />
              </div>

              {/* Premium Charts Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Tabs value={activeMetric} onValueChange={setActiveMetric} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-1">
                    {[
                      { value: "overview", label: "Overview", icon: BarChart3 },
                      { value: "bookings", label: "Bookings", icon: CalendarIcon2 },
                      { value: "revenue", label: "Revenue", icon: DollarSign },
                      { value: "utilization", label: "Utilization", icon: PieChartIcon }
                    ].map((tab, index) => (
                      <TabsTrigger 
                        key={tab.value}
                        value={tab.value}
                        className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all duration-300"
                      >
                        <motion.div
                          animate={{ 
                            rotate: activeMetric === tab.value ? [0, 10, -10, 0] : 0,
                            scale: activeMetric === tab.value ? [1, 1.1, 1] : 1
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <tab.icon className="w-4 h-4" />
                        </motion.div>
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
                        transition={{ duration: 0.5 }}
                      >
                        {/* Booking Trends Chart */}
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center space-x-2 text-lg">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span>Booking Trends</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={bookingTrendsData}>
                                  <defs>
                                    <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="month" stroke="#64748B" />
                                  <YAxis stroke="#64748B" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '12px',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="bookings"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fill="url(#bookingGradient)"
                                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Booking Status Chart */}
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center space-x-2 text-lg">
                                <PieChartIcon className="w-5 h-5 text-purple-600" />
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
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {bookingStatusData.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color}
                                        className="hover:opacity-80 transition-opacity duration-200"
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '12px',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="bookings" className="space-y-6">
                      <motion.div 
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        {/* Daily Bookings */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center space-x-2 text-lg">
                                <CalendarIcon2 className="w-5 h-5 text-green-600" />
                                <span>Daily Bookings</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyBookingsData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="day" stroke="#64748B" />
                                  <YAxis stroke="#64748B" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '12px',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Bar 
                                    dataKey="bookings" 
                                    fill="url(#barGradient)"
                                    radius={[4, 4, 0, 0]}
                                  />
                                  <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
                                    </linearGradient>
                                  </defs>
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Table Utilization */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center space-x-2 text-lg">
                                <Activity className="w-5 h-5 text-orange-600" />
                                <span>Hourly Utilization</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={tableUtilizationData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="time" stroke="#64748B" />
                                  <YAxis stroke="#64748B" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '12px',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="utilization"
                                    stroke="#F59E0B"
                                    strokeWidth={3}
                                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="revenue" className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ scale: 1.005 }}
                        >
                          <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center space-x-2 text-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                                <span>Monthly Revenue Trends</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={revenueData}>
                                  <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                  <XAxis dataKey="month" stroke="#64748B" />
                                  <YAxis stroke="#64748B" />
                                  <Tooltip 
                                    formatter={(value) => [`$${value?.toLocaleString()}`, 'Revenue']}
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                      backdropFilter: 'blur(10px)',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '12px',
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10B981"
                                    strokeWidth={4}
                                    fill="url(#revenueGradient)"
                                    dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                                    activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 3 }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="utilization" className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Detailed Utilization Chart */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center space-x-2 text-lg">
                                  <Target className="w-5 h-5 text-purple-600" />
                                  <span>Peak Hours Analysis</span>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={tableUtilizationData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="time" stroke="#64748B" />
                                    <YAxis stroke="#64748B" />
                                    <Tooltip 
                                      formatter={(value) => [`${value}%`, 'Utilization']}
                                      contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                      }}
                                    />
                                    <Bar 
                                      dataKey="utilization" 
                                      fill="url(#utilizationGradient)"
                                      radius={[4, 4, 0, 0]}
                                    />
                                    <defs>
                                      <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                      </linearGradient>
                                    </defs>
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </motion.div>

                          {/* Utilization Summary */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-4"
                          >
                            <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="flex items-center space-x-2 text-lg">
                                  <Sparkles className="w-5 h-5 text-yellow-500" />
                                  <span>Performance Insights</span>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                  <span className="font-medium text-blue-800">Peak Hour</span>
                                  <Badge className="bg-blue-600 text-white">
                                    {stats.peakHour || 19}:00 ({stats.peakHourBookings || 0} bookings)
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                  <span className="font-medium text-green-800">Occupancy Rate</span>
                                  <Badge className="bg-green-600 text-white">
                                    {stats.occupancyRate || 0}%
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                  <span className="font-medium text-purple-800">No Shows</span>
                                  <Badge className="bg-purple-600 text-white">
                                    {stats.noShows || 0}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
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
              <Zap className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No Data Available</h3>
              <p className="text-slate-500">Start accepting bookings to see analytics</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}