import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import DashboardSidebar from "@/components/dashboard-sidebar";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
// import { InternationalPhoneInput } from "@/components/international-phone-input";

export default function Bookings() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  
  // Get restaurant info from authentication context
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
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
  const { data: restaurantData } = useQuery({
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

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format time helper
  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
  };

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
      confirmed: "bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      pending: "bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      cancelled: "bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };
    return (
      <span className={colors[status as keyof typeof colors] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium"}>
        {status}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      manual: "bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      online: "bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      google: "bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };
    return (
      <span className={colors[source as keyof typeof colors] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium"}>
        {source}
      </span>
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
            </div>

            {/* Modern Filters Section */}
            <div className="space-y-6 mb-8">
              {/* Filter Controls Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {(statusFilter !== 'all' || sourceFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[statusFilter !== 'all', sourceFilter !== 'all', searchTerm].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                              />
                            </div>
                          </div>

                          {/* Status Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                                <SelectItem value="confirmed" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Confirmed</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="pending" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span>Pending</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="cancelled" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Cancelled</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Source Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Sources" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                                <SelectItem value="manual" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Manual</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="online" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>Online</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="google" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Google</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || sourceFilter !== 'all' || searchTerm) && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>Active filters:</span>
                              {searchTerm && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Search: "{searchTerm}"
                                </span>
                              )}
                              {statusFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Status: {statusFilter}
                                </span>
                              )}
                              {sourceFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Source: {sourceFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setSourceFilter("all");
                              }}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              Clear all
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                </div>
              </div>
            </div>

            {/* Enhanced Table */}
            <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Party Size
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading bookings...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No bookings found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((booking: any, index: number) => (
                        <tr 
                          key={booking.id} 
                          className={`group hover:bg-blue-50 cursor-pointer transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                          onClick={() => window.location.href = `/${tenantId}/bookings/${booking.id}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <span className="text-blue-600 font-semibold text-sm bg-blue-50 px-2 py-1 rounded-md">
                                #{booking.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {booking.customerName?.charAt(0)?.toUpperCase() || 'G'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{booking.customerName}</div>
                                <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {formatDate(booking.bookingDate)}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(booking.startTime)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{booking.guestCount}</span>
                              <span className="text-sm text-gray-500">guest{booking.guestCount !== 1 ? 's' : ''}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(booking.status || 'confirmed')}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm text-gray-600">
                              {booking.createdAt ? formatDate(booking.createdAt) : formatDate(booking.bookingDate)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getSourceBadge(booking.source || 'manual')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Premium Pagination */}
            <div className="bg-white border-t-2 border-gray-100 px-6 py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                {/* Items per page selector */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Show</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-9 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-2 border-gray-200">
                      <SelectItem value="10" className="rounded-md">10</SelectItem>
                      <SelectItem value="20" className="rounded-md">20</SelectItem>
                      <SelectItem value="50" className="rounded-md">50</SelectItem>
                      <SelectItem value="100" className="rounded-md">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">of {filteredBookings.length} results</span>
                </div>

                {/* Advanced pagination controls */}
                <div className="flex items-center space-x-6">
                  {/* Results indicator */}
                  <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="font-medium text-gray-800">
                      {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)}
                    </span> of <span className="font-medium text-gray-800">{filteredBookings.length}</span>
                  </div>
                  
                  {/* Navigation buttons */}
                  <div className="flex items-center space-x-2">
                    {/* First page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-9 px-3 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <span className="text-xs font-medium">First</span>
                    </Button>

                    {/* Previous page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-9 w-9 p-0 border-2 transition-all duration-200 ${
                              currentPage === pageNum 
                                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 shadow-md' 
                                : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                            }`}
                          >
                            <span className="text-sm font-medium">{pageNum}</span>
                          </Button>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="text-gray-400 px-1">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="h-9 w-9 p-0 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200"
                          >
                            <span className="text-sm font-medium">{totalPages}</span>
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Next page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    {/* Last page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-9 px-3 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <span className="text-xs font-medium">Last</span>
                    </Button>
                  </div>
                </div>
              </div>
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