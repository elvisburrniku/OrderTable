import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import HeatMapTooltip from "@/components/heat-map-tooltip";
import HeatMapAnalytics from "@/components/heat-map-analytics";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Thermometer, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp,
  Eye,
  RotateCcw,
  Info,
  Activity,
  Filter,
  BarChart3,
  Sparkles,
  Zap,
  Target
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
  const [hoveredTable, setHoveredTable] = useState<TableHeatData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("visualization");
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch table heat map data
  const { data: heatMapData, isLoading, refetch, error } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/heat-map`, timeRange],
    enabled: !!tenantId && !!restaurantId,
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

  // Use real data from API
  const heatData = heatMapData || [];

  const getHeatColor = (score: number, mode: string) => {
    const intensity = score / 100;

    switch (mode) {
      case "heat":
        // Enhanced gradient with glow effects
        if (intensity < 0.2) return {
          fill: `rgba(59, 130, 246, ${0.4 + intensity * 0.5})`,
          glow: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))',
          stroke: 'rgba(59, 130, 246, 0.8)'
        };
        if (intensity < 0.4) return {
          fill: `rgba(34, 197, 94, ${0.4 + intensity * 0.5})`,
          glow: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.7))',
          stroke: 'rgba(34, 197, 94, 0.8)'
        };
        if (intensity < 0.6) return {
          fill: `rgba(234, 179, 8, ${0.4 + intensity * 0.5})`,
          glow: 'drop-shadow(0 0 16px rgba(234, 179, 8, 0.8))',
          stroke: 'rgba(234, 179, 8, 0.9)'
        };
        if (intensity < 0.8) return {
          fill: `rgba(249, 115, 22, ${0.4 + intensity * 0.5})`,
          glow: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.9))',
          stroke: 'rgba(249, 115, 22, 0.9)'
        };
        return {
          fill: `rgba(239, 68, 68, ${0.4 + intensity * 0.5})`,
          glow: 'drop-shadow(0 0 24px rgba(239, 68, 68, 1))',
          stroke: 'rgba(239, 68, 68, 1)'
        };
      case "occupancy":
        return {
          fill: `rgba(34, 197, 94, ${0.3 + intensity * 0.6})`,
          glow: `drop-shadow(0 0 ${8 + intensity * 16}px rgba(34, 197, 94, ${0.6 + intensity * 0.3}))`,
          stroke: 'rgba(34, 197, 94, 0.8)'
        };
      case "revenue":
        return {
          fill: `rgba(147, 51, 234, ${0.3 + intensity * 0.6})`,
          glow: `drop-shadow(0 0 ${8 + intensity * 16}px rgba(147, 51, 234, ${0.6 + intensity * 0.3}))`,
          stroke: 'rgba(147, 51, 234, 0.8)'
        };
      default:
        return {
          fill: `rgba(156, 163, 175, 0.3)`,
          glow: 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.3))',
          stroke: 'rgba(156, 163, 175, 0.5)'
        };
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
      {/* Premium Header and Controls */}
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-2">
          <motion.h2 
            className="text-3xl font-bold flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Thermometer className="w-8 h-8 text-gradient bg-gradient-to-r from-orange-500 to-red-500" />
            </motion.div>
            <span className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
              Seating Heat Map
            </span>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </motion.div>
          </motion.h2>
          <motion.p 
            className="text-slate-600 flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Visual analytics of table performance and customer patterns</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Target className="w-4 h-4 text-green-500" />
            </motion.div>
          </motion.p>
        </div>

        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {/* Enhanced Time Range Selector */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md border-slate-200 shadow-xl">
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Enhanced Auto Refresh Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 ${
                autoRefresh ? 'border-green-400 text-green-700 bg-green-50/80' : 'hover:border-blue-300'
              }`}
            >
              <motion.div
                animate={{ rotate: autoRefresh ? 360 : 0 }}
                transition={{ duration: 2, repeat: autoRefresh ? Infinity : 0, ease: "linear" }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
              </motion.div>
              Auto Refresh
            </Button>
          </motion.div>

          {/* Animation Control Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPulseAnimation(!pulseAnimation)}
              className={`bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 ${
                pulseAnimation ? 'border-purple-400 text-purple-700 bg-purple-50/80' : 'hover:border-purple-300'
              }`}
            >
              <motion.div
                animate={{ 
                  rotate: pulseAnimation ? [0, 360] : 0,
                  scale: pulseAnimation ? [1, 1.1, 1] : 1
                }}
                transition={{ 
                  duration: 2, 
                  repeat: pulseAnimation ? Infinity : 0, 
                  ease: "easeInOut" 
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
              </motion.div>
              Animations
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Premium Tabbed Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-1">
            <TabsTrigger 
              value="visualization" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all duration-300"
            >
              <motion.div
                animate={{ 
                  rotate: activeTab === "visualization" ? [0, 5, -5, 0] : 0,
                  scale: activeTab === "visualization" ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <Thermometer className="w-4 h-4" />
              </motion.div>
              <span>Heat Map Visualization</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all duration-300"
            >
              <motion.div
                animate={{ 
                  rotate: activeTab === "analytics" ? [0, 360] : 0,
                  scale: activeTab === "analytics" ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <BarChart3 className="w-4 h-4" />
              </motion.div>
              <span>Analytics Dashboard</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="visualization" className="space-y-6">
          {/* Premium View Mode Selection */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <Card className="bg-white/60 backdrop-blur-md border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <motion.span 
                    className="text-lg font-semibold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent flex items-center space-x-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.4 }}
                  >
                    <Eye className="w-5 h-5 text-blue-500" />
                    <span>View Mode:</span>
                  </motion.span>
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-56 bg-white/80 backdrop-blur-sm border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
                        <SelectValue placeholder="View Mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md border-slate-200 shadow-xl">
                        {viewModeOptions.map((option, index) => (
                          <motion.div
                            key={option.value}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.3 }}
                          >
                            <SelectItem 
                              value={option.value} 
                              className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                <option.icon className="w-4 h-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          </motion.div>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </div>

                {/* View Mode Legend */}
                <motion.div 
                  className="mt-4 flex justify-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6, duration: 0.4 }}
                >
                  <div className="flex items-center space-x-6 text-sm">
                    <motion.div 
                      className="flex items-center space-x-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-md"></div>
                      <span className="text-slate-600">Low Activity</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center space-x-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-md"></div>
                      <span className="text-slate-600">Medium Activity</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center space-x-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-md"></div>
                      <span className="text-slate-600">High Activity</span>
                    </motion.div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

      {/* Premium Heat Map Visualization */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <div className="lg:col-span-2">
          <Card className="bg-white/70 backdrop-blur-lg border-slate-200 shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 backdrop-blur-sm">
              <CardTitle className="flex items-center justify-between">
                <motion.span 
                  className="text-xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent flex items-center space-x-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Target className="w-6 h-6 text-blue-600" />
                  </motion.div>
                  Restaurant Floor Plan
                </motion.span>
                <motion.div 
                  className="flex items-center space-x-4 text-sm"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.2, duration: 0.5 }}
                >
                  <motion.div 
                    className="flex items-center space-x-2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.div 
                      className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-lg"
                      animate={{ 
                        boxShadow: ['0 0 5px rgba(59, 130, 246, 0.5)', '0 0 15px rgba(59, 130, 246, 0.8)', '0 0 5px rgba(59, 130, 246, 0.5)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    ></motion.div>
                    <span className="font-medium text-slate-700">Low</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center space-x-2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.div 
                      className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg"
                      animate={{ 
                        boxShadow: ['0 0 5px rgba(234, 179, 8, 0.5)', '0 0 15px rgba(234, 179, 8, 0.8)', '0 0 5px rgba(234, 179, 8, 0.5)']
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    ></motion.div>
                    <span className="font-medium text-slate-700">Medium</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center space-x-2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.div 
                      className="w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"
                      animate={{ 
                        boxShadow: ['0 0 5px rgba(239, 68, 68, 0.5)', '0 0 15px rgba(239, 68, 68, 0.8)', '0 0 5px rgba(239, 68, 68, 0.5)']
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    ></motion.div>
                    <span className="font-medium text-slate-700">High</span>
                  </motion.div>
                </motion.div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <motion.div 
                className="relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 rounded-lg m-4 border border-slate-200/50 shadow-inner" 
                style={{ height: '480px' }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  });
                }}
                onMouseLeave={() => setHoveredTable(null)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.4, duration: 0.6 }}
                whileHover={{ scale: 1.01 }}
              >
                {/* Premium Animated Restaurant Layout */}
                <motion.svg 
                  ref={svgRef}
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 500 400"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {/* Animated gradient definitions */}
                  <defs>
                    <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#f8fafc', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#e2e8f0', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="kitchenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#f1f5f9', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="shadow">
                      <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.3)"/>
                    </filter>
                  </defs>

                  {/* Animated background with glassmorphism */}
                  <motion.rect 
                    x="20" y="20" width="460" height="360" 
                    fill="url(#backgroundGradient)" 
                    stroke="rgba(148, 163, 184, 0.3)" 
                    strokeWidth="2" 
                    rx="12"
                    filter="url(#shadow)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  />

                  {/* Animated kitchen area */}
                  <motion.rect 
                    x="400" y="40" width="70" height="100" 
                    fill="url(#kitchenGradient)" 
                    stroke="rgba(148, 163, 184, 0.4)" 
                    strokeWidth="1" 
                    rx="6"
                    initial={{ x: 500, opacity: 0 }}
                    animate={{ x: 400, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                  />
                  <motion.text 
                    x="435" y="95" 
                    textAnchor="middle" 
                    className="text-xs fill-slate-600 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    Kitchen
                  </motion.text>

                  {/* Animated entrance with glow */}
                  <motion.rect 
                    x="220" y="20" width="60" height="8" 
                    fill="#10b981" 
                    rx="4"
                    filter="url(#glow)"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  />
                  <motion.text 
                    x="250" y="15" 
                    textAnchor="middle" 
                    className="text-xs fill-slate-600 font-medium"
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 15, opacity: 1 }}
                    transition={{ delay: 1, duration: 0.4 }}
                  >
                    Entrance
                  </motion.text>

                  {/* Animated tables with enhanced effects */}
                  <AnimatePresence>
                    {heatData.map((table, index) => {
                      const heatScore = getHeatScoreForMode(table, viewMode);
                      const colorData = getHeatColor(heatScore, viewMode);
                      const isHovered = hoveredTable?.tableId === table.tableId;
                      const isSelected = selectedTable?.tableId === table.tableId;

                      return (
                        <motion.g 
                          key={table.tableId}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            delay: 0.8 + index * 0.1, 
                            duration: 0.6,
                            type: "spring",
                            stiffness: 100
                          }}
                        >
                          {/* Animated heat aura */}
                          <motion.circle
                            cx={table.position.x}
                            cy={table.position.y}
                            r={pulseAnimation ? "35" : "30"}
                            fill={colorData.fill}
                            opacity={0.3}
                            animate={{
                              r: pulseAnimation ? [30, 35, 30] : 30,
                              opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Main table circle with enhanced effects */}
                          <motion.circle
                            cx={table.position.x}
                            cy={table.position.y}
                            r="25"
                            fill={colorData.fill}
                            stroke={isHovered ? "#3b82f6" : colorData.stroke}
                            strokeWidth={isHovered ? "3" : "2"}
                            filter={isHovered ? "url(#glow)" : "url(#shadow)"}
                            className="cursor-pointer"
                            onClick={() => setSelectedTable(table)}
                            onMouseEnter={() => setHoveredTable(table)}
                            whileHover={{ 
                              scale: 1.1,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                            animate={{
                              strokeWidth: isSelected ? [2, 4, 2] : (isHovered ? "3" : "2")
                            }}
                            transition={{
                              strokeWidth: { duration: 0.8, repeat: isSelected ? Infinity : 0 }
                            }}
                          />

                          {/* Table number with animation */}
                          <motion.text
                            x={table.position.x}
                            y={table.position.y - 5}
                            textAnchor="middle"
                            className="text-sm font-bold fill-slate-800 pointer-events-none"
                            initial={{ opacity: 0, y: table.position.y }}
                            animate={{ opacity: 1, y: table.position.y - 5 }}
                            transition={{ delay: 1 + index * 0.1, duration: 0.4 }}
                          >
                            {table.tableId}
                          </motion.text>

                          {/* Capacity indicator with animation */}
                          <motion.text
                            x={table.position.x}
                            y={table.position.y + 8}
                            textAnchor="middle"
                            className="text-xs fill-slate-600 pointer-events-none"
                            initial={{ opacity: 0, y: table.position.y + 20 }}
                            animate={{ opacity: 1, y: table.position.y + 8 }}
                            transition={{ delay: 1.2 + index * 0.1, duration: 0.4 }}
                          >
                            {table.capacity}p
                          </motion.text>

                          {/* Animated status indicator with pulse */}
                          <motion.circle
                            cx={table.position.x + 20}
                            cy={table.position.y - 20}
                            r="4"
                            fill={table.status === 'occupied' ? '#ef4444' : 
                                 table.status === 'reserved' ? '#f97316' : 
                                 table.status === 'maintenance' ? '#6b7280' : '#10b981'}
                            filter="url(#glow)"
                            animate={{
                              scale: table.status === 'occupied' ? [1, 1.3, 1] : 1,
                              opacity: table.status === 'occupied' ? [1, 0.7, 1] : 1
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: table.status === 'occupied' ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.4 + index * 0.1, duration: 0.3 }}
                          />

                          {/* Heat score indicator */}
                          {viewMode === 'heat' && heatScore > 70 && (
                            <motion.g
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.6 + index * 0.1, duration: 0.4 }}
                            >
                              <Sparkles 
                                x={table.position.x - 15} 
                                y={table.position.y - 25} 
                                width="12" 
                                height="12" 
                                className="fill-yellow-400"
                              />
                            </motion.g>
                          )}
                        </motion.g>
                      );
                    })}
                  </AnimatePresence>
                </motion.svg>

                {/* Interactive Tooltip */}
                <HeatMapTooltip
                  table={hoveredTable}
                  viewMode={viewMode}
                  position={mousePosition}
                  visible={!!hoveredTable}
                />
              </motion.div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Side Panel - Table Details */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.6, duration: 0.6 }}
        >
          <AnimatePresence mode="wait">
            {selectedTable ? (
              <motion.div
                key={selectedTable.tableId}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-white/80 backdrop-blur-lg border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border-b border-slate-200/50">
                    <CardTitle className="flex items-center justify-between">
                      <motion.span 
                        className="text-lg font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                      >
                        {selectedTable.tableName}
                      </motion.span>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Badge className={`${getStatusColor(selectedTable.status)} shadow-lg`}>
                          {selectedTable.status.toUpperCase()}
                        </Badge>
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <motion.div 
                      className="grid grid-cols-2 gap-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <motion.div 
                        className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200/50 shadow-sm"
                        whileHover={{ scale: 1.05, shadow: "0 10px 25px rgba(59, 130, 246, 0.15)" }}
                      >
                        <motion.div 
                          className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent"
                          animate={{ 
                            scale: [1, 1.05, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {Math.round(selectedTable.heatScore)}
                        </motion.div>
                        <div className="text-xs text-blue-600 font-medium mt-1">Heat Score</div>
                      </motion.div>
                      <motion.div 
                        className="text-center bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200/50 shadow-sm"
                        whileHover={{ scale: 1.05, shadow: "0 10px 25px rgba(34, 197, 94, 0.15)" }}
                      >
                        <motion.div 
                          className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"
                          animate={{ 
                            scale: [1, 1.05, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        >
                          {Math.round(selectedTable.occupancyRate)}%
                        </motion.div>
                        <div className="text-xs text-green-600 font-medium mt-1">Occupancy</div>
                      </motion.div>
                    </motion.div>

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
          </motion.div>
        </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <HeatMapAnalytics heatData={heatData} timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}