import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Clock, 
  DollarSign,
  Target,
  Activity,
  BarChart3
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

interface HeatMapAnalyticsProps {
  heatData: TableHeatData[];
  timeRange: string;
}

export default function HeatMapAnalytics({ heatData, timeRange }: HeatMapAnalyticsProps) {
  if (!heatData || heatData.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No table data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate overall metrics
  const totalTables = heatData.length;
  const occupiedTables = heatData.filter(t => t.status === 'occupied').length;
  const reservedTables = heatData.filter(t => t.status === 'reserved').length;
  const availableTables = heatData.filter(t => t.status === 'available').length;
  
  const totalRevenue = heatData.reduce((sum, t) => sum + t.revenueGenerated, 0);
  const totalBookings = heatData.reduce((sum, t) => sum + t.bookingCount, 0);
  const avgOccupancy = heatData.reduce((sum, t) => sum + t.occupancyRate, 0) / totalTables;
  const avgHeatScore = heatData.reduce((sum, t) => sum + t.heatScore, 0) / totalTables;

  // Find top performing tables
  const topRevenueTable = heatData.reduce((max, table) => 
    table.revenueGenerated > max.revenueGenerated ? table : max
  );
  const topOccupancyTable = heatData.reduce((max, table) => 
    table.occupancyRate > max.occupancyRate ? table : max
  );
  const topBookingsTable = heatData.reduce((max, table) => 
    table.bookingCount > max.bookingCount ? table : max
  );

  // Performance categories
  const highPerformers = heatData.filter(t => t.heatScore >= 70);
  const mediumPerformers = heatData.filter(t => t.heatScore >= 40 && t.heatScore < 70);
  const lowPerformers = heatData.filter(t => t.heatScore < 40);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'text-red-600 bg-red-100';
      case 'reserved': return 'text-orange-600 bg-orange-100';
      case 'maintenance': return 'text-gray-600 bg-gray-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold text-blue-600">{Math.round(avgOccupancy)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-purple-600">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Heat Score</p>
                <p className="text-2xl font-bold text-orange-600">{Math.round(avgHeatScore)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Current Table Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableTables}</div>
              <div className="text-sm text-muted-foreground">Available</div>
              <Progress value={(availableTables / totalTables) * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{occupiedTables}</div>
              <div className="text-sm text-muted-foreground">Occupied</div>
              <Progress value={(occupiedTables / totalTables) * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{reservedTables}</div>
              <div className="text-sm text-muted-foreground">Reserved</div>
              <Progress value={(reservedTables / totalTables) * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {totalTables - availableTables - occupiedTables - reservedTables}
              </div>
              <div className="text-sm text-muted-foreground">Maintenance</div>
              <Progress 
                value={((totalTables - availableTables - occupiedTables - reservedTables) / totalTables) * 100} 
                className="mt-2 h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Performance Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{highPerformers.length}</div>
              <div className="text-sm text-muted-foreground mb-2">High Performers</div>
              <div className="text-xs text-green-600">Heat Score ≥ 70</div>
              <Progress value={(highPerformers.length / totalTables) * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{mediumPerformers.length}</div>
              <div className="text-sm text-muted-foreground mb-2">Medium Performers</div>
              <div className="text-xs text-yellow-600">Heat Score 40-69</div>
              <Progress value={(mediumPerformers.length / totalTables) * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{lowPerformers.length}</div>
              <div className="text-sm text-muted-foreground mb-2">Low Performers</div>
              <div className="text-xs text-red-600">Heat Score &lt; 40</div>
              <Progress value={(lowPerformers.length / totalTables) * 100} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Top Performing Tables</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Highest Revenue</span>
                <Badge className={getStatusColor(topRevenueTable.status)}>
                  {topRevenueTable.status}
                </Badge>
              </div>
              <div className="text-lg font-bold text-green-700">{topRevenueTable.tableName}</div>
              <div className="text-sm text-green-600">${topRevenueTable.revenueGenerated}</div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Highest Occupancy</span>
                <Badge className={getStatusColor(topOccupancyTable.status)}>
                  {topOccupancyTable.status}
                </Badge>
              </div>
              <div className="text-lg font-bold text-blue-700">{topOccupancyTable.tableName}</div>
              <div className="text-sm text-blue-600">{topOccupancyTable.occupancyRate}%</div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">Most Bookings</span>
                <Badge className={getStatusColor(topBookingsTable.status)}>
                  {topBookingsTable.status}
                </Badge>
              </div>
              <div className="text-lg font-bold text-purple-700">{topBookingsTable.tableName}</div>
              <div className="text-sm text-purple-600">{topBookingsTable.bookingCount} bookings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Performance List */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Table Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {heatData
              .sort((a, b) => b.heatScore - a.heatScore)
              .map((table) => (
                <div 
                  key={table.tableId} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium">
                      {table.tableId}
                    </div>
                    <div>
                      <div className="font-medium">{table.tableName}</div>
                      <div className="text-sm text-muted-foreground">
                        {table.capacity} seats • {table.bookingCount} bookings
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`font-medium ${getPerformanceColor(table.heatScore)}`}>
                        {table.heatScore}
                      </div>
                      <div className="text-xs text-muted-foreground">Heat Score</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{table.occupancyRate}%</div>
                      <div className="text-xs text-muted-foreground">Occupancy</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${table.revenueGenerated}</div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                    <Badge className={getStatusColor(table.status)}>
                      {table.status}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}