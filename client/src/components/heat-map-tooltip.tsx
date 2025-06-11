import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  TrendingUp 
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

interface HeatMapTooltipProps {
  table: TableHeatData;
  viewMode: string;
  position: { x: number; y: number };
  visible: boolean;
}

export default function HeatMapTooltip({ table, viewMode, position, visible }: HeatMapTooltipProps) {
  if (!visible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-red-500 text-white';
      case 'reserved': return 'bg-orange-500 text-white';
      case 'maintenance': return 'bg-gray-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getPrimaryMetric = () => {
    switch (viewMode) {
      case 'occupancy':
        return {
          value: `${table.occupancyRate || 0}%`,
          label: 'Occupancy Rate',
          icon: <Users className="w-4 h-4" />
        };
      case 'revenue':
        return {
          value: `$${table.revenueGenerated || 0}`,
          label: 'Revenue Generated',
          icon: <DollarSign className="w-4 h-4" />
        };
      default:
        return {
          value: (table.heatScore || 0).toString(),
          label: 'Heat Score',
          icon: <TrendingUp className="w-4 h-4" />
        };
    }
  };

  const primaryMetric = getPrimaryMetric();

  return (
    <div 
      className="absolute z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: position.x > 300 ? 'translateX(-100%)' : 'none'
      }}
    >
      <Card className="shadow-lg border-2 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-3 space-y-2 min-w-64">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">{table.tableName}</div>
            <Badge className={getStatusColor(table.status)}>
              {table.status.toUpperCase()}
            </Badge>
          </div>

          {/* Primary Metric */}
          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
            {primaryMetric.icon}
            <div>
              <div className="text-lg font-bold text-blue-700">
                {primaryMetric.value}
              </div>
              <div className="text-xs text-blue-600">
                {primaryMetric.label}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Capacity:</span>
              <span className="font-medium">{table.capacity || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Bookings:</span>
              <span className="font-medium">{table.bookingCount || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Avg Stay:</span>
              <span className="font-medium">{table.averageStayDuration || 0}m</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium">${table.revenueGenerated || 0}</span>
            </div>
          </div>

          {/* Peak Hours */}
          {table.peakHours && table.peakHours.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Peak Hours:</div>
              <div className="flex flex-wrap gap-1">
                {table.peakHours.map((hour, index) => (
                  <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                    {hour}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}