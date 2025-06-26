
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  Users, 
  TrendingUp,
  Activity,
  Target,
  DollarSign,
  RefreshCw,
  ChevronRight
} from "lucide-react";

interface TableHeatData {
  tableId: number;
  tableName: string;
  capacity: number;
  position: { x: number; y: number };
  heatScore: number;
  bookingCount: number;
  occupancyRate: number;
  revenueGenerated: number;
  averageStayDuration: number;
  peakHours: string[];
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

export default function HeatMap() {
  const { restaurant } = useAuth();
  const [timeRange, setTimeRange] = useState("today");
  const [viewMode, setViewMode] = useState<"heat" | "occupancy" | "revenue">("heat");
  const [selectedTable, setSelectedTable] = useState<TableHeatData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hoveredTable, setHoveredTable] = useState<TableHeatData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("visualization");
  const svgRef = useRef<SVGSVGElement>(null);

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a restaurant to view heat map.</p>
      </div>
    );
  }

  // Fetch table heat map data
  const { data: heatMapData, isLoading, refetch } = useQuery({
    queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/heat-map`, timeRange],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const heatData = heatMapData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return '#DC2626'; // Red-600
      case 'reserved': return '#D97706'; // Amber-600
      case 'maintenance': return '#6B7280'; // Gray-500
      default: return '#059669'; // Emerald-600
    }
  };

  const getHeatIntensity = (table: TableHeatData, mode: string) => {
    let value;
    switch (mode) {
      case "occupancy": 
        value = table.occupancyRate;
        break;
      case "revenue": 
        value = Math.min((table.revenueGenerated / 1000) * 100, 100);
        break;
      default: 
        value = table.heatScore;
    }
    return Math.max(0.1, value / 100);
  };

  const timeRangeOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "custom", label: "Custom Range" }
  ];

  const viewModeOptions = [
    { value: "heat", label: "Overall Performance", icon: BarChart3 },
    { value: "occupancy", label: "Table Occupancy", icon: Users },
    { value: "revenue", label: "Revenue Impact", icon: TrendingUp }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading heat map data...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, trend }: any) => (
    <Card className="bg-white border-gray-200 hover:border-gray-300 transition-colors duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div 
        className="bg-white border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <span>Analytics</span>
                <ChevronRight className="w-4 h-4" />
                <span>Heat Map</span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Table Heat Map</h1>
              <p className="text-gray-600 mt-1">
                Real-time performance visualization for your restaurant tables
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-8">
          {/* Key Metrics */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <StatCard
              icon={Users}
              title="Total Tables"
              value={heatData.length}
              subtitle="Active tables"
            />
            <StatCard
              icon={Activity}
              title="Currently Occupied"
              value={heatData.filter(t => t.status === 'occupied').length}
              subtitle={`${Math.round((heatData.filter(t => t.status === 'occupied').length / heatData.length) * 100)}% occupancy`}
            />
            <StatCard
              icon={TrendingUp}
              title="Average Performance"
              value={`${Math.round(heatData.reduce((sum, t) => sum + t.heatScore, 0) / heatData.length) || 0}`}
              subtitle="Performance score"
            />
            <StatCard
              icon={DollarSign}
              title="Total Revenue"
              value={`$${heatData.reduce((sum, t) => sum + t.revenueGenerated, 0).toLocaleString()}`}
              subtitle="Current period"
            />
          </motion.div>

          {/* Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="visualization" className="data-[state=active]:bg-gray-50">
                    Visualization
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-50">
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">View Mode:</span>
                  <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                    <SelectTrigger className="w-48 bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {viewModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <option.icon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="visualization" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Heat Map Visualization */}
                  <div className="lg:col-span-2">
                    <Card className="bg-white border-gray-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                            <Target className="w-5 h-5 text-gray-600" />
                            <span>Restaurant Floor Plan</span>
                          </span>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            Live Data
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="relative bg-gray-50 rounded-lg p-8 min-h-[400px]">
                          <svg
                            ref={svgRef}
                            width="100%"
                            height="400"
                            viewBox="0 0 800 400"
                            className="overflow-visible"
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMousePosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              });
                            }}
                          >
                            {heatData.map((table, index) => {
                              const intensity = getHeatIntensity(table, viewMode);
                              const statusColor = getStatusColor(table.status);
                              
                              return (
                                <g key={table.tableId}>
                                  <circle
                                    cx={table.position.x}
                                    cy={table.position.y}
                                    r={20 + (intensity * 15)}
                                    fill={statusColor}
                                    fillOpacity={0.1 + (intensity * 0.6)}
                                    stroke={statusColor}
                                    strokeWidth={2}
                                    className="cursor-pointer transition-all duration-300 hover:stroke-width-3"
                                    onMouseEnter={() => setHoveredTable(table)}
                                    onMouseLeave={() => setHoveredTable(null)}
                                    onClick={() => setSelectedTable(table)}
                                  />
                                  <text
                                    x={table.position.x}
                                    y={table.position.y + 5}
                                    textAnchor="middle"
                                    className="text-xs font-medium fill-gray-700 pointer-events-none"
                                  >
                                    {table.tableName.replace('Table ', '')}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                          
                          {/* Legend */}
                          <div className="absolute bottom-4 left-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h4>
                            <div className="space-y-2">
                              {[
                                { status: 'available', label: 'Available', color: '#059669' },
                                { status: 'occupied', label: 'Occupied', color: '#DC2626' },
                                { status: 'reserved', label: 'Reserved', color: '#D97706' },
                                { status: 'maintenance', label: 'Maintenance', color: '#6B7280' }
                              ].map((item) => (
                                <div key={item.status} className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-xs text-gray-600">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Table Details */}
                  <div>
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium text-gray-900">
                          {selectedTable ? selectedTable.tableName : 'Table Details'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedTable ? (
                          <>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Status</span>
                                <Badge 
                                  style={{ backgroundColor: getStatusColor(selectedTable.status) }}
                                  className="text-white"
                                >
                                  {selectedTable.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Capacity</span>
                                <span className="text-sm font-medium">{selectedTable.capacity} guests</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Occupancy Rate</span>
                                <span className="text-sm font-medium">{selectedTable.occupancyRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Revenue</span>
                                <span className="text-sm font-medium">${selectedTable.revenueGenerated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Bookings</span>
                                <span className="text-sm font-medium">{selectedTable.bookingCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Performance Score</span>
                                <span className="text-sm font-medium">{selectedTable.heatScore}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Click on a table to view details</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Performance Distribution */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-gray-900">Performance Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'High (80-100%)', count: heatData.filter(t => t.heatScore >= 80).length, color: 'bg-emerald-600' },
                        { label: 'Medium (50-79%)', count: heatData.filter(t => t.heatScore >= 50 && t.heatScore < 80).length, color: 'bg-amber-600' },
                        { label: 'Low (<50%)', count: heatData.filter(t => t.heatScore < 50).length, color: 'bg-red-600' }
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm text-gray-600">{item.label}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Status Overview */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-gray-900">Current Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { status: 'available', label: 'Available', count: heatData.filter(t => t.status === 'available').length },
                        { status: 'occupied', label: 'Occupied', count: heatData.filter(t => t.status === 'occupied').length },
                        { status: 'reserved', label: 'Reserved', count: heatData.filter(t => t.status === 'reserved').length },
                        { status: 'maintenance', label: 'Maintenance', count: heatData.filter(t => t.status === 'maintenance').length }
                      ].map((item) => (
                        <div key={item.status} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getStatusColor(item.status) }}
                            />
                            <span className="text-sm text-gray-600">{item.label}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Top Performers */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-gray-900">Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {heatData
                        .sort((a, b) => b.heatScore - a.heatScore)
                        .slice(0, 5)
                        .map((table, index) => (
                          <div key={table.tableId} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-medium text-gray-500 w-4">#{index + 1}</span>
                              <span className="text-sm text-gray-900">{table.tableName}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{table.heatScore}</span>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTable && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
          }}
        >
          <div className="text-sm font-medium text-gray-900 mb-1">{hoveredTable.tableName}</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Status: <span className="font-medium">{hoveredTable.status}</span></div>
            <div>Performance: <span className="font-medium">{hoveredTable.heatScore}</span></div>
            <div>Occupancy: <span className="font-medium">{hoveredTable.occupancyRate}%</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
