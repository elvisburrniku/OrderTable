import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
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
  MapPin,
  User,
  Download,
  List
} from "lucide-react";
// import { InternationalPhoneInput } from "@/components/international-phone-input";

export default function Bookings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get restaurant info from URL
  const pathParts = window.location.pathname.split('/');
  const tenantId = parseInt(pathParts[1]);
  const restaurantId = parseInt(pathParts[3]) || 12; // Default to 12 for demo

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    bookingDate: "",
    startTime: "",
    endTime: "",
    tableId: "",
    notes: ""
  });

  // Fetch restaurant data
  const { data: restaurant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}`],
    enabled: !!tenantId && !!restaurantId
  });

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`],
    enabled: !!tenantId && !!restaurantId
  });

  // Fetch tables
  const { data: tables } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
    enabled: !!tenantId && !!restaurantId
  });

  // Filter bookings
  const filteredBookings = (bookings || []).filter((booking: any) => {
    const matchesSearch = !searchTerm || 
      booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSource = sourceFilter === "all" || booking.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (!response.ok) throw new Error('Failed to create booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`] });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        bookingDate: "",
        startTime: "",
        endTime: "",
        tableId: "",
        notes: ""
      });
    }
  });

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookingData = {
      tenantId,
      restaurantId,
      customerName: newBooking.customerName,
      customerEmail: newBooking.customerEmail,
      customerPhone: newBooking.customerPhone,
      guestCount: newBooking.guestCount,
      bookingDate: new Date(newBooking.bookingDate),
      startTime: newBooking.startTime,
      endTime: newBooking.endTime || null,
      tableId: newBooking.tableId ? parseInt(newBooking.tableId) : null,
      notes: newBooking.notes || null,
      status: 'confirmed',
      source: 'manual'
    };

    createBookingMutation.mutate(bookingData);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      confirmed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      manual: "bg-blue-100 text-blue-800",
      online: "bg-purple-100 text-purple-800",
      google: "bg-orange-100 text-orange-800"
    };
    return (
      <Badge className={colors[source as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {source}
      </Badge>
    );
  };

  if (!restaurant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {restaurant?.name || "Restaurant"}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsNewBookingOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Booking</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
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
                <Input
                  id="customerPhone"
                  type="tel"
                  value={newBooking.customerPhone}
                  onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
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