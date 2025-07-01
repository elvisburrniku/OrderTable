import { useAuth } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Eye,
  RotateCcw,
  Activity,
  Target,
  DollarSign,
  Timer,
  RefreshCw,
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
  status: "available" | "occupied" | "reserved" | "maintenance";
}

export default function HeatMap() {
  const { restaurant } = useAuth();
  const [timeRange, setTimeRange] = useState("today");
  const [viewMode, setViewMode] = useState<"heat" | "occupancy" | "revenue">(
    "heat",
  );
  const [selectedTable, setSelectedTable] = useState<TableHeatData | null>(
    null,
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hoveredTable, setHoveredTable] = useState<TableHeatData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("visualization");
  const svgRef = useRef<SVGSVGElement>(null);

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">
          Please select a restaurant to view heat map.
        </p>
      </div>
    );
  }

  // Fetch table heat map data
  const {
    data: heatMapData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/heat-map`,
      timeRange,
    ],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch table layout data from table-plan
  const { data: tableLayout } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/table-layout`,
    ],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });

  // Fetch rooms data
  const { data: rooms = [] } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/rooms`,
    ],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
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

  // Merge heat map data with table layout positions
  const mergedTableData = heatData.map((table) => {
    const tablePosition = tableLayout?.positions?.[table.tableId];
    return {
      ...table,
      position: tablePosition
        ? { x: tablePosition.x, y: tablePosition.y }
        : table.position,
      shape: tablePosition?.shape || "circle",
      rotation: tablePosition?.rotation || 0,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "#EF4444"; // Red
      case "reserved":
        return "#F59E0B"; // Amber
      case "maintenance":
        return "#6B7280"; // Gray
      default:
        return "#10B981"; // Emerald
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
    { value: "custom", label: "Custom Range" },
  ];

  const viewModeOptions = [
    { value: "heat", label: "Overall Performance", icon: BarChart3 },
    { value: "occupancy", label: "Table Occupancy", icon: Users },
    { value: "revenue", label: "Revenue Impact", icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-slate-400 animate-spin" />
          <p className="text-slate-600">Loading heat map data...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, trend }: any) => (
    <Card className="bg-white border border-slate-200 hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 bg-white">
      {/* Header */}
      <motion.div
        className="bg-white border-b border-slate-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-slate-700" />
                <span>Table Heat Map</span>
              </h1>
              <p className="text-slate-600">
                Real-time performance visualization for your restaurant tables
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 bg-white border-slate-200">
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
                className="text-slate-600 border-slate-200"
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
              value={heatData.filter((t) => t.status === "occupied").length}
              subtitle={`${Math.round((heatData.filter((t) => t.status === "occupied").length / heatData.length) * 100)}% occupancy`}
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
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <TabsList className="bg-white border border-slate-200">
                  <TabsTrigger
                    value="visualization"
                    className="data-[state=active]:bg-slate-50"
                  >
                    Visualization
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:bg-slate-50"
                  >
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600">View Mode:</span>
                  <Select
                    value={viewMode}
                    onValueChange={(value) => setViewMode(value as any)}
                  >
                    <SelectTrigger className="w-48 bg-white border-slate-200">
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
                    <Card className="bg-white border border-slate-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg font-medium text-slate-900 flex items-center space-x-2">
                            <Target className="w-5 h-5 text-slate-600" />
                            <span>Restaurant Floor Plan</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-slate-700"
                            >
                              Live Data
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="relative bg-slate-50 rounded-lg p-8 min-h-[400px]">
                          <svg
                            ref={svgRef}
                            width="100%"
                            height="400"
                            viewBox="0 0 800 400"
                            className="overflow-visible"
                            onMouseMove={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setMousePosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              });
                            }}
                          >
                            {/* Room background */}
                            {rooms.map((room) => (
                              <rect
                                key={room.id}
                                x="50"
                                y="50"
                                width="700"
                                height="300"
                                fill="rgba(248, 250, 252, 0.8)"
                                stroke="rgba(203, 213, 225, 0.6)"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                rx="8"
                              />
                            ))}

                            {/* Room label */}
                            {rooms.map((room) => (
                              <text
                                key={`label-${room.id}`}
                                x="60"
                                y="75"
                                className="text-sm font-medium fill-slate-600 pointer-events-none"
                              >
                                {room.name}
                              </text>
                            ))}
                            {mergedTableData.map((table, index) => {
                              const intensity = getHeatIntensity(
                                table,
                                viewMode,
                              );
                              const statusColor = getStatusColor(table.status);
                              const size = 20 + intensity * 15;

                              return (
                                <g
                                  key={table.tableId}
                                  transform={`rotate(${table.rotation} ${table.position.x} ${table.position.y})`}
                                >
                                  {table.shape === "rectangle" ? (
                                    <rect
                                      x={table.position.x - size}
                                      y={table.position.y - size / 2}
                                      width={size * 2}
                                      height={size}
                                      fill={statusColor}
                                      fillOpacity={0.1 + intensity * 0.7}
                                      stroke={statusColor}
                                      strokeWidth={2}
                                      rx={4}
                                      className="cursor-pointer transition-all duration-300 hover:stroke-width-3"
                                      onMouseEnter={() =>
                                        setHoveredTable(table)
                                      }
                                      onMouseLeave={() => setHoveredTable(null)}
                                      onClick={() => setSelectedTable(table)}
                                    />
                                  ) : table.shape === "square" ? (
                                    <rect
                                      x={table.position.x - size}
                                      y={table.position.y - size}
                                      width={size * 2}
                                      height={size * 2}
                                      fill={statusColor}
                                      fillOpacity={0.1 + intensity * 0.7}
                                      stroke={statusColor}
                                      strokeWidth={2}
                                      rx={4}
                                      className="cursor-pointer transition-all duration-300 hover:stroke-width-3"
                                      onMouseEnter={() =>
                                        setHoveredTable(table)
                                      }
                                      onMouseLeave={() => setHoveredTable(null)}
                                      onClick={() => setSelectedTable(table)}
                                    />
                                  ) : (
                                    <circle
                                      cx={table.position.x}
                                      cy={table.position.y}
                                      r={size}
                                      fill={statusColor}
                                      fillOpacity={0.1 + intensity * 0.7}
                                      stroke={statusColor}
                                      strokeWidth={2}
                                      className="cursor-pointer transition-all duration-300 hover:stroke-width-3"
                                      onMouseEnter={() =>
                                        setHoveredTable(table)
                                      }
                                      onMouseLeave={() => setHoveredTable(null)}
                                      onClick={() => setSelectedTable(table)}
                                    />
                                  )}
                                  <text
                                    x={table.position.x}
                                    y={table.position.y + 5}
                                    textAnchor="middle"
                                    className="text-xs font-medium fill-slate-700 pointer-events-none"
                                  >
                                    {table.tableName.replace("Table ", "")}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Animated heat rings for high-intensity tables */}
                            {mergedTableData
                              .filter(
                                (table) =>
                                  getHeatIntensity(table, viewMode) > 0.7,
                              )
                              .map((table) => (
                                <g key={`heat-ring-${table.tableId}`}>
                                  <circle
                                    cx={table.position.x}
                                    cy={table.position.y}
                                    r={40}
                                    fill="none"
                                    stroke={getStatusColor(table.status)}
                                    strokeWidth="2"
                                    strokeOpacity="0.3"
                                    className="animate-ping"
                                  />
                                  <circle
                                    cx={table.position.x}
                                    cy={table.position.y}
                                    r={50}
                                    fill="none"
                                    stroke={getStatusColor(table.status)}
                                    strokeWidth="1"
                                    strokeOpacity="0.2"
                                    className="animate-pulse"
                                  />
                                </g>
                              ))}
                          </svg>

                          {/* Enhanced tooltip for hovered table */}
                          {hoveredTable && (
                            <div
                              className="absolute bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg py-3 px-4 pointer-events-none z-10 shadow-xl border border-slate-700"
                              style={{
                                left: mousePosition.x + 15,
                                top: mousePosition.y - 60,
                              }}
                            >
                              <div className="font-semibold text-sm mb-1">
                                {hoveredTable.tableName}
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">
                                    Status:
                                  </span>
                                  <span
                                    className={`font-medium ${
                                      hoveredTable.status === "occupied"
                                        ? "text-red-400"
                                        : hoveredTable.status === "reserved"
                                          ? "text-amber-400"
                                          : hoveredTable.status ===
                                              "maintenance"
                                            ? "text-gray-400"
                                            : "text-emerald-400"
                                    }`}
                                  >
                                    {hoveredTable.status === "occupied" &&
                                      "Occupied"}
                                    {hoveredTable.status === "reserved" &&
                                      "Reserved"}
                                    {hoveredTable.status === "available" &&
                                      "Available"}
                                    {hoveredTable.status === "maintenance" &&
                                      "Maintenance"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">
                                    Performance:
                                  </span>
                                  <span className="font-medium text-white">
                                    {hoveredTable.heatScore}/100
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">
                                    Capacity:
                                  </span>
                                  <span className="font-medium text-white">
                                    {hoveredTable.capacity} guests
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-300">
                                    Revenue:
                                  </span>
                                  <span className="font-medium text-emerald-400">
                                    ${hoveredTable.revenueGenerated}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Legend */}
                          <div className="absolute bottom-4 left-4 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <h4 className="text-sm font-medium text-slate-900 mb-3">
                              Status Legend
                            </h4>
                            <div className="space-y-2">
                              {[
                                {
                                  status: "available",
                                  label: "Available",
                                  color: "#10B981",
                                },
                                {
                                  status: "occupied",
                                  label: "Occupied",
                                  color: "#EF4444",
                                },
                                {
                                  status: "reserved",
                                  label: "Reserved",
                                  color: "#F59E0B",
                                },
                                {
                                  status: "maintenance",
                                  label: "Maintenance",
                                  color: "#6B7280",
                                },
                              ].map((item) => (
                                <div
                                  key={item.status}
                                  className="flex items-center space-x-2"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-xs text-slate-600">
                                    {item.label}
                                  </span>
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
                    <Card className="bg-white border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium text-slate-900">
                          {selectedTable
                            ? selectedTable.tableName
                            : "Table Details"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedTable ? (
                          <>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Status
                                </span>
                                <Badge
                                  style={{
                                    backgroundColor: getStatusColor(
                                      selectedTable.status,
                                    ),
                                  }}
                                  className="text-white"
                                >
                                  {selectedTable.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Capacity
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedTable.capacity} guests
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Occupancy Rate
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedTable.occupancyRate}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Revenue
                                </span>
                                <span className="text-sm font-medium">
                                  ${selectedTable.revenueGenerated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Bookings
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedTable.bookingCount}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">
                                  Performance Score
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedTable.heatScore}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Target className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-500">
                              Click on a table to view details
                            </p>
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
                  <Card className="bg-white border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-900">
                        Performance Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        {
                          label: "High (80-100%)",
                          count: mergedTableData.filter(
                            (t) => t.heatScore >= 80,
                          ).length,
                          color: "bg-emerald-500",
                        },
                        {
                          label: "Medium (50-79%)",
                          count: mergedTableData.filter(
                            (t) => t.heatScore >= 50 && t.heatScore < 80,
                          ).length,
                          color: "bg-amber-500",
                        },
                        {
                          label: "Low (<50%)",
                          count: mergedTableData.filter((t) => t.heatScore < 50)
                            .length,
                          color: "bg-red-500",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${item.color}`}
                            />
                            <span className="text-sm text-slate-600">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Status Overview */}
                  <Card className="bg-white border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-900">
                        Current Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        {
                          status: "available",
                          label: "Available",
                          count: mergedTableData.filter(
                            (t) => t.status === "available",
                          ).length,
                        },
                        {
                          status: "occupied",
                          label: "Occupied",
                          count: mergedTableData.filter(
                            (t) => t.status === "occupied",
                          ).length,
                        },
                        {
                          status: "reserved",
                          label: "Reserved",
                          count: mergedTableData.filter(
                            (t) => t.status === "reserved",
                          ).length,
                        },
                        {
                          status: "maintenance",
                          label: "Maintenance",
                          count: mergedTableData.filter(
                            (t) => t.status === "maintenance",
                          ).length,
                        },
                      ].map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: getStatusColor(item.status),
                              }}
                            />
                            <span className="text-sm text-slate-600">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Top Performers */}
                  <Card className="bg-white border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-900">
                        Top Performers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mergedTableData
                        .sort((a, b) => b.heatScore - a.heatScore)
                        .slice(0, 5)
                        .map((table, index) => (
                          <div
                            key={table.tableId}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-medium text-slate-500 w-4">
                                #{index + 1}
                              </span>
                              <span className="text-sm text-slate-900">
                                {table.tableName}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {table.heatScore}
                            </span>
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
          className="fixed z-50 bg-white border border-slate-200 rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
          }}
        >
          <div className="text-sm font-medium text-slate-900 mb-1">
            {hoveredTable.tableName}
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div>
              Status: <span className="font-medium">{hoveredTable.status}</span>
            </div>
            <div>
              Performance:{" "}
              <span className="font-medium">{hoveredTable.heatScore}</span>
            </div>
            <div>
              Occupancy:{" "}
              <span className="font-medium">{hoveredTable.occupancyRate}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
