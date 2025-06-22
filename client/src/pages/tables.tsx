import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  QrCode,
  Download,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  MapPin,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/use-subscription";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { FeedbackModal } from "./table-feedback";

export default function Tables() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const { canCreateTable } = useSubscription();
  const queryClient = useQueryClient();
  
  // Auto scroll to top when page loads
  useScrollToTop();

  // State management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [newTable, setNewTable] = useState({
    tableNumber: "",
    capacity: 4,
    isActive: true,
  });
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedTableQR, setSelectedTableQR] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedTableForFeedback, setSelectedTableForFeedback] = useState<any>(null);

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Function to fetch QR code for a specific table
  const fetchTableQR = async (tableId: number) => {
    const tenantId = restaurant?.tenantId || 1;
    const response = await fetch(
      `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables/${tableId}/qr`,
    );
    if (!response.ok) throw new Error("Failed to fetch QR code");
    return response.json();
  };

  // Function to download all QR codes as PDF
  const downloadAllQRCodes = async () => {
    try {
      const jsPDF = (await import("jspdf")).jsPDF;
      const html2canvas = (await import("html2canvas")).default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const qrSize = 60;
      const spacing = 10;

      let currentY = margin;
      let currentX = margin;

      // Add title
      pdf.setFontSize(16);
      pdf.text(
        `QR Codes - ${restaurant?.name || "Restaurant"}`,
        margin,
        currentY,
      );
      currentY += 20;

      for (const table of tables) {
        try {
          const qrData = await fetchTableQR(table.id);

          if (qrData.qrCode) {
            // Check if we need a new page
            if (currentY + qrSize + 30 > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }

            // Add table label
            pdf.setFontSize(12);
            pdf.text(`Table ${table.tableNumber}`, currentX, currentY);
            currentY += 10;

            // Add QR code
            pdf.addImage(
              qrData.qrCode,
              "PNG",
              currentX,
              currentY,
              qrSize,
              qrSize,
            );

            // Add table info
            pdf.setFontSize(8);
            pdf.text(
              `Capacity: ${table.capacity} people`,
              currentX,
              currentY + qrSize + 5,
            );
            pdf.text(
              `Status: ${table.isActive ? "Active" : "Inactive"}`,
              currentX,
              currentY + qrSize + 10,
            );

            currentY += qrSize + spacing + 20;
          }
        } catch (error) {
          console.error(
            `Failed to fetch QR for table ${table.tableNumber}:`,
            error,
          );
        }
      }

      pdf.save(`${restaurant?.name || "Restaurant"}_QR_Codes.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const { data: tables = [], isLoading } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId || 1,
      "restaurants",
      restaurant?.id,
      "tables",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
      );
      if (!response.ok) {
        console.error(
          "Failed to fetch tables:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch tables");
      }
      return response.json();
    },
    enabled: !!restaurant?.id,
  });

  // Filter tables
  const filteredTables = (tables || []).filter((table: any) => {
    const matchesSearch = !searchTerm || 
      table.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && table.isActive) ||
      (statusFilter === "inactive" && !table.isActive);
    
    const matchesCapacity = capacityFilter === "all" ||
      (capacityFilter === "small" && table.capacity <= 2) ||
      (capacityFilter === "medium" && table.capacity >= 3 && table.capacity <= 6) ||
      (capacityFilter === "large" && table.capacity > 6);

    return matchesSearch && matchesStatus && matchesCapacity;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTables = filteredTables.slice(startIndex, endIndex);

  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tableData, restaurantId: restaurant?.id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.requiresUpgrade) {
          throw new Error(`Table Limit Exceeded: ${errorData.message}`);
        }
        throw new Error(errorData?.message || "Failed to create table");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
      setIsDialogOpen(false);
      setEditingTable(null);
      setNewTable({ tableNumber: "", capacity: 4, isActive: true });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(`/api/tenants/${tenantId}/tables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
      setIsDialogOpen(false);
      setEditingTable(null);
      setNewTable({ tableNumber: "", capacity: 4, isActive: true });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: number) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(`/api/tenants/${tenantId}/tables/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
    },
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTable(tables.length)) {
      alert(
        "You've reached your table limit. Please upgrade your subscription.",
      );
      return;
    }
    createTableMutation.mutate(newTable);
  };

  const handleUpdateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTable) {
      updateTableMutation.mutate({
        id: editingTable.id,
        ...newTable,
      });
    }
  };

  const handleToggleActive = (tableId: number, isActive: boolean) => {
    console.log(
      `Handler called for table ID: ${tableId}, setting to: ${isActive}`,
    );
    updateTableMutation.mutate({ id: tableId, isActive });
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? "bg-green-500 text-white" 
          : "bg-gray-500 text-white"
      }`}>
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const getCapacityBadge = (capacity: number) => {
    if (capacity <= 2) {
      return "bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    } else if (capacity <= 6) {
      return "bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    } else {
      return "bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  // Isolated switch component to prevent cross-switching
  const TableSwitch = ({
    tableId,
    isActive,
    onToggle,
    disabled,
  }: {
    tableId: number;
    isActive: boolean;
    onToggle: (id: number, active: boolean) => void;
    disabled: boolean;
  }) => {
    return (
      <Switch
        checked={Boolean(isActive)}
        onCheckedChange={(checked) => {
          console.log(`Switch for table ${tableId}: ${isActive} -> ${checked}`);
          onToggle(tableId, checked);
        }}
        disabled={disabled}
        className="data-[state=checked]:bg-green-600"
      />
    );
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
                <Users className="h-6 w-6 text-green-600" />
                Table Management
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex gap-2"
              >
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/table-plan")}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  View Table Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadAllQRCodes}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  disabled={tables.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All QR Codes
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!canCreateTable(tables.length)}
                      onClick={() => {
                        setEditingTable(null);
                        setNewTable({ tableNumber: "", capacity: 4, isActive: true });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editingTable ? handleUpdateTable : handleCreateTable} className="space-y-4">
                      <div>
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input
                          id="tableNumber"
                          value={newTable.tableNumber}
                          onChange={(e) =>
                            setNewTable({
                              ...newTable,
                              tableNumber: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          max="20"
                          value={newTable.capacity}
                          onChange={(e) =>
                            setNewTable({
                              ...newTable,
                              capacity: parseInt(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={newTable.isActive}
                          onCheckedChange={(checked) =>
                            setNewTable({ ...newTable, isActive: checked })
                          }
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createTableMutation.isPending || updateTableMutation.isPending}
                      >
                        {createTableMutation.isPending || updateTableMutation.isPending
                          ? (editingTable ? "Updating..." : "Adding...")
                          : (editingTable ? "Update Table" : "Add Table")}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Tables</h2>

            {/* Modern Filters Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6 mb-8"
            >
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
                        {(statusFilter !== 'all' || capacityFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[statusFilter !== 'all', capacityFilter !== 'all', searchTerm].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by table number..."
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
                                <SelectItem value="active" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Active</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="inactive" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                    <span>Inactive</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Capacity Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                            <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Capacities" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Capacities</SelectItem>
                                <SelectItem value="small" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Small (1-2 people)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Medium (3-6 people)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="large" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>Large (7+ people)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || capacityFilter !== 'all' || searchTerm) && (
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
                              {capacityFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Capacity: {capacityFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setCapacityFilter("all");
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
            </motion.div>

            {/* Enhanced Table */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm mt-6"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table Number
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QR Code
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading tables...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedTables.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No tables found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedTables.map((table: any, index: number) => (
                        <motion.tr 
                          key={table.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {table.tableNumber?.charAt(0)?.toUpperCase() || 'T'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Table {table.tableNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{table.capacity}</span>
                              <span className="text-sm text-gray-500">
                                {table.capacity === 1 ? 'person' : 'people'}
                              </span>
                              <span className={getCapacityBadge(table.capacity)}>
                                {table.capacity <= 2 ? 'Small' : table.capacity <= 6 ? 'Medium' : 'Large'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(table.isActive)}
                              <TableSwitch
                                tableId={table.id}
                                isActive={table.isActive}
                                onToggle={handleToggleActive}
                                disabled={updateTableMutation.isPending}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const qrData = await fetchTableQR(table.id);
                                  setSelectedTableQR({
                                    ...table,
                                    qrCode: qrData.qrCode,
                                  });
                                  setShowQRDialog(true);
                                } catch (error) {
                                  console.error("Failed to fetch QR code:", error);
                                  alert("Failed to load QR code. Please try again.");
                                }
                              }}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              View QR
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingTable(table);
                                  setNewTable({
                                    tableNumber: table.tableNumber,
                                    capacity: table.capacity,
                                    isActive: table.isActive,
                                  });
                                  setIsDialogOpen(true);
                                }}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete Table ${table.tableNumber}?`)) {
                                    deleteTableMutation.mutate(table.id);
                                  }
                                }}
                                className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTables.length)} of {filteredTables.length} tables
                      </span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>per page</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === totalPages || 
                            Math.abs(page - currentPage) <= 1
                          )
                          .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-8 w-8 p-0"
                              >
                                {page}
                              </Button>
                            </div>
                          ))
                        }
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - Table {selectedTableQR?.tableNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedTableQR?.qrCode && (
              <div className="p-4 bg-white rounded-lg border">
                <img
                  src={selectedTableQR.qrCode}
                  alt={`QR Code for Table ${selectedTableQR.tableNumber}`}
                  className="w-64 h-64"
                />
              </div>
            )}
            <div className="text-center text-sm text-gray-600">
              <p>Capacity: {selectedTableQR?.capacity} people</p>
              <p>Status: {selectedTableQR?.isActive ? "Active" : "Inactive"}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedTableForFeedback && (
        <FeedbackModal
          table={selectedTableForFeedback}
          restaurant={restaurant}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedTableForFeedback(null);
          }}
        />
      )}
    </div>
  );
}