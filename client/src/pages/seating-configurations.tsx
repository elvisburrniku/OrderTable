import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

interface SeatingConfiguration {
  id: number;
  name: string;
  criteria: string;
  validOnline: string;
  isActive: boolean;
  createdAt?: string;
}

export default function SeatingConfigurations() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto scroll to top when page loads
  useScrollToTop();

  // State management
  const [configurations, setConfigurations] = useState<SeatingConfiguration[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SeatingConfiguration | null>(null);
  const [newConfig, setNewConfig] = useState({
    name: "",
    criteria: "Unlimited",
    validOnline: "Unlimited",
    isActive: true,
  });

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [criteriaFilter, setCriteriaFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch seating configurations
  const { data: fetchedConfigurations, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/seating-configurations`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  useEffect(() => {
    if (fetchedConfigurations) {
      setConfigurations(fetchedConfigurations);
    }
  }, [fetchedConfigurations]);

  // Filter configurations
  const filteredConfigurations = configurations.filter((config) => {
    const matchesSearch = !searchTerm || 
      config.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && config.isActive) ||
      (statusFilter === "inactive" && !config.isActive);
    
    const matchesCriteria = criteriaFilter === "all" ||
      config.criteria?.toLowerCase() === criteriaFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCriteria;
  });

  // Pagination
  const totalPages = Math.ceil(filteredConfigurations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigurations = filteredConfigurations.slice(startIndex, endIndex);

  // Create configuration mutation
  const createConfigurationMutation = useMutation({
    mutationFn: async (configData: any) => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`, configData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seating configuration created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`] 
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create seating configuration",
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigurationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations/${id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seating configuration updated successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`] 
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update seating configuration",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigurationMutation = useMutation({
    mutationFn: async (configId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations/${configId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seating configuration deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete seating configuration",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewConfig({
      name: "",
      criteria: "Unlimited",
      validOnline: "Unlimited",
      isActive: true,
    });
    setEditingConfig(null);
  };

  const handleCreateConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a configuration name",
        variant: "destructive",
      });
      return;
    }
    createConfigurationMutation.mutate(newConfig);
  };

  const handleUpdateConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a configuration name",
        variant: "destructive",
      });
      return;
    }
    if (editingConfig) {
      updateConfigurationMutation.mutate({
        id: editingConfig.id,
        updates: newConfig,
      });
    }
  };

  const handleEdit = (config: SeatingConfiguration) => {
    setEditingConfig(config);
    setNewConfig({
      name: config.name,
      criteria: config.criteria,
      validOnline: config.validOnline,
      isActive: config.isActive,
    });
    setIsDialogOpen(true);
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

  const getCriteriaBadge = (criteria: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        criteria === "Unlimited" 
          ? "bg-blue-500 text-white" 
          : "bg-orange-500 text-white"
      }`}>
        {criteria}
      </span>
    );
  };

  if (!user || !restaurant) {
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
                <Settings className="h-6 w-6 text-green-600" />
                Seating Configurations
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
                      Add Configuration
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editingConfig ? handleUpdateConfiguration : handleCreateConfiguration} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Configuration Name</Label>
                        <Input
                          id="name"
                          value={newConfig.name}
                          onChange={(e) =>
                            setNewConfig({
                              ...newConfig,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., VIP Seating, Family Section"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="criteria">Criteria</Label>
                        <Select value={newConfig.criteria} onValueChange={(value) =>
                          setNewConfig({ ...newConfig, criteria: value })
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unlimited">Unlimited</SelectItem>
                            <SelectItem value="Limited">Limited</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="validOnline">Valid Online</Label>
                        <Select value={newConfig.validOnline} onValueChange={(value) =>
                          setNewConfig({ ...newConfig, validOnline: value })
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unlimited">Unlimited</SelectItem>
                            <SelectItem value="Limited">Limited</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={newConfig.isActive}
                          onCheckedChange={(checked) =>
                            setNewConfig({ ...newConfig, isActive: checked })
                          }
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createConfigurationMutation.isPending || updateConfigurationMutation.isPending}
                      >
                        {createConfigurationMutation.isPending || updateConfigurationMutation.isPending
                          ? (editingConfig ? "Updating..." : "Creating...")
                          : (editingConfig ? "Update Configuration" : "Create Configuration")}
                      </Button>
                    </form>
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
              Special customers can be allowed to make reservations at specific times. You can create one or more seating configurations.
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurations</h2>

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
                        {(statusFilter !== 'all' || criteriaFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[statusFilter !== 'all', criteriaFilter !== 'all', searchTerm].filter(Boolean).length}
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
                                placeholder="Search by configuration name..."
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

                          {/* Criteria Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Criteria</label>
                            <Select value={criteriaFilter} onValueChange={setCriteriaFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Criteria" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Criteria</SelectItem>
                                <SelectItem value="unlimited" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Unlimited</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="limited" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Limited</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || criteriaFilter !== 'all' || searchTerm) && (
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
                              {criteriaFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Criteria: {criteriaFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setCriteriaFilter("all");
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
                        Configuration Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criteria
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Online
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
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading configurations...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedConfigurations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Settings className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No configurations found</h3>
                              <p className="text-gray-500 text-sm mt-1">
                                {configurations.length === 0 
                                  ? "Create your first seating configuration to get started" 
                                  : "Try adjusting your filters or search terms"
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedConfigurations.map((config: SeatingConfiguration, index: number) => (
                        <motion.tr 
                          key={config.id}
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
                                {config.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{config.name}</div>
                                <div className="text-xs text-gray-500">ID: {config.id > 0 ? `00-${config.id.toString().padStart(2, '0')}` : 'NEW'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getCriteriaBadge(config.criteria)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-900">{config.validOnline}</span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(config.isActive)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(config)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${config.name}"?`)) {
                                    deleteConfigurationMutation.mutate(config.id);
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
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredConfigurations.length)} of {filteredConfigurations.length} configurations
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
    </div>
  );
}