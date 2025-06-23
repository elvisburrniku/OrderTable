import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Package, Search, Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

const productGroupSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  status: z.enum(["active", "inactive"]),
});

type ProductGroupForm = z.infer<typeof productGroupSchema>;

interface ProductGroup {
  id: number;
  groupName: string;
  quantity: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export default function ProductGroups() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for dialog and editing
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);

  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  // Get restaurant info from authentication context
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  const form = useForm<ProductGroupForm>({
    resolver: zodResolver(productGroupSchema),
    defaultValues: {
      groupName: "",
      quantity: 0,
      status: "active",
    },
  });

  // Fetch product groups
  const { data: productGroups = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Filter product groups
  const filteredGroups = (productGroups || []).filter((group: ProductGroup) => {
    const matchesSearch = !searchTerm || 
      group.groupName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || group.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Create product group mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductGroupForm) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product group",
        variant: "destructive",
      });
    },
  });

  // Update product group mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductGroupForm }) => {
      return await apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group updated successfully",
      });
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product group",
        variant: "destructive",
      });
    },
  });

  // Delete product group mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product group",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductGroupForm) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (group: ProductGroup) => {
    setEditingGroup(group);
    form.reset({
      groupName: group.groupName,
      quantity: group.quantity,
      status: group.status,
    });
    setIsDialogOpen(true);
  };

  const [deletingGroup, setDeletingGroup] = useState<ProductGroup | null>(null);

  const handleDelete = (group: ProductGroup) => {
    setDeletingGroup(group);
  };

  const confirmDelete = () => {
    if (deletingGroup) {
      deleteMutation.mutate(deletingGroup.id);
      setDeletingGroup(null);
    }
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    form.reset({
      groupName: "",
      quantity: 0,
      status: "active",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      inactive: "bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };
    return (
      <span className={colors[status as keyof typeof colors] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium"}>
        {status}
      </span>
    );
  };

  if (!restaurant) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Top Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Package className="h-6 w-6 text-green-600" />
                Product Groups
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNewGroup();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product Group</span>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Product Groups</h2>

            {/* Modern Filters Section */}
            <div className="space-y-6 mb-8">
              {/* Filter Controls Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        type="button"
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
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by group name..."
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
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Inactive</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || searchTerm) && (
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
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
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
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading product groups...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedGroups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No product groups found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedGroups.map((group: ProductGroup, index: number) => (
                        <motion.tr
                          key={group.id}
                          className={`group hover:bg-blue-50 cursor-pointer transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-blue-600 font-semibold text-sm bg-blue-50 px-2 py-1 rounded-md">
                                #{group.id}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {group.groupName?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{group.groupName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{group.quantity}</span>
                              <span className="text-sm text-gray-500">items</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(group.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600">
                              {formatDate(group.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEdit(group);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(group);
                                }}
                                disabled={deleteMutation.isPending}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
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
                    {startIndex + 1}-{Math.min(endIndex, filteredGroups.length)} of {filteredGroups.length}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(1);
                      }}
                      disabled={currentPage === 1}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(currentPage - 1);
                      }}
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
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "hover:bg-green-50"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(currentPage + 1);
                      }}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(totalPages);
                      }}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog for Add/Edit Product Group */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Product Group" : "Add New Product Group"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingGroup(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    editingGroup ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">Delete Product Group</DialogTitle>
          </DialogHeader>
          {deletingGroup && (
            <div className="space-y-6">
              {/* Warning Icon and Message */}
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete "{deletingGroup.groupName}"?
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  This action cannot be undone. The product group and all its associated data will be permanently removed from your system.
                </p>
              </div>

              {/* Product Group Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium">
                      {deletingGroup.groupName?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {deletingGroup.groupName}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-2">
                        <Package className="w-3 h-3" />
                        <span>{deletingGroup.quantity} items</span>
                        <span>•</span>
                        <span className={deletingGroup.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                          {deletingGroup.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDeletingGroup(null)}
                  className="flex-1 border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}