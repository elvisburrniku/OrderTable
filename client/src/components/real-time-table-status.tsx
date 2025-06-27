import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  MapPin,
  Timer,
  Calendar,
  Utensils,
  RefreshCw
} from 'lucide-react';
import { format, addMinutes } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { formatTime } from "@/lib/time-formatter";

interface TableStatus {
  id: number;
  tableNumber: string;
  capacity: number;
  roomId: number;
  roomName?: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  currentBooking?: {
    id: number;
    customerName: string;
    customerEmail: string;
    guestCount: number;
    startTime: string;
    endTime: string;
    status: string;
    timeRemaining?: number; // minutes
    isOvertime?: boolean;
  };
  nextBooking?: {
    id: number;
    customerName: string;
    startTime: string;
    guestCount: number;
    timeUntilNext?: number; // minutes
  };
  lastUpdated: string;
}

interface RealTimeTableStatusProps {
  restaurantId: number;
  tenantId: number;
  showCompactView?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function RealTimeTableStatus({ 
  restaurantId, 
  tenantId, 
  showCompactView = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: RealTimeTableStatusProps) {
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch real-time table status
  const { data: tableStatuses = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables/real-time-status`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables/real-time-status`);
      if (!response.ok) throw new Error("Failed to fetch table status");
      const data = await response.json();
      setLastRefresh(new Date());
      return data;
    },
    enabled: !!tenantId && !!restaurantId,
    refetchInterval: isAutoRefreshing ? refreshInterval : false,
    refetchIntervalInBackground: true,
  });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cleaning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'occupied': return <Users className="w-4 h-4" />;
      case 'reserved': return <Clock className="w-4 h-4" />;
      case 'cleaning': return <Utensils className="w-4 h-4" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes < 0) return 'Overtime';
    if (minutes === 0) return 'Ending now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAvailabilityStats = () => {
    const stats = {
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      maintenance: 0,
      total: tableStatuses.length
    };

    tableStatuses.forEach(table => {
      stats[table.status as keyof typeof stats]++;
    });

    return stats;
  };

  const stats = getAvailabilityStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading table status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showCompactView) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Table Status</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {stats.available}/{stats.total} Available
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {tableStatuses.slice(0, 12).map((table) => (
              <div
                key={table.id}
                className={`p-2 rounded-lg border text-center ${getStatusColor(table.status)}`}
              >
                <div className="flex items-center justify-center mb-1">
                  {getStatusIcon(table.status)}
                  <span className="ml-1 font-medium text-sm">T{table.tableNumber}</span>
                </div>
                <div className="text-xs">
                  {table.currentBooking ? 
                    `${table.currentBooking.guestCount}/${table.capacity}` : 
                    `0/${table.capacity}`
                  }
                </div>
              </div>
            ))}
          </div>
          {tableStatuses.length > 12 && (
            <div className="text-center mt-3 text-sm text-muted-foreground">
              +{tableStatuses.length - 12} more tables
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  const { generalSettings } = useSettings();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Real-Time Table Status</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {format(lastRefresh, 'HH:mm:ss')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={isAutoRefreshing}
                  onCheckedChange={setIsAutoRefreshing}
                />
                <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Overview */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
              <div className="text-sm text-muted-foreground">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
              <div className="text-sm text-muted-foreground">Reserved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.cleaning}</div>
              <div className="text-sm text-muted-foreground">Cleaning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.maintenance}</div>
              <div className="text-sm text-muted-foreground">Maintenance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tableStatuses.map((table) => (
          <Card key={table.id} className={`border-l-4 ${
            table.status === 'available' ? 'border-l-green-500' :
            table.status === 'occupied' ? 'border-l-red-500' :
            table.status === 'reserved' ? 'border-l-yellow-500' :
            table.status === 'cleaning' ? 'border-l-blue-500' :
            'border-l-gray-500'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Table {table.tableNumber}</span>
                  {table.roomName && (
                    <Badge variant="outline" className="text-xs">
                      {table.roomName}
                    </Badge>
                  )}
                </div>
                <Badge className={getStatusColor(table.status)}>
                  {getStatusIcon(table.status)}
                  <span className="ml-1 capitalize">{table.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Capacity Info */}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Capacity: {table.capacity} guests
                  {table.currentBooking && (
                    <span className="ml-2 text-muted-foreground">
                      (Currently: {table.currentBooking.guestCount})
                    </span>
                  )}
                </span>
              </div>

              {/* Current Booking */}
              {table.currentBooking && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-red-800">Current Booking</span>
                    {table.currentBooking.timeRemaining !== undefined && (
                      <Badge 
                        variant={table.currentBooking.isOvertime ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        <Timer className="w-3 h-3 mr-1" />
                        {formatTimeRemaining(table.currentBooking.timeRemaining)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{table.currentBooking.customerName}</div>
                    <div className="text-muted-foreground">
                      {table.currentBooking.startTime} - {table.currentBooking.endTime}
                    </div>
                    <div className="text-muted-foreground">
                      {table.currentBooking.guestCount} guests
                    </div>
                  </div>
                </div>
              )}

              {/* Next Booking */}
              {table.nextBooking && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-yellow-800">Next Booking</span>
                    {table.nextBooking.timeUntilNext !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        In {formatTimeRemaining(table.nextBooking.timeUntilNext)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{table.nextBooking.customerName}</div>
                    <div className="text-muted-foreground">
                      At {table.nextBooking.startTime}
                    </div>
                    <div className="text-muted-foreground">
                      {table.nextBooking.guestCount} guests
                    </div>
                  </div>
                </div>
              )}

              {/* Available Table */}
              {table.status === 'available' && !table.nextBooking && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-green-800">
                    Available for immediate seating
                  </div>
                </div>
              )}

              {/* Cleaning/Maintenance Status */}
              {(table.status === 'cleaning' || table.status === 'maintenance') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  {table.status === 'cleaning' ? (
                    <Utensils className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  )}
                  <div className="text-sm font-medium text-blue-800 capitalize">
                    {table.status} in progress
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}