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
import { Textarea } from "@/components/ui/textarea";
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
  ChevronRight,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function WaitingList() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get restaurant info from authentication context
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    requestedDate: "",
    requestedTime: "",
    notes: "",
  });

  // Fetch waiting list
  const { data: waitingList = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`],
    enabled: !!tenantId && !!restaurantId
  });

  // Filter waiting list
  const filteredWaitingList = (waitingList || []).filter((entry: any) => {
    const matchesSearch = !searchTerm || 
      entry.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredWaitingList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWaitingList = filteredWaitingList.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format time helper
  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
  };

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });
      if (!response.ok) throw new Error('Failed to create waiting list entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`] });
      setShowForm(false);
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        requestedDate: "",
        requestedTime: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Customer added to waiting list successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer to waiting list",
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update waiting list entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`] });
      toast({
        title: "Success",
        description: "Waiting list entry updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update waiting list entry",
        variant: "destructive",
      });
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    if (
      !formData.customerName ||
      !formData.customerEmail ||
      !formData.guestCount ||
      !formData.requestedDate ||
      !formData.requestedTime
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createEntryMutation.mutate({
      ...formData,
      guestCount: parseInt(formData.guestCount),
      status: "waiting",
    });
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateEntryMutation.mutate({ id, updates: { status } });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      case "contacted":
        return "bg-blue-100 text-blue-800";
      case "booked":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="flex-1 ml-64">
        <div className="min-h-screen bg-gray-50">
          <div className="p-6">
            <div className="bg-white rounded-lg shadow">
              {/* Top Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">Waiting List</h1>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Waiting List</span>
                  </Button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Waiting List Entries</h2>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center space-x-2"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filters</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredWaitingList.length} of {waitingList.length} entries
                  </div>
                </div>

                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="seated">Seated</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="items-per-page" className="text-sm font-medium text-gray-700">Items per page</Label>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Customer</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>Contact</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Requested</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Guests</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Created</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Loading waiting list...
                        </td>
                      </tr>
                    ) : paginatedWaitingList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No customers on waiting list
                        </td>
                      </tr>
                    ) : (
                      paginatedWaitingList.map((item: any) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{item.customerName}</div>
                              {item.notes && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span>{item.customerEmail}</span>
                              </div>
                              {item.customerPhone && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-500">{item.customerPhone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div>{formatDate(item.requestedDate)}</div>
                              <div className="text-gray-500">{formatTime(item.requestedTime)}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{item.guestCount}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                item.status === "waiting"
                                  ? "default"
                                  : item.status === "contacted"
                                  ? "secondary"
                                  : item.status === "seated"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => updateEntryMutation.mutate({ id: item.id, updates: { status: 'contacted' } })}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Mark as Contacted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateEntryMutation.mutate({ id: item.id, updates: { status: 'seated' } })}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Mark as Seated
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateEntryMutation.mutate({ id: item.id, updates: { status: 'cancelled' } })}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Cancel Entry
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="p-6 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredWaitingList.length)} of {filteredWaitingList.length} entries
                  ({filteredWaitingList.reduce((sum: number, item: any) => sum + (item.guestCount || 0), 0)} total guests)
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Waiting List</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, customerEmail: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone (optional)</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, customerPhone: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="guestCount">Guest Count</Label>
              <Input
                id="guestCount"
                type="number"
                min="1"
                max="20"
                value={formData.guestCount}
                onChange={(e) =>
                  setFormData({ ...formData, guestCount: parseInt(e.target.value) })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="requestedDate">Requested Date</Label>
              <Input
                id="requestedDate"
                type="date"
                value={formData.requestedDate}
                onChange={(e) =>
                  setFormData({ ...formData, requestedDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="requestedTime">Requested Time</Label>
              <Input
                id="requestedTime"
                type="time"
                value={formData.requestedTime}
                onChange={(e) =>
                  setFormData({ ...formData, requestedTime: e.target.value })
                }
              />
            </div>
            <div>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? "Adding..." : "Add to List"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}