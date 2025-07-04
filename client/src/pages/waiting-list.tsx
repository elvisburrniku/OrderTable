import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { motion } from "framer-motion";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Edit2,
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
  X,
  Tag
} from "lucide-react";
import { format } from "date-fns";
import UnifiedBookingModal from "@/components/unified-booking-modal";

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
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);

  // Fetch waiting list
  const { data: waitingList = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`],
    enabled: !!tenantId && !!restaurantId
  });

  // Fetch tables for the restaurant
  const { data: tables = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
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
      const response = await fetch(`/api/tenants/${tenantId}/waiting-list/${id}`, {
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

  // Delete mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tenants/${tenantId}/waiting-list/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete waiting list entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/waiting-list`] });
      toast({
        title: "Success",
        description: "Waiting list entry deleted successfully",
      });
      setDeletingEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete waiting list entry",
        variant: "destructive",
      });
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const handleSubmit = (data: any) => {
    if (!restaurant?.id) return;

    // Map UnifiedBookingModal data to waiting list format
    const mappedData = {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      guestCount: parseInt(data.guestCount),
      requestedDate: data.bookingDate, // Map bookingDate to requestedDate
      requestedTime: data.startTime,   // Map startTime to requestedTime
      duration: data.duration + " hours", // Convert duration to string format
      preferredTable: data.tableId === 'auto-assign' ? '' : data.tableId,
      specialRequests: data.specialRequests,
      notes: data.internalNotes,       // Map internalNotes to notes
      extraDescription: data.extraDescription,
      tags: data.tags || [],
      requirePrepayment: data.requirePrePayment,
      // Add new payment fields from the modal
      paymentAmount: data.paymentAmount || 0,
      paymentDeadline: data.paymentDeadline || "24 hours",
      sendPaymentEmail: data.sendPaymentEmail || false,
      language: data.language || "English (GB)",
      eventType: data.eventType || "General Dining"
    };

    if (
      !mappedData.customerName ||
      !mappedData.customerEmail ||
      !mappedData.guestCount ||
      !mappedData.requestedDate ||
      !mappedData.requestedTime
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingEntry) {
      handleEditSubmit(mappedData);
    } else {
      handleCreateSubmit(mappedData);
    }
  };

  const handleCreateSubmit = (mappedData: any) => {
    createEntryMutation.mutate({
      ...mappedData,
      status: "waiting",
    });
  };

  const handleEditSubmit = (mappedData: any) => {
    if (!editingEntry) return;

    updateEntryMutation.mutate({ 
      id: editingEntry.id, 
      updates: mappedData
    });
  };

  const handleEdit = (entry: any) => {
    setEditingEntry({
      ...entry,
      // Map waiting list fields to UnifiedBookingModal format
      eventType: entry.eventType || "General Dining",
      bookingDate: entry.requestedDate,
      startTime: entry.requestedTime,
      duration: parseFloat(entry.duration?.replace(" hours", "") || "2"),
      tableId: entry.preferredTable || "",
      internalNotes: entry.notes || "",
      requirePrePayment: entry.requirePrepayment || false,
      paymentAmount: entry.paymentAmount || 0,
      paymentDeadline: entry.paymentDeadline || "24 hours",
      sendPaymentEmail: entry.sendPaymentEmail || false,
      language: entry.language || "English (GB)"
    });
    setShowForm(true);
  };

  const handleDelete = (entry: any) => {
    setDeletingEntry(entry);
  };

  const confirmDelete = () => {
    if (deletingEntry) {
      deleteEntryMutation.mutate(deletingEntry.id);
    }
  };

  const resetForm = () => {
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateEntryMutation.mutate({ id, updates: { status } });
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Clock className="h-6 w-6 text-green-600" />
                Waiting List
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add to Waiting List
                </Button>
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-gray-600 mt-2"
            >
              Manage customers waiting for available tables
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Waiting List</h2>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filters</span>
                      {(statusFilter !== 'all' || searchTerm) && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                          {[statusFilter !== 'all', searchTerm].filter(Boolean).length}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Search</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder="Search by name or email..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Status</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
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
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          {/* Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="overflow-x-auto"
          >
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="w-20 text-left py-3 px-4 font-medium">ID</th>
                  <th className="w-48 text-left py-3 px-4 font-medium">CUSTOMER</th>
                  <th className="w-44 text-left py-3 px-4 font-medium">DATE & TIME</th>
                  <th className="w-24 text-left py-3 px-4 font-medium">PARTY SIZE</th>
                  <th className="w-28 text-left py-3 px-4 font-medium">STATUS</th>
                  <th className="w-28 text-left py-3 px-4 font-medium">CREATED</th>
                  <th className="w-28 text-left py-3 px-4 font-medium">SOURCE</th>
                  <th className="w-32 text-left py-3 px-4 font-medium">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center space-y-4"
                      >
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                        <span className="text-gray-500 font-medium">Loading waiting list...</span>
                      </motion.div>
                    </td>
                  </tr>
                ) : paginatedWaitingList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center space-y-4"
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-medium">No customers on waiting list</h3>
                          <p className="text-gray-500 text-sm mt-1">
                            The waiting list is currently empty
                          </p>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  paginatedWaitingList.map((item: any, index: number) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <span className="text-blue-600 font-medium">#{startIndex + index + 1}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.customerName}</div>
                            <div className="text-sm text-gray-500">{item.customerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="font-medium">{formatDate(item.requestedDate)}</div>
                          <div className="text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(item.requestedTime)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="font-medium">{item.guestCount} guests</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Select
                          value={item.status || 'waiting'}
                          onValueChange={(value) => updateEntryMutation.mutate({ id: item.id, updates: { status: value } })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'waiting' ? 'bg-green-100 text-green-800' :
                                item.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'seated' ? 'bg-purple-100 text-purple-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.status || 'waiting'}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="seated">Seated</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          manual
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </motion.div>

          {/* Pagination Footer - Only show if there are entries */}
          {filteredWaitingList.length > 0 && (
            <div className="p-6 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Show <select 
                  className="mx-1 border rounded px-2 py-1"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                >
                  <option value={7}>7</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select> entries
              </div>

              <div className="text-sm text-gray-600">
                {`${startIndex + 1}-${Math.min(endIndex, filteredWaitingList.length)} of ${filteredWaitingList.length}`}
              </div>

              <div className="flex items-center space-x-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 1) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Entry Dialog */}
      <UnifiedBookingModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowForm(open);
        }}
        title={editingEntry ? 'Edit Waiting List Entry' : 'Add to Waiting List'}
        initialData={editingEntry || {}}
        tables={tables}
        onSubmit={handleSubmit}
        isLoading={createEntryMutation.isPending || updateEntryMutation.isPending}
        submitButtonText={editingEntry ? 'Update Entry' : 'Add to Waiting List'}
        mode={editingEntry ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Waiting List Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the waiting list entry for{" "}
              <span className="font-medium">{deletingEntry?.customerName}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingEntry(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteEntryMutation.isPending}
              >
                {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}