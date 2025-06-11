import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Users,
  Phone,
  Mail,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  Palette,
  RotateCcw,
  Download,
  List,
  Grid
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GoogleCalendar from "@/components/google-calendar";
import InternationalPhoneInput from "@/components/international-phone-input";

export default function Bookings() {
  const { user, restaurant } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: "19:00",
    endTime: "20:00",
    tableId: "",
    notes: ""
  });
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [suggestedTable, setSuggestedTable] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading, error } = useQuery({
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
    const dateBookings = Array.isArray(bookings) ? bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
      return bookingDate === requestedDate;
    }) : [];

    // Find tables that can accommodate the guest count and are available at the requested time
    const availableTables = tables.filter((table: any) => {
      // Skip the excluded table
      if (excludeTableId && table.id === excludeTableId) return false;

      // Check capacity
      if (table.capacity < requestedGuestCount) return false;

      // Check if table is occupied at the requested time
      const tableBookings = dateBookings.filter((booking: any) => booking.tableId === table.id);

      // Check for time conflicts
      for (const booking of tableBookings) {
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;

        // Simple time overlap check
        if (requestedTime >= bookingStart && requestedTime < bookingEnd) {
          return false;
        }
      }

      return true;
    });

    // Return the first available table
    return availableTables.length > 0 ? availableTables[0] : null;
  };

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, "POST", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/customers`] 
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        bookingDate: new Date().toISOString().split('T')[0],
        startTime: "19:00",
        endTime: "20:00",
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
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    }
  });

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    let tableId = null;

    // Handle table assignment
    if (newBooking.tableId && newBooking.tableId !== "auto") {
      tableId = parseInt(newBooking.tableId);

      // Validate guest count against selected table capacity
      const selectedTable = tables.find((t: any) => t.id === tableId);
      if (selectedTable && newBooking.guestCount > selectedTable.capacity) {
        toast({
          title: "Error",
          description: `Selected table can only accommodate ${selectedTable.capacity} guests. You have ${newBooking.guestCount} guests.`,
          variant: "destructive"
        });
        return;
      }
    }

    createBookingMutation.mutate({
      ...newBooking,
      tableId: tableId,
      restaurantId: restaurant?.id
    });
  };

  // Filter bookings based on search and filters
  const filteredBookings = Array.isArray(bookings) ? bookings.filter((booking: any) => {
    const matchesSearch = booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSource = sourceFilter === "all" || booking.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  }) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'manual':
        return <Badge variant="outline">Manual</Badge>;
      case 'online':
        return <Badge className="bg-blue-100 text-blue-800">Online</Badge>;
      case 'google':
        return <Badge className="bg-orange-100 text-orange-800">Google My Business</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const useSuggestedTable = () => {
    if (suggestedTable) {
      setNewBooking({ ...newBooking, tableId: suggestedTable.id.toString() });
      setConflictInfo(null);
      setSuggestedTable(null);
    }
  };

  if (!restaurant) {
    return <div>Loading...</div>;
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                      <User className="mr-2 h-4 w-4" />
                      {user?.name}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>Help</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          {viewMode === "calendar" ? (
            <GoogleCalendar
              selectedDate={selectedDate}
              bookings={filteredBookings || []}
              allBookings={bookings || []}
              tables={tables || []}
              isLoading={isLoading}
              onDateSelect={setSelectedDate}
            />
          ) : (
            <div className="bg-white rounded-lg shadow">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Bookings</h2>
                  
                  {/* View Toggle */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="flex items-center space-x-1"
                    >
                      <List className="w-4 h-4" />
                      <span>List</span>
                    </Button>
                    <Button
                      variant={viewMode === "calendar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      className="flex items-center space-x-1"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Calendar</span>
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-4 mb-4">
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Filter className="w-4 h-4" />
                    <span>Show filters</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
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
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((booking: any) => (
                          <tr 
                            key={booking.id} 
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => window.location.href = `/${restaurant.tenantId}/bookings/${booking.id}`}
                          >
                            <td className="py-3 px-4 text-blue-600 font-medium">#{booking.id}</td>
                            <td className="py-3 px-4">{booking.customerName}</td>
                            <td className="py-3 px-4">
                              {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                            </td>
                            <td className="py-3 px-4">{booking.guestCount}</td>
                            <td className="py-3 px-4">{getStatusBadge(booking.status || 'pending')}</td>
                            <td className="py-3 px-4">
                              {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}
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
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Showing</span>
                    <Select defaultValue="20">
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>results per page</span>
                  </div>

                  <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download as CSV</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Booking Dialog */}
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
                <InternationalPhoneInput
                  value={newBooking.customerPhone}
                  onChange={(phone: string) => setNewBooking({ ...newBooking, customerPhone: phone })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="guestCount">Guest Count</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min="1"
                  value={newBooking.guestCount}
                  onChange={(e) => setNewBooking({ ...newBooking, guestCount: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bookingDate">Date</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={newBooking.bookingDate}
                  onChange={(e) => setNewBooking({ ...newBooking, bookingDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tableId">Table (Optional)</Label>
              <Select 
                value={newBooking.tableId} 
                onValueChange={(value) => setNewBooking({ ...newBooking, tableId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign</SelectItem>
                  {Array.isArray(tables) && tables.map((table: any) => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      Table {table.tableNumber} (Capacity: {table.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                placeholder="Special requests, allergies, etc."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsNewBookingOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBookingMutation.isPending}
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