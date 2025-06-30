import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  Edit,
  Trash2,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useToast } from "@/hooks/use-toast";

interface CombinedTable {
  id: number;
  name: string;
  tableIds: number[] | string;
  totalCapacity: number;
  isActive: boolean;
  createdAt: string;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  isActive: boolean;
}

export default function CombinedTables() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto scroll to top when page loads
  useScrollToTop();

  // State management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombination, setEditingCombination] = useState<CombinedTable | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [combinationToDelete, setCombinationToDelete] = useState<CombinedTable | null>(null);
  const [newCombination, setNewCombination] = useState({
    name: "",
    tableIds: [] as number[],
  });

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["tables", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) {
        console.log("Missing restaurant ID or tenant ID:", {
          restaurantId: restaurant?.id,
          tenantId: restaurant?.tenantId,
        });
        return [];
      }
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/tables`,
      );
      if (!response.ok) {
        console.error(
          "Failed to fetch tables:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch tables");
      }
      const data = await response.json();
      console.log("Fetched tables:", data);
      return data;
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Fetch combined tables
  const { data: combinedTables = [], isLoading: combinedTablesLoading } =
    useQuery({
      queryKey: ["combinedTables", restaurant?.id],
      queryFn: async () => {
        if (!restaurant?.id || !restaurant?.tenantId) return [];
        const response = await fetch(
          `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/combined-tables`,
        );
        if (!response.ok) throw new Error("Failed to fetch combined tables");
        return response.json();
      },
      enabled: !!restaurant?.id && !!restaurant?.tenantId,
    });

  // Filter combined tables
  const filteredCombinedTables = (combinedTables || []).filter((combination: CombinedTable) => {
    const matchesSearch = !searchTerm || 
      combination.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && combination.isActive) ||
      (statusFilter === "inactive" && !combination.isActive);
    
    const matchesCapacity = capacityFilter === "all" ||
      (capacityFilter === "small" && combination.totalCapacity <= 4) ||
      (capacityFilter === "medium" && combination.totalCapacity >= 5 && combination.totalCapacity <= 10) ||
      (capacityFilter === "large" && combination.totalCapacity > 10);

    return matchesSearch && matchesStatus && matchesCapacity;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCombinedTables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCombinedTables = filteredCombinedTables.slice(startIndex, endIndex);

  // Create combined table mutation
  const createCombinedTableMutation = useMutation({
    mutationFn: async (combinedTableData: any) => {
      if (!restaurant?.id || !restaurant?.tenantId)
        throw new Error("Missing restaurant or tenant ID");
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/combined-tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(combinedTableData),
        },
      );
      if (!response.ok) throw new Error("Failed to create combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Combined table created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create combined table",
        variant: "destructive",
      });
    },
  });

  // Update combined table mutation
  const updateCombinedTableMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      if (!restaurant?.tenantId) throw new Error("Missing tenant ID");
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/combined-tables/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      if (!response.ok) throw new Error("Failed to update combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Combined table updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update combined table",
        variant: "destructive",
      });
    },
  });

  // Delete combined table mutation
  const deleteCombinedTableMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!restaurant?.tenantId) throw new Error("Missing tenant ID");
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/combined-tables/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      toast({
        title: "Success",
        description: "Combined table deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete combined table",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewCombination({ name: "", tableIds: [] });
    setEditingCombination(null);
  };

  const handleTableToggle = (tableId: number) => {
    setNewCombination((prev) => ({
      ...prev,
      tableIds: prev.tableIds.includes(tableId)
        ? prev.tableIds.filter((id) => id !== tableId)
        : [...prev.tableIds, tableId],
    }));
  };

  const handleSubmit = () => {
    if (!newCombination.name.trim() || newCombination.tableIds.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a name and select at least one table",
        variant: "destructive",
      });
      return;
    }

    const totalCapacity = newCombination.tableIds.reduce((sum, tableId) => {
      const table = tables.find((t) => t.id === tableId);
      return sum + (table?.capacity || 0);
    }, 0);

    const combinedTableData = {
      name: newCombination.name,
      tableIds: newCombination.tableIds,
      totalCapacity,
    };

    if (editingCombination) {
      updateCombinedTableMutation.mutate({
        id: editingCombination.id,
        updates: combinedTableData,
      });
    } else {
      createCombinedTableMutation.mutate(combinedTableData);
    }
  };

  const handleEdit = (combination: CombinedTable) => {
    setEditingCombination(combination);
    const parsedTableIds =
      typeof combination.tableIds === "string"
        ? JSON.parse(combination.tableIds)
        : combination.tableIds;
    setNewCombination({
      name: combination.name,
      tableIds: parsedTableIds,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCombination = (combination: CombinedTable) => {
    setCombinationToDelete(combination);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCombination = () => {
    if (combinationToDelete && combinationToDelete.id) {
      deleteCombinedTableMutation.mutate(combinationToDelete.id);
      setIsDeleteDialogOpen(false);
      setCombinationToDelete(null);
    }
  };

  const getTableNumbers = (tableIds: number[] | string) => {
    try {
      let ids: number[];

      if (typeof tableIds === "string") {
        if (tableIds.startsWith("[") && tableIds.endsWith("]")) {
          ids = JSON.parse(tableIds);
        } else if (tableIds.includes(",")) {
          ids = tableIds
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id));
        } else {
          const singleId = parseInt(tableIds.trim(), 10);
          ids = isNaN(singleId) ? [] : [singleId];
        }
      } else if (Array.isArray(tableIds)) {
        ids = tableIds;
      } else {
        console.error("Invalid tableIds format:", tableIds);
        return "Invalid table data";
      }

      return ids
        .map((id: number) => {
          const table = tables.find((t) => t.id === id);
          return table?.tableNumber || `Table ${id}`;
        })
        .join(", ");
    } catch (error) {
      console.error("Error parsing tableIds:", error, "Data:", tableIds);
      return "Error loading table data";
    }
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
    if (capacity <= 4) {
      return "bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    } else if (capacity <= 10) {
      return "bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    } else {
      return "bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium";
    }
  };

  if (authLoading || tablesLoading || combinedTablesLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

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
                Combined Tables
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        resetForm();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Combination
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCombination ? "Edit" : "Create"} Table Combination
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Combination Name</Label>
                        <Input
                          id="name"
                          value={newCombination.name}
                          onChange={(e) =>
                            setNewCombination((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g., VIP Section, Family Area"
                        />
                      </div>
                      <div>
                        <Label>Select Tables</Label>
                        {tables.length === 0 ? (
                          <div className="text-sm text-gray-500 mt-2">
                            {tablesLoading
                              ? "Loading tables..."
                              : "No tables available. Please create tables first."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {tables
                              .filter((table) => table.isActive)
                              .map((table) => (
                                <Button
                                  key={table.id}
                                  variant={
                                    newCombination.tableIds.includes(table.id)
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => handleTableToggle(table.id)}
                                  className="h-12 flex flex-col"
                                >
                                  <span className="text-xs">
                                    Table {table.tableNumber}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {table.capacity} seats
                                  </span>
                                </Button>
                              ))}
                          </div>
                        )}
                        {tables.length > 0 &&
                          tables.filter((table) => table.isActive).length ===
                            0 && (
                            <div className="text-sm text-gray-500 mt-2">
                              No active tables available. Please activate tables
                              first.
                            </div>
                          )}
                      </div>
                      {newCombination.tableIds.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Total capacity:{" "}
                          {newCombination.tableIds.reduce((sum, tableId) => {
                            const table = tables.find((t) => t.id === tableId);
                            return sum + (table?.capacity || 0);
                          }, 0)}{" "}
                          seats
                        </div>
                      )}
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={
                            createCombinedTableMutation.isPending ||
                            updateCombinedTableMutation.isPending
                          }
                        >
                          {editingCombination ? "Update" : "Create"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-gray-600 mt-2"
            >
              Create table combinations to accommodate larger parties.
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Combined Tables</h2>

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
                                placeholder="Search by combination name..."
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
                                    <span>Small (1-4 people)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Medium (5-10 people)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="large" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>Large (11+ people)</span>
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
                        Combination Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tables
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Capacity
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {combinedTablesLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading combined tables...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedCombinedTables.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No combined tables found</h3>
                              <p className="text-gray-500 text-sm mt-1">
                                {combinedTables.length === 0 
                                  ? "Create your first table combination to get started" 
                                  : "Try adjusting your filters or search terms"
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCombinedTables.map((combination: CombinedTable, index: number) => (
                        <motion.tr 
                          key={combination.id}
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
                                {combination.name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{combination.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">
                              {getTableNumbers(combination.tableIds)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{combination.totalCapacity}</span>
                              <span className="text-sm text-gray-500">
                                {combination.totalCapacity === 1 ? 'person' : 'people'}
                              </span>
                              <span className={getCapacityBadge(combination.totalCapacity)}>
                                {combination.totalCapacity <= 4 ? 'Small' : combination.totalCapacity <= 10 ? 'Medium' : 'Large'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(combination.isActive)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(combination);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCombination(combination);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredCombinedTables.length)} of {filteredCombinedTables.length} combinations
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Combined Table</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete the combined table <strong>{combinationToDelete?.name}</strong>?
            </p>
            <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteCombination}
              disabled={deleteCombinedTableMutation.isPending}
            >
              {deleteCombinedTableMutation.isPending ? "Deleting..." : "Delete Combined Table"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}