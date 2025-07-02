import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { KitchenPerformanceSparkline } from "@/components/kitchen-performance-sparkline";
import { CreateKitchenOrder } from "@/components/create-kitchen-order";
import { motion } from "framer-motion";
import { 
  Clock, 
  ChefHat, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Timer, 
  Users, 
  DollarSign,
  BarChart3,
  Activity,
  Flame,
  Target,
  Calendar,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Package,
  Gauge,
  Award
} from "lucide-react";

interface KitchenOrder {
  id: number;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    preparationTime: number;
    category: string;
    specialInstructions?: string;
  }>;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTime: number;
  actualTime?: number;
  startedAt?: string;
  readyAt?: string;
  servedAt?: string;
  totalAmount: number;
  createdAt: string;
}

interface KitchenStation {
  id: number;
  name: string;
  type: 'grill' | 'fryer' | 'salad' | 'dessert' | 'beverage' | 'prep';
  currentOrders: number;
  capacity: number;
  efficiency: number;
  averageTime: number;
  isActive: boolean;
  temperature?: number;
  lastMaintenance?: string;
}

interface KitchenStaff {
  id: number;
  name: string;
  role: 'head_chef' | 'sous_chef' | 'line_cook' | 'prep_cook' | 'dishwasher';
  shift: 'morning' | 'afternoon' | 'evening' | 'night';
  efficiency: number;
  ordersCompleted: number;
  status: 'active' | 'break' | 'offline';
  currentStation?: string;
}

interface PerformanceMetrics {
  ordersToday: number;
  averageTime: number;
  efficiency: number;
  revenue: number;
  peakHours: Array<{ hour: number; orders: number }>;
  popularItems: Array<{ name: string; orders: number; time: number }>;
  stationUtilization: Array<{ station: string; utilization: number }>;
  waitTimes: Array<{ time: string; wait: number }>;
}

interface KitchenDashboardProps {
  restaurantId: number;
  tenantId: number;
}

