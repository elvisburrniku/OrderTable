import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { 
  Thermometer, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp,
  Eye,
  RotateCcw,
  Info
} from "lucide-react";

interface TableHeatData {
  tableId: number;
  tableName: string;
  capacity: number;
  position: { x: number; y: number };
  heatScore: number; // 0-100
  bookingCount: number;
  occupancyRate: number;
  revenueGenerated: number;
  averageStayDuration: number;
  peakHours: string[];
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

interface SeatingHeatMapProps {
  restaurantId: number;
  tenantId: number;
}

export default function SeatingHeatMap({ restaurantId, tenantId }: SeatingHeatMapProps) {
  const { restaurant } = useAuth();
  const [timeRange, setTimeRange] = useState("today");
  const [viewMode, setViewMode] = useState<"heat" | "occupancy" | "revenue">("heat");
  const [selectedTable, setSelectedTable] = useState<TableHeatData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch table heat map data
  const { data: heatMapData, isLoading, refetch } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/heat-map`, timeRange],
    enabled: !!tenantId && !!restaurantId,
  });

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Generate mock heat map data for demonstration
  const generateMockHeatData = (): TableHeatData[] => {
    const tables: TableHeatData[] = [];
    const tableCount = 16;
    
    for (let i = 1; i <= tableCount; i++) {
      // Create a 4x4 grid layout
      const row = Math.floor((i - 1) / 4);
      const col = (i - 1) % 4;
      
      const baseHeat = Math.random() * 100;
      const occupancyRate = Math.random() * 100;
      const bookingCount = Math.floor(Math.random() * 15) + 1;
      
      tables.push({
        tableId: i,
        tableName: `Table ${i}`,
        capacity: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
        position: { 
          x: col * 120 + 60, 
          y: row * 100 + 50 
        },
        heatScore: baseHeat,
        bookingCount,
        occupancyRate,
        revenueGenerated: Math.floor(Math.random() * 1000) + 200,
        averageStayDuration: Math.floor(Math.random() * 60) + 45, // minutes
        peakHours: ['7:00 PM', '8:00 PM', '8:30 PM'].slice(0, Math.floor(Math.random() * 3) + 1),
        status: ['available', 'occupied', 'reserved'][Math.floor(Math.random() * 3)] as any
      });
    }
    
    return tables;
  };

  const heatData = heatMapData || generateMockHeatData();

  const getHeatColor = (score: number, mode: string) => {
    const intensity = score / 100;
    
    switch (mode) {
      case "heat":
        // Blue (cold) to Red (hot)
        if (intensity < 0.2) return `rgba(59, 130, 246, ${0.3 + intensity * 0.4})`;
        if (intensity < 0.4) return `rgba(34, 197, 94, ${0.3 + intensity * 0.4})`;
        if (intensity < 0.6) return `rgba(234, 179, 8, ${0.3 + intensity * 0.4})`;
        if (intensity < 0.8) return `rgba(249, 115, 22, ${0.3 + intensity * 0.4})`;
        return `rgba(239, 68, 68, ${0.3 + intensity * 0.4})`;
      case "occupancy":
        return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`;
      case "revenue":
        return `rgba(147, 51, 234, ${0.2 + intensity * 0.6})`;
      default:
        return `rgba(156, 163, 175, 0.3)`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-orange-500';
      case 'maintenance': return 'bg-gray-500';
      default: return 'bg-green-500';
    }
  };

  const getHeatScoreForMode = (table: TableHeatData, mode: string) => {
    switch (mode) {
      case "occupancy": return table.occupancyRate;
      case "revenue": return (table.revenueGenerated / 1000) * 100;
      default: return table.heatScore;
    }
  };

  const timeRangeOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "custom", label: "Custom Range" }
  ];

  const viewModeOptions = [
    { value: "heat", label: "Overall Heat", icon: Thermometer },
    { value: "occupancy", label: "Occupancy Rate", icon: Users },
    { value: "revenue", label: "Revenue Impact", icon: TrendingUp }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Thermometer className="w-6 h-6 text-orange-500" />
            <span>Seating Heat Map</span>
          </h2>
          <p className="text-muted-foreground">
            Visual analytics of table performance and customer patterns
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="View Mode" />
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Heat Map Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Restaurant Floor Plan</span>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span>High</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-50 rounded-lg p-4" style={{ height: '480px' }}>
                {/* Restaurant Layout */}
                <svg width="100%" height="100%" viewBox="0 0 500 400">
                  {/* Background elements */}
                  <rect x="20" y="20" width="460" height="360" fill="white" stroke="#e5e7eb" strokeWidth="2" rx="8" />
                  
                  {/* Kitchen area */}
                  <rect x="400" y="40" width="70" height="100" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" rx="4" />
                  <text x="435" y="95" textAnchor="middle" className="text-xs fill-gray-600">Kitchen</text>
                  
                  {/* Entrance */}
                  <rect x="220" y="20" width="60" height="8" fill="#10b981" />
                  <text x="250" y="15" textAnchor="middle" className="text-xs fill-gray-600">Entrance</text>
                  
                  {/* Tables */}
                  {heatData.map((table) => {
                    const heatScore = getHeatScoreForMode(table, viewMode);
                    const color = getHeatColor(heatScore, viewMode);
                    
                    return (
                      <g key={table.tableId}>
                        {/* Table heat visualization */}
                        <circle
                          cx={table.position.x}
                          cy={table.position.y}
                          r="25"
                          fill={color}
                          stroke="#374151"
                          strokeWidth="2"
                          className="cursor-pointer hover:stroke-blue-500 transition-all"
                          onClick={() => setSelectedTable(table)}
                        />
                        
                        {/* Table number */}
                        <text
                          x={table.position.x}
                          y={table.position.y - 5}
                          textAnchor="middle"
                          className="text-sm font-semibold fill-gray-800"
                        >
                          {table.tableId}
                        </text>
                        
                        {/* Capacity indicator */}
                        <text
                          x={table.position.x}
                          y={table.position.y + 8}
                          textAnchor="middle"
                          className="text-xs fill-gray-600"
                        >
                          {table.capacity}p
                        </text>
                        
                        {/* Status indicator */}
                        <circle
                          cx={table.position.x + 20}
                          cy={table.position.y - 20}
                          r="4"
                          fill={table.status === 'occupied' ? '#ef4444' : 
                               table.status === 'reserved' ? '#f97316' : 
                               table.status === 'maintenance' ? '#6b7280' : '#10b981'}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel - Table Details */}
        <div className="space-y-4">
          {selectedTable ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedTable.tableName}</span>
                  <Badge className={getStatusColor(selectedTable.status)}>
                    {selectedTable.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(selectedTable.heatScore)}
                    </div>
                    <div className="text-xs text-muted-foreground">Heat Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(selectedTable.occupancyRate)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Occupancy</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Capacity:</span>
                    <span className="text-sm font-medium">{selectedTable.capacity} guests</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bookings Today:</span>
                    <span className="text-sm font-medium">{selectedTable.bookingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue Generated:</span>
                    <span className="text-sm font-medium">${selectedTable.revenueGenerated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Stay Duration:</span>
                    <span className="text-sm font-medium">{selectedTable.averageStayDuration}min</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">Peak Hours:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTable.peakHours.map((hour, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {hour}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Table Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click on any table in the heat map to view detailed analytics and performance metrics.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Tables:</span>
                <span className="text-sm font-medium">{heatData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Currently Occupied:</span>
                <span className="text-sm font-medium">
                  {heatData.filter(t => t.status === 'occupied').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reserved:</span>
                <span className="text-sm font-medium">
                  {heatData.filter(t => t.status === 'reserved').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Occupancy:</span>
                <span className="text-sm font-medium">
                  {Math.round(heatData.reduce((sum, t) => sum + t.occupancyRate, 0) / heatData.length)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue:</span>
                <span className="text-sm font-medium">
                  ${heatData.reduce((sum, t) => sum + t.revenueGenerated, 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}