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
  StopCircle
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
    queryFn: () => apiRequest('GET', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders?timeRange=${selectedTimeRange}`),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations`],
    queryFn: () => apiRequest('GET', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/stations`),
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/staff`],
    queryFn: () => apiRequest('GET', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/staff`),
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics`, selectedTimeRange],
    queryFn: () => apiRequest('GET', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/metrics?timeRange=${selectedTimeRange}`),
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
  
  const activeOrders = ordersArray.filter((order: KitchenOrder) => ['pending', 'preparing'].includes(order.status));
  const readyOrders = ordersArray.filter((order: KitchenOrder) => order.status === 'ready');
  const completedToday = ordersArray.filter((order: KitchenOrder) => order.status === 'served').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            Kitchen Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time kitchen operations and efficiency monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <CreateKitchenOrder 
            restaurantId={restaurantId} 
            tenantId={tenantId}
            onOrderCreated={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders`] });
            }}
          />
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
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
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {readyOrders.length} ready to serve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Prep Time</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageTime ? formatTime(metrics.averageTime) : '0m'}</div>
            <p className="text-xs text-muted-foreground">
              Target: 20-25 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.efficiency || 0}%</div>
            <Progress value={metrics?.efficiency || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Since start of day
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orders">Active Orders</TabsTrigger>
          <TabsTrigger value="stations">Kitchen Stations</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="performance">Performance Sparkline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {ordersLoading ? (
              <div className="col-span-full text-center py-8">Loading orders...</div>
            ) : activeOrders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No active orders at the moment
              </div>
            ) : (
              activeOrders.map((order: KitchenOrder) => (
                <Card key={order.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
                        <p className="text-sm text-gray-600">Table {order.tableNumber} • {order.customerName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getPriorityColor(order.priority)}>
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
              ))
            )}
          </div>
        </TabsContent>

        {/* Kitchen Stations Tab */}
        <TabsContent value="stations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationsLoading ? (
              <div className="col-span-full text-center py-8">Loading stations...</div>
            ) : (
              stationsArray.map((station: KitchenStation) => (
                <Card key={station.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
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
              ))
            )}
          </div>
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
  );
}

export default KitchenDashboard;