export function KitchenDashboard({ restaurantId, tenantId }: KitchenDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('today');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showOrderDialog, setShowOrderDialog] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time data fetching with auto-refresh
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders`, selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders?timeRange=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations`);
      if (!response.ok) throw new Error('Failed to fetch stations');
      return response.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/staff`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/staff`);
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics`, selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics?timeRange=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Order status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, actualTime }: { orderId: number; status: string; actualTime?: number }) => {
      return apiRequest('PATCH', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders/${orderId}`, { 
        status, 
        actualTime,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics`] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status.",
        variant: "destructive"
      });
    },
  });

  // Station status update mutation
  const updateStationMutation = useMutation({
    mutationFn: async ({ stationId, updates }: { stationId: number; updates: any }) => {
      return apiRequest('PATCH', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations/${stationId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations`] });
      toast({
        title: "Station Updated",
        description: "Station status has been updated successfully.",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'served': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getElapsedTime = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return diff;
  };

  // Ensure all data is properly formatted as arrays
  const ordersArray = Array.isArray(orders) ? orders : [];
  const stationsArray = Array.isArray(stations) ? stations : [];
  const staffArray = Array.isArray(staff) ? staff : [];
  
  // Debug logging
  console.log('Kitchen Dashboard Data:', {
    ordersCount: ordersArray.length,
    orders: ordersArray.slice(0, 3), // Show first 3 orders
    selectedTimeRange
  });
  
  const activeOrders = ordersArray.filter((order: KitchenOrder) => ['pending', 'preparing'].includes(order.status));
  const readyOrders = ordersArray.filter((order: KitchenOrder) => order.status === 'ready');
  const completedToday = ordersArray.filter((order: KitchenOrder) => order.status === 'served').length;
  
  console.log('Filtered Orders:', {
    activeCount: activeOrders.length,
    readyCount: readyOrders.length,
    completedCount: completedToday
  });

  console.log('Kitchen Dashboard All Data:', {
    stations: {
      loading: stationsLoading,
      count: stationsArray.length,
      data: stationsArray.slice(0, 2)
    },
    staff: {
      loading: staffLoading,
      count: staffArray.length,
      data: staffArray.slice(0, 2)
    },
    metrics: {
      loading: metricsLoading,
      data: metrics
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Professional Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg"
      >
        <div className="px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -20, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <ChefHat className="h-10 w-10 text-orange-400" />
                </motion.div>
                Kitchen Dashboard
              </h1>
              <p className="text-slate-300 mt-2">Real-time kitchen operations and efficiency monitoring</p>
            </div>
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <CreateKitchenOrder 
                  restaurantId={restaurantId} 
                  tenantId={tenantId}
                  onOrderCreated={() => {
                    queryClient.invalidateQueries({ 
                      queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders`] 
                    });
                    queryClient.invalidateQueries({ 
                      queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics`] 
                    });
                  }}
                />
              </motion.div>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 ${
                  autoRefresh 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-6 space-y-6">

        {/* Key Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Active Orders</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{activeOrders.length}</div>
                <p className="text-sm text-slate-500 mt-1">
                  {readyOrders.length} ready to serve
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Avg. Prep Time</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Timer className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics?.averageTime ? formatTime(metrics.averageTime) : '0m'}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Target: 20-25 minutes
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Kitchen Efficiency</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gauge className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics?.efficiency || 0}%</div>
                <div className="mt-3">
                  <Progress 
                    value={metrics?.efficiency || 0} 
                    className="h-2 bg-slate-100"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Orders Completed</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{completedToday}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Since start of day
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm mb-6">
              <TabsTrigger 
                value="orders" 
                className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
              >
                <Package className="h-4 w-4" />
                Active Orders
              </TabsTrigger>
              <TabsTrigger 
                value="stations" 
                className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
              >
                <Flame className="h-4 w-4" />
                Kitchen Stations
              </TabsTrigger>
              <TabsTrigger 
                value="staff" 
                className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                Staff Performance
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
              >
                <Activity className="h-4 w-4" />
                Performance Sparkline
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Active Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              {/* Ready Orders Section */}
              {readyOrders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Ready to Serve ({readyOrders.length})</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {readyOrders.map((order: KitchenOrder, index: number) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="relative bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg font-semibold text-slate-800">#{order.orderNumber}</CardTitle>
                                <p className="text-sm text-slate-600 mt-1">Table {order.tableNumber} • {order.customerName}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${getPriorityColor(order.priority)} px-3 py-1`}>
                                  {order.priority.toUpperCase()}
                                </Badge>
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                              </div>
                            </div>
                          </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-gray-500">{formatTime(item.preparationTime)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>Completed in:</span>
                        <span className="font-medium text-green-600">{formatTime(order.actualTime || order.estimatedTime)}</span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => updateOrderStatusMutation.mutate({ 
                            orderId: order.id, 
                            status: 'served' 
                          })}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Served
                        </Button>
                      </div>
                    </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Active Orders Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">In Progress ({activeOrders.length})</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {ordersLoading ? (
                    <div className="col-span-full text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block"
                      >
                        <RefreshCw className="h-8 w-8 text-slate-400" />
                      </motion.div>
                      <p className="text-slate-500 mt-2">Loading orders...</p>
                    </div>
                  ) : activeOrders.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="p-4 bg-slate-100 rounded-full inline-block mb-4">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500">No active orders at the moment</p>
                    </div>
                  ) : (
                    activeOrders.map((order: KitchenOrder, index: number) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="relative bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg font-semibold text-slate-800">#{order.orderNumber}</CardTitle>
                                <p className="text-sm text-slate-600 mt-1">Table {order.tableNumber} • {order.customerName}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${getPriorityColor(order.priority)} px-3 py-1`}>
                                  {order.priority.toUpperCase()}
                                </Badge>
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`} />
                              </div>
                            </div>
                          </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="text-gray-500">{formatTime(item.preparationTime)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span>Estimated Time:</span>
                      <span className="font-medium">{formatTime(order.estimatedTime)}</span>
                    </div>
                    
                    {order.startedAt && (
                      <div className="flex justify-between items-center text-sm">
                        <span>Elapsed:</span>
                        <span className={`font-medium ${getElapsedTime(order.startedAt) > order.estimatedTime ? 'text-red-600' : 'text-green-600'}`}>
                          {formatTime(getElapsedTime(order.startedAt))}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      {order.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatusMutation.mutate({ 
                            orderId: order.id, 
                            status: 'preparing' 
                          })}
                          disabled={updateOrderStatusMutation.isPending}
                          className="flex-1"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatusMutation.mutate({ 
                            orderId: order.id, 
                            status: 'ready',
                            actualTime: order.startedAt ? getElapsedTime(order.startedAt) : undefined
                          })}
                          disabled={updateOrderStatusMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ready
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* Kitchen Stations Tab */}
            <TabsContent value="stations" className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {stationsLoading ? (
                  <div className="col-span-full text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <RefreshCw className="h-8 w-8 text-slate-400" />
                    </motion.div>
                    <p className="text-slate-500 mt-2">Loading stations...</p>
                  </div>
                ) : stationsArray.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="p-4 bg-slate-100 rounded-full inline-block mb-4">
                      <Flame className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">No kitchen stations configured</p>
                  </div>
                ) : (
                  stationsArray.map((station: KitchenStation, index: number) => (
                    <motion.div
                      key={station.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <Flame className="h-5 w-5 text-orange-600" />
                        {station.name}
                      </CardTitle>
                      <div className={`w-3 h-3 rounded-full ${station.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Current Load:</span>
                      <span className="font-medium">{station.currentOrders}/{station.capacity}</span>
                    </div>
                    <Progress value={(station.currentOrders / station.capacity) * 100} />
                    
                    <div className="flex justify-between text-sm">
                      <span>Efficiency:</span>
                      <span className="font-medium">{station.efficiency}%</span>
                    </div>
                    <Progress value={station.efficiency} />
                    
                    <div className="flex justify-between text-sm">
                      <span>Avg Time:</span>
                      <span className="font-medium">{formatTime(station.averageTime)}</span>
                    </div>
                    
                    {station.temperature && (
                      <div className="flex justify-between text-sm">
                        <span>Temperature:</span>
                        <span className="font-medium">{station.temperature}°F</span>
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3"
                      onClick={() => updateStationMutation.mutate({ 
                        stationId: station.id, 
                        updates: { isActive: !station.isActive }
                      })}
                    >
                      {station.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </TabsContent>

        {/* Staff Performance Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffLoading ? (
              <div className="col-span-full text-center py-8">Loading staff...</div>
            ) : (
              staffArray.map((member: KitchenStaff) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <p className="text-sm text-gray-600 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Shift:</span>
                      <span className="font-medium capitalize">{member.shift}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Efficiency:</span>
                      <span className="font-medium">{member.efficiency}%</span>
                    </div>
                    <Progress value={member.efficiency} />
                    
                    <div className="flex justify-between text-sm">
                      <span>Orders Completed:</span>
                      <span className="font-medium">{member.ordersCompleted}</span>
                    </div>
                    
                    {member.currentStation && (
                      <div className="flex justify-between text-sm">
                        <span>Current Station:</span>
                        <span className="font-medium">{member.currentStation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Performance Sparkline Tab */}
        <TabsContent value="performance" className="space-y-4">
          <KitchenPerformanceSparkline 
            restaurantId={restaurantId} 
            tenantId={tenantId} 
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {metricsLoading ? (
            <div className="text-center py-8">Loading analytics...</div>
          ) : metrics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Popular Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.popularItems?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <p className="text-sm text-gray-600">{item.orders} orders</p>
                        </div>
                        <span className="text-sm text-gray-500">{formatTime(item.time)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Station Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Station Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.stationUtilization?.map((station: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{station.station}</span>
                          <span className="text-sm">{station.utilization}%</span>
                        </div>
                        <Progress value={station.utilization} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Peak Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.peakHours?.map((hour: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{hour.hour}:00</span>
                        <span className="font-medium">{hour.orders} orders</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Revenue:</span>
                      <span className="font-bold text-lg">${metrics.revenue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Orders Today:</span>
                      <span className="font-medium">{metrics.ordersToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Order Value:</span>
                      <span className="font-medium">
                        ${metrics.ordersToday > 0 ? (metrics.revenue / metrics.ordersToday).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No analytics data available
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Table Number</Label>
                  <Input value={selectedOrder.tableNumber} readOnly />
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <Input value={selectedOrder.customerName} readOnly />
                </div>
              </div>
              
              <div>
                <Label>Items</Label>
                <div className="space-y-2 mt-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{formatTime(item.preparationTime)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={selectedOrder.status}
                    onValueChange={(status) => {
                      updateOrderStatusMutation.mutate({ 
                        orderId: selectedOrder.id, 
                        status,
                        actualTime: selectedOrder.startedAt ? getElapsedTime(selectedOrder.startedAt) : undefined
                      });
                      setShowOrderDialog(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="served">Served</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={selectedOrder.priority} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

export default KitchenDashboard;