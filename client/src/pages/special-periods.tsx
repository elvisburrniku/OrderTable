import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar as CalendarIcon, ToggleRight, ToggleLeft, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
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

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SpecialPeriod | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
        throw new Error("Failed to create special period");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period created successfully!",
      });
      // Invalidate both API path and any nested query patterns
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            (queryKey.includes("special-periods") ||
              (queryKey.length >= 3 && queryKey[0] === "specialPeriods"))
          );
        },
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create special period. Please try again.",
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
        throw new Error("Failed to update special period");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period updated successfully!",
      });
      // Invalidate both API path and any nested query patterns
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            (queryKey.includes("special-periods") ||
              (queryKey.length >= 3 && queryKey[0] === "specialPeriods"))
          );
        },
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update special period. Please try again.",
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
        throw new Error("Failed to delete special period");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period deleted successfully!",
      });
      // Invalidate both API path and any nested query patterns
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            (queryKey.includes("special-periods") ||
              (queryKey.length >= 3 && queryKey[0] === "specialPeriods"))
          );
        },
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete special period. Please try again.",
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-green-600" />
            Special Periods
          </CardTitle>
          <CardDescription>
            Define periods with different opening hours and closing times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Period Management</h2>

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

              <Button
                onClick={addPeriod}
                className="bg-green-600 hover:bg-green-700 text-white h-10 px-4 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Period</span>
              </Button>
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
                              onClick={() => handleViewPeriodDetails(period)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPeriod(period)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePeriod(-1, period.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Period Detail Modal */}
      <Dialog open={showPeriodModal} onOpenChange={setShowPeriodModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              {isEditing ? "Edit" : "View"} Special Period - {selectedPeriod?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPeriod && (
            <div className="space-y-6">
              {/* Period Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Period Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Period Name</label>
                      <p className="text-lg">{selectedPeriod.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedPeriod.isOpen, selectedPeriod.startDate, selectedPeriod.endDate)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Start Date</label>
                      <p className="text-lg">
                        {format(new Date(selectedPeriod.startDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">End Date</label>
                      <p className="text-lg">
                        {format(new Date(selectedPeriod.endDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    {selectedPeriod.isOpen && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Opening Time</label>
                          <p className="text-lg">{selectedPeriod.openTime}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Closing Time</label>
                          <p className="text-lg">{selectedPeriod.closeTime}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Period
                  </Button>
                )}
                <Button onClick={handleClosePeriodModal} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
