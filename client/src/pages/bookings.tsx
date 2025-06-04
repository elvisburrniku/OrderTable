import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, Search, Filter, Plus, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Bookings() {
  const { user, restaurant } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: "19:00",
    endTime: "21:00",
    tableId: "",
    notes: ""
  });
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [suggestedTable, setSuggestedTable] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`],
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id,
    retry: 1,
    staleTime: 30000 // 30 seconds
  });

  // Fetch tables for conflict detection
  const { data: tables = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`],
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id
  });

  // Function to find alternative tables when conflict detected
  const findAlternativeTable = (requestedGuestCount: number, requestedTime: string, requestedDate: string, excludeTableId?: number) => {
    if (!tables || !Array.isArray(tables)) return null;

    // Get bookings for the requested date
    const dateBookings = Array.isArray(bookings) ? bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
      return bookingDate === requestedDate;
    }) : [];

    // Find tables that can accommodate the guest count and are available at the requested time
    const availableTables = tables.filter(table => {
      // Skip the excluded table
      if (excludeTableId && table.id === excludeTableId) return false;
      
      // Check capacity
      if (table.capacity < requestedGuestCount) return false;

      // Check if table is occupied at the requested time
      const tableBookings = dateBookings.filter(booking => booking.tableId === table.id);
      
      const isOccupied = tableBookings.some(booking => {
        const startTime = booking.startTime;
        const endTime = booking.endTime || "23:59";
        
        // Check if requested time overlaps with existing booking (with 1-hour buffer)
        const requestedHour = parseInt(requestedTime.split(':')[0]);
        const requestedMinute = parseInt(requestedTime.split(':')[1]);
        const requestedTotalMinutes = requestedHour * 60 + requestedMinute;
        
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const startTotalMinutes = startHour * 60 + startMinute;
        
        const endHour = parseInt(endTime.split(':')[0]);
        const endMinute = parseInt(endTime.split(':')[1]);
        const endTotalMinutes = endHour * 60 + endMinute;
        
        // Add 1-hour buffer (60 minutes) for table turnover
        return requestedTotalMinutes >= (startTotalMinutes - 60) && 
               requestedTotalMinutes <= (endTotalMinutes + 60);
      });

      return !isOccupied;
    });

    // Sort by capacity (prefer tables closer to guest count) and table number
    availableTables.sort((a, b) => {
      const capacityDiffA = Math.abs(a.capacity - requestedGuestCount);
      const capacityDiffB = Math.abs(b.capacity - requestedGuestCount);
      
      if (capacityDiffA !== capacityDiffB) {
        return capacityDiffA - capacityDiffB;
      }
      
      return a.tableNumber - b.tableNumber;
    });

    return availableTables.length > 0 ? availableTables[0] : null;
  };

  // Function to check table availability and conflicts
  const checkTableConflict = (tableId: number, guestCount: number, bookingDate: string, startTime: string) => {
    if (!tables || !Array.isArray(bookings)) return { hasConflict: false };

    const table = tables.find(t => t.id === tableId);
    if (!table) return { hasConflict: false };

    // Check capacity
    if (table.capacity < guestCount) {
      return {
        hasConflict: true,
        reason: 'capacity',
        message: `Table ${table.tableNumber} can only accommodate ${table.capacity} guests. You have ${guestCount} guests.`
      };
    }

    // Get bookings for the requested date and table
    const dateBookings = bookings.filter(booking => {
      const bookingDateStr = new Date(booking.bookingDate).toISOString().split('T')[0];
      return bookingDateStr === bookingDate && booking.tableId === tableId;
    });

    // Check time conflicts
    const hasTimeConflict = dateBookings.some(booking => {
      const existingStartTime = booking.startTime;
      const existingEndTime = booking.endTime || "23:59";
      
      // Convert times to minutes for easier comparison
      const requestedStartMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const requestedEndMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      
      const existingStartMinutes = parseInt(existingStartTime.split(':')[0]) * 60 + parseInt(existingStartTime.split(':')[1]);
      const existingEndMinutes = parseInt(existingEndTime.split(':')[0]) * 60 + parseInt(existingEndTime.split(':')[1]);
      
      // Add 1-hour buffer (60 minutes) for table turnover
      const bufferMinutes = 60;
      
      // Check for time overlap with buffer
      // Two time ranges overlap if: start1 < end2 && start2 < end1
      const requestedStart = requestedStartMinutes - bufferMinutes;
      const requestedEnd = requestedEndMinutes + bufferMinutes;
      const existingStart = existingStartMinutes - bufferMinutes;
      const existingEnd = existingEndMinutes + bufferMinutes;
      
      return requestedStart < existingEnd && existingStart < requestedEnd;
    });

    if (hasTimeConflict) {
      return {
        hasConflict: true,
        reason: 'time',
        message: `Table ${table.tableNumber} is occupied at ${startTime} on ${bookingDate}`
      };
    }

    return { hasConflict: false };
  };

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        bookingDate: new Date().toISOString().split('T')[0],
        startTime: "19:00",
        endTime: "21:00",
        tableId: "",
        notes: ""
      });
      setConflictInfo(null);
      setSuggestedTable(null);
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot Create Booking",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    }
  });

  // Handle table selection with conflict detection
  const handleTableSelection = (tableId: string) => {
    if (!tableId) {
      setNewBooking({ ...newBooking, tableId: "" });
      setConflictInfo(null);
      setSuggestedTable(null);
      return;
    }

    const tableIdNum = parseInt(tableId);
    
    // Use current state values for conflict checking
    const currentBooking = newBooking.tableId === tableId ? newBooking : { ...newBooking, tableId };
    const conflict = checkTableConflict(tableIdNum, currentBooking.guestCount, currentBooking.bookingDate, currentBooking.startTime);
    
    if (conflict.hasConflict) {
      // Find alternative table using current booking state
      const alternative = findAlternativeTable(
        currentBooking.guestCount, 
        currentBooking.startTime, 
        currentBooking.bookingDate, 
        tableIdNum
      );

      setConflictInfo(conflict);
      setSuggestedTable(alternative);
      
      if (alternative) {
        toast({
          title: "Table Conflict",
          description: `${conflict.message}. Table ${alternative.tableNumber} (${alternative.capacity} seats) is available as an alternative.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Table Conflict", 
          description: `${conflict.message}. No suitable alternative tables available for ${currentBooking.guestCount} guests at ${currentBooking.startTime}.`,
          variant: "destructive",
        });
      }
    } else {
      setConflictInfo(null);
      setSuggestedTable(null);
    }

    setNewBooking({ ...newBooking, tableId });
  };

  // Handle booking form submission
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    // If a specific table is selected, do final conflict check
    if (newBooking.tableId) {
      const conflict = checkTableConflict(
        parseInt(newBooking.tableId), 
        newBooking.guestCount, 
        newBooking.bookingDate, 
        newBooking.startTime
      );
      
      if (conflict.hasConflict) {
        const table = tables?.find(t => t.id === parseInt(newBooking.tableId));
        toast({
          title: "Table Conflict",
          description: `Table ${table?.tableNumber || newBooking.tableId} is already booked at ${newBooking.startTime} on ${newBooking.bookingDate}. Please select a different table or time.`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // If auto-assigning, check if any table is available
      const availableTable = findAlternativeTable(
        newBooking.guestCount,
        newBooking.startTime,
        newBooking.bookingDate
      );

      if (!availableTable) {
        toast({
          title: "No Tables Available",
          description: `No tables available for ${newBooking.guestCount} guests at ${newBooking.startTime} on ${newBooking.bookingDate}. Please try a different time or date.`,
          variant: "destructive",
        });
        return;
      }
    }

    createBookingMutation.mutate({
      ...newBooking,
      tableId: newBooking.tableId ? parseInt(newBooking.tableId) : null,
      restaurantId: restaurant?.id
    });
  };

  // Use suggested table
  const useSuggestedTable = () => {
    if (suggestedTable) {
      setNewBooking({ ...newBooking, tableId: suggestedTable.id.toString() });
      setConflictInfo(null);
      setSuggestedTable(null);
      toast({
        title: "Table Updated",
        description: `Switched to Table ${suggestedTable.tableNumber} (${suggestedTable.capacity} seats)`,
      });
    }
  };

  if (!user || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view bookings</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Bookings fetch error:", error);
  }

  const filteredBookings = Array.isArray(bookings) ? bookings.filter((booking: any) => {
    const matchesSearch = 
      booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSource = sourceFilter === "all" || booking.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  }) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "no-show":
        return <Badge className="bg-gray-100 text-gray-800">No Show</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      case "online":
        return <Badge className="bg-blue-100 text-blue-800">Online</Badge>;
      case "google":
        return <Badge className="bg-orange-100 text-orange-800">Google My Business</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Bookings</h1>
            <nav className="flex space-x-6">
              <a href={`/${restaurant.tenantId}/dashboard`} className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setIsNewBookingOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Bookings</span>
              </div>
              <a href={`/${restaurant.tenantId}/waiting-list`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Waiting List</span>
              </a>
              <a href={`/${restaurant.tenantId}/statistics`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Statistics</span>
              </a>
              <a href={`/${restaurant.tenantId}/activity-log`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Log</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Bookings</h2>

              {/* Filters */}
              <div className="flex items-center space-x-4 mb-4">
                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                  <Filter className="w-4 h-4" />
                  <span>Show filters</span>
                </Button>

                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Arrival</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Guests</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No bookings found
                        {bookings && (
                          <div className="text-xs mt-2">
                            Raw data: {Array.isArray(bookings) ? `${bookings.length} items` : 'Not an array'}
                            {error && <div className="text-red-500">Error: {String(error)}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking: any) => (
                      <tr 
                        key={booking.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/${restaurant.tenantId}/bookings/${booking.id}`}
                      >
                        <td className="py-3 px-4 text-sm">{booking.id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{booking.customerName}</div>
                            <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{booking.guestCount}</td>
                        <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                        <td className="py-3 px-4">
                          {new Date(booking.createdAt).toLocaleDateString()} at {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">{getSourceBadge(booking.source || 'manual')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredBookings.length} bookings, {filteredBookings.reduce((sum: number, booking: any) => sum + booking.guestCount, 0)} guests
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">1</span>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm">20</Button>
                    <span className="text-sm text-gray-600">results per page</span>
                  </div>
                </div>

                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download as CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Booking Dialog with Conflict Detection */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={newBooking.customerName}
                  onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={newBooking.customerEmail}
                  onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={newBooking.customerPhone}
                  onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="guestCount">Number of Guests</Label>
                <Select 
                  value={newBooking.guestCount.toString()} 
                  onValueChange={(value) => {
                    const guestCount = parseInt(value);
                    setNewBooking({ ...newBooking, guestCount });
                    // Clear any existing conflict info when guest count changes
                    setConflictInfo(null);
                    setSuggestedTable(null);
                    // Re-check conflicts when guest count changes
                    if (newBooking.tableId) {
                      setTimeout(() => {
                        handleTableSelection(newBooking.tableId);
                      }, 0);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num} guests</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bookingDate">Date</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={newBooking.bookingDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setNewBooking({ ...newBooking, bookingDate: newDate });
                    // Clear any existing conflict info when date changes
                    setConflictInfo(null);
                    setSuggestedTable(null);
                    // Re-check conflicts when date changes
                    if (newBooking.tableId) {
                      setTimeout(() => {
                        handleTableSelection(newBooking.tableId);
                      }, 0);
                    }
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Select 
                  value={newBooking.startTime} 
                  onValueChange={(value) => {
                    setNewBooking({ ...newBooking, startTime: value });
                    // Clear any existing conflict info when time changes
                    setConflictInfo(null);
                    setSuggestedTable(null);
                    // Re-check conflicts when time changes
                    if (newBooking.tableId) {
                      setTimeout(() => {
                        handleTableSelection(newBooking.tableId);
                      }, 0);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Select value={newBooking.endTime} onValueChange={(value) => setNewBooking({ ...newBooking, endTime: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tableId">Table (Optional)</Label>
              <Select 
                value={newBooking.tableId} 
                onValueChange={handleTableSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign or select table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-assign</SelectItem>
                  {tables && tables.length > 0 ? (
                    tables.map((table) => (
                      <SelectItem key={`table-${table.id}`} value={table.id.toString()}>
                        Table {table.tableNumber} ({table.capacity} seats)
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            {/* Conflict Warning */}
            {conflictInfo && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">Table Conflict Detected</h4>
                    <p className="text-sm text-red-700 mt-1">{conflictInfo.message}</p>
                    {suggestedTable && (
                      <div className="mt-3">
                        <p className="text-sm text-red-700 mb-2">
                          Suggested alternative: Table {suggestedTable.tableNumber} ({suggestedTable.capacity} seats)
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={useSuggestedTable}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Use Table {suggestedTable.tableNumber}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                placeholder="Special requests, dietary requirements..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsNewBookingOpen(false);
                  setConflictInfo(null);
                  setSuggestedTable(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700" 
                disabled={createBookingMutation.isPending || (conflictInfo && conflictInfo.hasConflict)}
              >
                {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}