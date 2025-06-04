import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/dashboard-sidebar";
import BookingCalendar from "@/components/booking-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users, Map, List } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, restaurant, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'layout'>('calendar');
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user || !restaurant) {
      setLocation("/login");
    }
  }, [user, restaurant, setLocation]);

  // Fetch today's bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "bookings", today],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings?date=${today}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Fetch all bookings for the month
  const { data: allBookings = [], isLoading: allBookingsLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`],
    enabled: !!restaurant?.id && !!restaurant.tenantId,
  });

  // Fetch tables
  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`],
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id
  });

  // Fetch bookings for selected date
  const { data: selectedDateBookings = [], isLoading: selectedDateBookingsLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings?date=${format(selectedDate, 'yyyy-MM-dd')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/rooms`);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant,
  });

  // Load saved table layout
  const { data: savedLayout } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "table-layout", selectedRoom],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/table-layout?room=${selectedRoom}`);
      if (!response.ok) throw new Error("Failed to fetch table layout");
      return response.json();
    },
    enabled: !!restaurant && !!selectedRoom,
  });

  // Auto-select first room when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id.toString());
    }
  }, [rooms, selectedRoom]);

  const getAvailableTablesCount = () => {
    if (!tables || !Array.isArray(todayBookings)) return 0;
    const currentHour = new Date().getHours();
    const bookedTableIds = todayBookings
      .filter((booking: any) => {
        const bookingHour = new Date(booking.bookingDate).getHours();
        return Math.abs(bookingHour - currentHour) < 2; // Within 2 hours
      })
      .map((booking: any) => booking.tableId);

    return tables.filter((table: any) => !bookedTableIds.includes(table.id)).length;
  };

  const isLoading = selectedDateBookingsLoading || allBookingsLoading || tablesLoading;

  if (!user || !restaurant) {
    return null;
  }

  const getTableStyle = (table: any, position: any) => {
    const baseStyle = {
      width: position?.shape === "rectangle" ? "80px" : "60px",
      height: "60px",
      position: "absolute" as const,
      left: `${position?.x}px`,
      top: `${position?.y}px`,
      transform: `rotate(${position?.rotation || 0}deg)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "bold",
      color: "white",
      userSelect: "none" as const,
      borderRadius: position?.shape === "circle" ? "50%" : position?.shape === "rectangle" ? "8px" : "4px",
      border: "2px solid white",
      cursor: "pointer",
    };

    // Check if table has bookings for selected date
    const tableBookings = selectedDateBookings.filter(booking => booking.tableId === table.id);
    const hasBookings = tableBookings.length > 0;

    return {
      ...baseStyle,
      backgroundColor: hasBookings ? "#EF4444" : "#16a34a", // Red if booked, green if available
      boxShadow: hasBookings ? "0 4px 12px rgba(239, 68, 68, 0.4)" : "0 4px 12px rgba(22, 163, 74, 0.4)",
    };
  };

  const getTableBookings = (tableId: number) => {
    return selectedDateBookings.filter(booking => booking.tableId === tableId);
  };

  const renderTableLayout = () => {
    const tablePositions = savedLayout?.positions || {};
    const tablesWithPositions = tables?.filter(table => tablePositions[table.id]) || [];

    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Table Layout - {rooms.find((room: any) => room.id.toString() === selectedRoom)?.name || "Select a room"}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem key={`room-${room.id}`} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} - Red tables are booked, green tables are available
          </p>
        </CardHeader>
        <CardContent>
          <div
            className="relative bg-gray-50 border-2 border-gray-200 rounded-lg"
            style={{ height: "500px", minHeight: "400px" }}
          >
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, #666 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {tablesWithPositions.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">No table layout configured</p>
                  <p className="text-sm">Visit the Table Plan page to set up your layout</p>
                </div>
              </div>
            ) : (
              <>
                {/* Placed Tables */}
                {tablesWithPositions.map((table) => {
                  const position = tablePositions[table.id];
                  const tableBookings = getTableBookings(table.id);

                  return (
                    <div
                      key={`positioned-table-${table.id}`}
                      style={getTableStyle(table, position)}
                      className="shadow-lg hover:shadow-xl transition-shadow group"
                      title={
                        tableBookings.length > 0
                          ? `Table ${table.tableNumber} - ${tableBookings.length} booking(s): ${tableBookings.map(b => `${b.customerName} (${b.guestCount} guests)`).join(', ')}`
                          : `Table ${table.tableNumber} - Available (${table.capacity} seats)`
                      }
                    >
                      <div className="text-center relative">
                        <div className="font-bold">{table.tableNumber}</div>
                        <div className="text-xs opacity-80">
                          {tableBookings.length > 0 ? `${tableBookings.length} booking(s)` : `${table.capacity} seats`}
                        </div>
                        
                        {/* Booking details tooltip on hover */}
                        {tableBookings.length > 0 && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                            {tableBookings.map(booking => (
                              <div key={booking.id}>
                                {booking.startTime} - {booking.customerName} ({booking.guestCount})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Legend and Status */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>Booked</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {tablesWithPositions.length} tables positioned • {selectedDateBookings.length} bookings today
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        bookings={(allBookings as any) || []}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {format(selectedDate, 'EEEE dd MMMM yyyy')}
            </h1>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button 
                variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}
              >
                <List className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button 
                variant={viewMode === 'layout' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('layout')}
                className={viewMode === 'layout' ? 'bg-white shadow-sm' : ''}
              >
                <Map className="h-4 w-4 mr-2" />
                Layout
              </Button>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New booking
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Walk in
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Input 
              type="text" 
              placeholder="Customer search" 
              className="w-64"
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Bookings</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(todayBookings) ? todayBookings.length : 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tables</p>
                    <p className="text-2xl font-bold">
                      {tables?.length || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available Now</p>
                    <p className="text-2xl font-bold">
                      {getAvailableTablesCount()}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">
                      {allBookings?.length || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Interface */}
        <div className="flex-1 p-6">
          {viewMode === 'layout' ? (
            renderTableLayout()
          ) : (
            <BookingCalendar 
              selectedDate={selectedDate}
              bookings={(selectedDateBookings as any) || []}
              allBookings={(allBookings as any) || []}
              tables={(tables as any) || []}
              isLoading={isLoading}
              onDateSelect={setSelectedDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}