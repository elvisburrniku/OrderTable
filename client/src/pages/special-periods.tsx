import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { format } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { formatDate } from "@/lib/time-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Trash2, Calendar as CalendarIcon, ToggleRight, ToggleLeft, Clock, Search, ChevronDown, Edit, ChevronLeft, ChevronRight, Plus, Filter, Eye, MoreHorizontal, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion } from "framer-motion";

interface SpecialPeriod {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function SpecialPeriods() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const [periods, setPeriods] = useState<SpecialPeriod[]>([]);

  // Auto scroll to top when page loads
  useScrollToTop();

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    restaurantId: restaurant?.id,
    onMessage: (data) => {
      if (data.type === 'special_period_updated' || 
          data.type === 'special_period_created' || 
          data.type === 'special_period_deleted') {
        // Invalidate special periods query to refetch data
        queryClient.invalidateQueries({
          queryKey: [
            `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`,
          ],
        });

        // Show toast notification for real-time updates
        toast({
          title: "Special Periods Updated",
          description: "Changes have been made to special periods and updated in real-time.",
        });
      }
    }
  });

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SpecialPeriod | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<{period: any, index: number} | null>(null);

  // Fetch existing special periods
  const { data: existingPeriods, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`,
    ],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Create special period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (periodData: SpecialPeriod) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(periodData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create special period");
      }

      return response.json();
    },
    onMutate: async (newPeriod) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`] 
      });

      // Snapshot the previous value
      const previousPeriods = queryClient.getQueryData([
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        (old: any) => old ? [...old, { ...newPeriod, id: Date.now() }] : [{ ...newPeriod, id: Date.now() }]
      );

      return { previousPeriods };
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Special period created successfully!",
      });
      // Invalidate to get the real data from server
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`]
      });
    },
    onError: (error, newPeriod, context) => {
      // Rollback on error
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        context?.previousPeriods
      );
      toast({
        title: "Error",
        description: error.message || "Failed to create special period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update special period mutation
  const updatePeriodMutation = useMutation({
    mutationFn: async ({
      periodId,
      periodData,
    }: {
      periodId: number;
      periodData: SpecialPeriod;
    }) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods/${periodId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(periodData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update special period");
      }

      return response.json();
    },
    onMutate: async ({ periodId, periodData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`] 
      });

      // Snapshot the previous value
      const previousPeriods = queryClient.getQueryData([
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        (old: any) => old ? old.map((period: any) => 
          period.id === periodId ? { ...period, ...periodData } : period
        ) : []
      );

      return { previousPeriods, periodId };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period updated successfully!",
      });
      // Invalidate to get the real data from server
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`]
      });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        context?.previousPeriods
      );
      toast({
        title: "Error",
        description: error.message || "Failed to update special period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete special period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods/${periodId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete special period");
      }

      return response.json();
    },
    onMutate: async (periodId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`] 
      });

      // Snapshot the previous value
      const previousPeriods = queryClient.getQueryData([
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        (old: any) => old ? old.filter((period: any) => period.id !== periodId) : []
      );

      return { previousPeriods, periodId };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period deleted successfully!",
      });
      // Invalidate to get the real data from server
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`]
      });
    },
    onError: (error, periodId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
        context?.previousPeriods
      );
      toast({
        title: "Error",
        description: error.message || "Failed to delete special period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing periods when data is fetched
  useEffect(() => {
    if (existingPeriods && Array.isArray(existingPeriods)) {
      setPeriods(
        existingPeriods.map((period: any) => ({
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          isOpen: period.isOpen,
          openTime: period.openTime || "09:00",
          closeTime: period.closeTime || "22:00",
        })),
      );
    }
  }, [existingPeriods]);

  if (!user || !restaurant) {
    return null;
  }

  const addPeriod = () => {
    setPeriods([
      ...periods,
      {
        name: "",
        startDate: "",
        endDate: "",
        isOpen: true,
        openTime: "09:00",
        closeTime: "22:00",
      },
    ]);
  };

  const updatePeriod = (index: number, field: string, value: any) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const savePeriod = async (index: number) => {
    const period = periods[index];
    if (!period.name || !period.startDate || !period.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (period.id) {
      // Update existing period
      updatePeriodMutation.mutate({ periodId: period.id, periodData: period });
    } else {
      // Create new period
      createPeriodMutation.mutate(period);
    }
  };

  const deletePeriod = async (index: number, periodId?: number) => {
    if (periodId) {
      // Delete from server and update local state immediately
      deletePeriodMutation.mutate(periodId);
      // Remove from local state immediately for real-time update
      const newPeriods = periods.filter((_, i) => i !== index);
      setPeriods(newPeriods);
    } else {
      // Remove from local state if not saved yet
      const newPeriods = periods.filter((_, i) => i !== index);
      setPeriods(newPeriods);
    }
  };

  const handleDeleteConfirm = () => {
    if (periodToDelete) {
      deletePeriod(periodToDelete.index, periodToDelete.period.id);
      setPeriodToDelete(null);
    }
  };

  // Filter and pagination logic
  const filteredPeriods = (existingPeriods || []).filter((period: any) => {
    const matchesSearch = searchTerm === "" || 
      period.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "open" && period.isOpen) ||
      (statusFilter === "closed" && !period.isOpen);
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const startDate = new Date(period.startDate);
      const now = new Date();
      switch (dateFilter) {
        case "active":
          const endDate = new Date(period.endDate);
          matchesDate = startDate <= now && endDate >= now;
          break;
        case "upcoming":
          matchesDate = startDate > now;
          break;
        case "past":
          const periodEndDate = new Date(period.endDate);
          matchesDate = periodEndDate < now;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination for periods
  const totalPages = Math.ceil(filteredPeriods.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPeriods = filteredPeriods.slice(startIndex, endIndex);

  const handleViewPeriodDetails = (period: any) => {
    setSelectedPeriod(period);
    setIsEditing(false);
    setShowPeriodModal(true);
  };

  const handleEditPeriod = (period: any) => {
    setSelectedPeriod(period);
    setIsEditing(true);
    setShowPeriodModal(true);
  };

  const handleClosePeriodModal = () => {
    setShowPeriodModal(false);
    setSelectedPeriod(null);
    setIsEditing(false);
  };

  const getStatusBadge = (isOpen: boolean, startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start <= now && end >= now) {
      return isOpen ? (
        <Badge className="bg-green-500 text-white">
          <ToggleRight className="h-3 w-3 mr-1" />
          Active & Open
        </Badge>
      ) : (
        <Badge className="bg-red-500 text-white">
          <ToggleLeft className="h-3 w-3 mr-1" />
          Active & Closed
        </Badge>
      );
    } else if (start > now) {
      return (
        <Badge className="bg-blue-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Upcoming
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-500 text-white">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Past
        </Badge>
      );
    }
  };

  // Helper function to determine if period is existing or new
  const isExistingPeriod = (period: SpecialPeriod) => {
    return period.id !== undefined;
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
                <CalendarIcon className="h-6 w-6 text-green-600" />
                Special Periods
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center space-x-3"
              >
                {/* Real-time connection status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-600">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    setSelectedPeriod({
                      name: "",
                      startDate: "",
                      endDate: "",
                      isOpen: true,
                      openTime: "09:00",
                      closeTime: "22:00"
                    });
                    setIsEditing(true);
                    setShowPeriodModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Period</span>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Special Periods</h2>

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
                      {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                          {[
                            statusFilter !== 'all' ? 1 : 0,
                            dateFilter !== 'all' ? 1 : 0,
                            searchTerm ? 1 : 0
                          ].reduce((a, b) => a + b, 0)}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search Input */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <Input
                              placeholder="Search by period name..."
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
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-gray-200">
                              <SelectItem value="all" className="rounded-md">All Statuses</SelectItem>
                              <SelectItem value="open" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Open</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="closed" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>Closed</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                          <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                              <SelectValue placeholder="All Periods" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-gray-200">
                              <SelectItem value="all" className="rounded-md">All Periods</SelectItem>
                              <SelectItem value="active" className="rounded-md">Active</SelectItem>
                              <SelectItem value="upcoming" className="rounded-md">Upcoming</SelectItem>
                              <SelectItem value="past" className="rounded-md">Past</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Filter Actions */}
                      {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
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
                            {dateFilter !== 'all' && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                Period: {dateFilter}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setDateFilter("all");
                            }}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            Clear all
                          </Button>
                        </div>
                      )}
                    </motion.div>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PERIOD</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">DATES</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">STATUS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">HOURS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">DURATION</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                          <span className="text-gray-500 font-medium">Loading periods...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <CalendarIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-medium">No special periods found</h3>
                            <p className="text-gray-500 text-sm mt-1">Create your first special period to get started</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPeriods.map((period: any, index: number) => (
                      <motion.tr 
                        key={period.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`group hover:bg-blue-50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {period.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{period.name}</div>
                              <div className="text-sm text-gray-500">Period ID: {period.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {format(new Date(period.startDate), "MMM dd, yyyy")}
                            </div>
                            <div className="text-gray-500">
                              to {format(new Date(period.endDate), "MMM dd, yyyy")}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(period.isOpen, period.startDate, period.endDate)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {period.isOpen ? (
                              <>
                                {period.openTime} - {period.closeTime}
                              </>
                            ) : (
                              <span className="text-red-500">Closed</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {(() => {
                              const start = new Date(period.startDate);
                              const end = new Date(period.endDate);
                              const diffTime = Math.abs(end.getTime() - start.getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPeriod(period)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center text-xl">
                                    <CalendarIcon className="w-6 h-6 mr-2 text-red-600" />
                                    Delete Special Period Confirmation
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="space-y-3 text-base">
                                    <p>
                                      Are you sure you want to delete the special period{" "}
                                      <span className="font-semibold text-gray-900">"{period.name}"</span> scheduled from{" "}
                                      <span className="font-semibold text-gray-900">
                                        {format(new Date(period.startDate), "MMMM dd, yyyy")}
                                      </span>{" "}
                                      to{" "}
                                      <span className="font-semibold text-gray-900">
                                        {format(new Date(period.endDate), "MMMM dd, yyyy")}
                                      </span>?
                                    </p>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                      <p className="text-red-800 text-sm font-medium flex items-center">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        This action cannot be undone and will permanently remove this special period configuration.
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-3">
                                  <AlertDialogCancel className="px-6 py-2.5">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deletePeriod(-1, period.id)}
                                    disabled={deletePeriodMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5"
                                  >
                                    {deletePeriodMutation.isPending ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Period
                                      </>
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-between px-6 py-4 border-t bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {startIndex + 1}-{Math.min(endIndex, filteredPeriods.length)} of {filteredPeriods.length}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 h-8 text-sm"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "w-8 h-8 p-0 bg-green-600 hover:bg-green-700 text-white" : "w-8 h-8 p-0 hover:bg-green-50"}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 h-8 text-sm"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Period Detail Modal */}
      <Dialog open={showPeriodModal} onOpenChange={setShowPeriodModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              {selectedPeriod?.id ? "Edit Special Period" : "Add New Special Period"}
            </DialogTitle>
          </DialogHeader>
          {selectedPeriod && (
            <div className="space-y-6">
              {/* Period Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="period-name">Period Name *</Label>
                  <Input
                    id="period-name"
                    value={selectedPeriod.name}
                    onChange={(e) => setSelectedPeriod({...selectedPeriod, name: e.target.value})}
                    placeholder="Enter period name (e.g., Christmas Holiday)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={selectedPeriod.startDate}
                      onChange={(e) => setSelectedPeriod({...selectedPeriod, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date *</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={selectedPeriod.endDate}
                      onChange={(e) => setSelectedPeriod({...selectedPeriod, endDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-open"
                    checked={selectedPeriod.isOpen}
                    onCheckedChange={(checked) => setSelectedPeriod({...selectedPeriod, isOpen: checked})}
                  />
                  <Label htmlFor="is-open">Restaurant is open during this period</Label>
                </div>
                {selectedPeriod.isOpen && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="open-time">Opening Time</Label>
                      <Input
                        id="open-time"
                        type="time"
                        value={selectedPeriod.openTime}
                        onChange={(e) => setSelectedPeriod({...selectedPeriod, openTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="close-time">Closing Time</Label>
                      <Input
                        id="close-time"
                        type="time"
                        value={selectedPeriod.closeTime}
                        onChange={(e) => setSelectedPeriod({...selectedPeriod, closeTime: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={async () => {
                    if (!selectedPeriod.name || !selectedPeriod.startDate || !selectedPeriod.endDate) {
                      toast({
                        title: "Error",
                        description: "Please fill in all required fields.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (selectedPeriod.id) {
                      updatePeriodMutation.mutate({ periodId: selectedPeriod.id, periodData: selectedPeriod });
                    } else {
                      createPeriodMutation.mutate(selectedPeriod);
                    }
                    setShowPeriodModal(false);
                    setSelectedPeriod(null);
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-2"
                  disabled={createPeriodMutation.isPending || updatePeriodMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                  {selectedPeriod.id ? "Update" : "Create"} Period
                </Button>
                <Button 
                  onClick={() => {
                    setShowPeriodModal(false);
                    setSelectedPeriod(null);
                    setIsEditing(false);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
