import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Timer, Users, ChefHat, Zap, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface KitchenPerformanceSparklineProps {
  restaurantId: number;
  tenantId: number;
}

interface PerformanceMetrics {
  timestamp: string;
  efficiency: number;
  orderThroughput: number;
  averageTime: number;
  activeOrders: number;
  completionRate: number;
  staffUtilization: number;
  stationEfficiency: number;
  customerSatisfaction: number;
}

interface SparklineData {
  time: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

export function KitchenPerformanceSparkline({ restaurantId, tenantId }: KitchenPerformanceSparklineProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '12h' | '24h'>('4h');
  const [selectedMetric, setSelectedMetric] = useState<string>('efficiency');
  const [animationPhase, setAnimationPhase] = useState<number>(0);

  // Fetch real-time performance data
  const { data: performanceData = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/performance-sparkline`, timeRange],
    queryFn: () => apiRequest('GET', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/performance-sparkline?timeRange=${timeRange}`),
    refetchInterval: 15000, // Update every 15 seconds
  });

  // Animation cycle for playful effects
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Generate sparkline data for different metrics
  const generateSparklineData = (metric: string): SparklineData[] => {
    if (!performanceData.length) return [];
    
    return performanceData.map((data: PerformanceMetrics, index: number) => {
      const value = data[metric as keyof PerformanceMetrics] as number;
      const prevValue = index > 0 ? (performanceData[index - 1][metric as keyof PerformanceMetrics] as number) : value;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (value > prevValue) trend = 'up';
      else if (value < prevValue) trend = 'down';

      return {
        time: new Date(data.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        value,
        trend
      };
    });
  };

  // Performance metrics configuration
  const metricsConfig = [
    {
      key: 'efficiency',
      title: 'Kitchen Efficiency',
      icon: Zap,
      color: '#10B981',
      suffix: '%',
      target: 85,
      description: 'Overall kitchen performance'
    },
    {
      key: 'orderThroughput',
      title: 'Order Throughput',
      icon: Activity,
      color: '#3B82F6',
      suffix: '/h',
      target: 25,
      description: 'Orders completed per hour'
    },
    {
      key: 'averageTime',
      title: 'Avg Prep Time',
      icon: Timer,
      color: '#F59E0B',
      suffix: 'm',
      target: 22,
      description: 'Average preparation time'
    },
    {
      key: 'staffUtilization',
      title: 'Staff Utilization',
      icon: Users,
      color: '#8B5CF6',
      suffix: '%',
      target: 75,
      description: 'Staff productivity level'
    },
    {
      key: 'completionRate',
      title: 'Completion Rate',
      icon: Target,
      color: '#06B6D4',
      suffix: '%',
      target: 95,
      description: 'Orders completed on time'
    },
    {
      key: 'customerSatisfaction',
      title: 'Satisfaction',
      icon: ChefHat,
      color: '#EC4899',
      suffix: '%',
      target: 90,
      description: 'Customer satisfaction score'
    }
  ];

  const selectedConfig = metricsConfig.find(m => m.key === selectedMetric) || metricsConfig[0];
  const sparklineData = generateSparklineData(selectedMetric);
  const currentValue = sparklineData.length > 0 ? sparklineData[sparklineData.length - 1].value : 0;
  const previousValue = sparklineData.length > 1 ? sparklineData[sparklineData.length - 2].value : currentValue;
  const trend = currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'stable';
  const trendPercentage = previousValue > 0 ? Math.abs(((currentValue - previousValue) / previousValue) * 100) : 0;

  // Playful color variations
  const getAnimatedColor = (baseColor: string, phase: number) => {
    const colors = [baseColor, `${baseColor}CC`, `${baseColor}AA`, `${baseColor}CC`];
    return colors[phase];
  };

  // Performance status based on target
  const getPerformanceStatus = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return { status: 'excellent', color: 'bg-green-500' };
    if (percentage >= 85) return { status: 'good', color: 'bg-blue-500' };
    if (percentage >= 70) return { status: 'fair', color: 'bg-yellow-500' };
    return { status: 'needs-improvement', color: 'bg-red-500' };
  };

  const performanceStatus = getPerformanceStatus(currentValue, selectedConfig.target);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric Selection */}
      <div className="flex flex-wrap gap-2">
        {metricsConfig.map((metric) => {
          const Icon = metric.icon;
          const isSelected = selectedMetric === metric.key;
          
          return (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isSelected 
                  ? `bg-opacity-20 text-gray-900 border-2 shadow-lg` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: isSelected ? `${metric.color}20` : undefined,
                borderColor: isSelected ? metric.color : 'transparent'
              }}
            >
              <Icon 
                className={`w-4 h-4 transition-all duration-300 ${
                  isSelected ? 'animate-pulse' : ''
                }`}
                style={{ color: isSelected ? metric.color : undefined }}
              />
              {metric.title}
            </button>
          );
        })}
      </div>

      {/* Main Sparkline Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg transition-all duration-500"
                style={{ 
                  backgroundColor: `${getAnimatedColor(selectedConfig.color, animationPhase)}20`
                }}
              >
                <selectedConfig.icon 
                  className="w-5 h-5 transition-all duration-500" 
                  style={{ color: getAnimatedColor(selectedConfig.color, animationPhase) }}
                />
              </div>
              <div>
                <CardTitle className="text-lg">{selectedConfig.title}</CardTitle>
                <p className="text-sm text-gray-600">{selectedConfig.description}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {currentValue.toFixed(1)}{selectedConfig.suffix}
                </span>
                {trend !== 'stable' && (
                  <div className={`flex items-center gap-1 text-sm ${
                    trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {trendPercentage.toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  className={`${performanceStatus.color} text-white capitalize`}
                >
                  {performanceStatus.status.replace('-', ' ')}
                </Badge>
                <span className="text-xs text-gray-500">
                  Target: {selectedConfig.target}{selectedConfig.suffix}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* Sparkline Chart */}
          <div className="h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedConfig.color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={selectedConfig.color} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={selectedConfig.color}
                  strokeWidth={3}
                  fill={`url(#gradient-${selectedMetric})`}
                  dot={{ r: 4, fill: selectedConfig.color }}
                  activeDot={{ r: 6, fill: selectedConfig.color, stroke: '#fff', strokeWidth: 2 }}
                />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                />
                <YAxis hide />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-3 gap-4">
            {/* Current Performance */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Current</div>
              <div className="text-lg font-semibold" style={{ color: selectedConfig.color }}>
                {currentValue.toFixed(1)}{selectedConfig.suffix}
              </div>
            </div>
            
            {/* Target Progress */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Target Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${Math.min((currentValue / selectedConfig.target) * 100, 100)}%`,
                    backgroundColor: selectedConfig.color
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((currentValue / selectedConfig.target) * 100).toFixed(0)}%
              </div>
            </div>
            
            {/* Trend Indicator */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Trend</div>
              <div className={`text-lg font-semibold ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                {trend !== 'stable' && ` ${trendPercentage.toFixed(1)}%`}
              </div>
            </div>
          </div>

          {/* Time Range Selection */}
          <div className="mt-4 flex justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['1h', '4h', '12h', '24h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    timeRange === range 
                      ? 'bg-white shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mini Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metricsConfig.slice(0, 6).map((metric, index) => {
          const data = generateSparklineData(metric.key);
          const value = data.length > 0 ? data[data.length - 1].value : 0;
          const status = getPerformanceStatus(value, metric.target);
          
          return (
            <Card 
              key={metric.key} 
              className={`p-3 cursor-pointer transition-all duration-300 hover:shadow-md ${
                selectedMetric === metric.key ? 'ring-2 ring-opacity-50' : ''
              }`}
              style={{
                ringColor: selectedMetric === metric.key ? metric.color : undefined
              }}
              onClick={() => setSelectedMetric(metric.key)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 truncate">{metric.title}</div>
                  <div className="text-sm font-semibold">
                    {value.toFixed(1)}{metric.suffix}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${status.color}`} />
              </div>
              
              <div className="h-8 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.slice(-10)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}