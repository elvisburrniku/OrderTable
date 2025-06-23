import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  Search, 
  Filter, 
  Users,
  Phone,
  Mail,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface BookingAgent {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function BookingAgents() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useScrollToTop();

  // State management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<BookingAgent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  
  const [currentAgent, setCurrentAgent] = useState({
    name: "",
    email: "",
    phone: "",
    role: "agent",
    isActive: true,
    notes: ""
  });

  // Fetch booking agents
  const { data: agentsList = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/booking-agents`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Filter agents
  const filteredAgents = (agentsList || []).filter((agent: BookingAgent) => {
    const matchesSearch = !searchTerm || 
      agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || agent.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && agent.isActive) ||
      (statusFilter === "inactive" && !agent.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

  // Save agent mutation
  const saveAgentMutation = useMutation({
    mutationFn: async () => {
      const agentData = {
        name: currentAgent.name,
        email: currentAgent.email,
        phone: currentAgent.phone,
        role: currentAgent.role,
        isActive: currentAgent.isActive,
        notes: currentAgent.notes,
      };

      if (editingAgent) {
        return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents/${editingAgent.id}`, agentData);
      } else {
        return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`, agentData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingAgent ? "Booking agent updated successfully" : "Booking agent created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`] 
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save booking agent",
        variant: "destructive",
      });
      console.error("Error saving agent:", error);
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents/${agentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking agent deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete booking agent",
        variant: "destructive",
      });
      console.error("Error deleting agent:", error);
    },
  });

  const resetForm = () => {
    setCurrentAgent({
      name: "",
      email: "",
      phone: "",
      role: "agent",
      isActive: true,
      notes: ""
    });
    setEditingAgent(null);
    setIsCreateDialogOpen(false);
  };

  const handleSave = () => {
    if (!currentAgent.name.trim() || !currentAgent.email.trim() || !currentAgent.phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveAgentMutation.mutate();
  };

  const handleEdit = (agent: BookingAgent) => {
    setEditingAgent(agent);
    setCurrentAgent({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      isActive: agent.isActive,
      notes: agent.notes || ""
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (agentId: number) => {
    if (confirm("Are you sure you want to delete this booking agent?")) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      agent: "bg-blue-500 text-white",
      concierge: "bg-purple-500 text-white", 
      manager: "bg-orange-500 text-white"
    };
    return (
      <Badge className={colors[role as keyof typeof colors] || "bg-gray-500 text-white"}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
                <Users className="h-6 w-6 text-green-600" />
                Booking Agents
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Agent</span>
                </Button>
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-gray-600 mt-2 max-w-4xl"
            >
              Register external booking agents or concierges who can accept bookings on behalf of guests without requiring system login access.
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Booking Agents</h2>

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
                        {(roleFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[roleFilter !== 'all', statusFilter !== 'all', searchTerm].filter(Boolean).length}
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
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                              />
                            </div>
                          </div>

                          {/* Role Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Roles" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Roles</SelectItem>
                                <SelectItem value="agent" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Agent</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="concierge" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>Concierge</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="manager" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Manager</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                        </div>

                        {/* Filter Actions */}
                        {(roleFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>Active filters:</span>
                              {searchTerm && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Search: {searchTerm}
                                </Badge>
                              )}
                              {roleFilter !== 'all' && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Role: {roleFilter}
                                </Badge>
                              )}
                              {statusFilter !== 'all' && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Status: {statusFilter}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setRoleFilter("all");
                                setStatusFilter("all");
                              }}
                              className="text-green-600 hover:text-green-700"
                            >
                              Clear all
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Results count */}
                <div className="text-sm text-gray-600">
                  {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} found
                </div>
              </div>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredAgents.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4"
              >
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 border">
                  <div className="col-span-3">Agent</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Agent List */}
                {paginatedAgents.map((agent: BookingAgent, index: number) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Agent Info */}
                      <div className="col-span-1 md:col-span-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                            {agent.notes && (
                              <p className="text-xs text-gray-500 truncate max-w-32">{agent.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-1 md:col-span-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 truncate">{agent.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{agent.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Role */}
                      <div className="col-span-1 md:col-span-2">
                        {getRoleBadge(agent.role)}
                      </div>

                      {/* Status */}
                      <div className="col-span-1 md:col-span-2">
                        {getStatusBadge(agent.isActive)}
                      </div>

                      {/* Created */}
                      <div className="col-span-1 md:col-span-2">
                        <span className="text-sm text-gray-600">{formatDate(agent.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 md:col-span-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(agent)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Agent
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Agent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="flex items-center justify-between mt-8 p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="7">7</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">
                        of {filteredAgents.length} agents
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 ${currentPage === page ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No booking agents found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                    ? "Try adjusting your search criteria or filters to find agents."
                    : "Get started by adding your first booking agent to help manage reservations."
                  }
                </p>
                <div className="space-x-3">
                  {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setRoleFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Agent
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Agent Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              {editingAgent ? "Edit Booking Agent" : "Add New Booking Agent"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={currentAgent.name}
                onChange={(e) => setCurrentAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter agent name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={currentAgent.email}
                onChange={(e) => setCurrentAgent(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={currentAgent.phone}
                onChange={(e) => setCurrentAgent(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={currentAgent.role}
                onValueChange={(value) => setCurrentAgent(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Booking Agent</SelectItem>
                  <SelectItem value="concierge">Concierge</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={currentAgent.notes}
                onChange={(e) => setCurrentAgent(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this agent"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={currentAgent.isActive}
                onCheckedChange={(checked) => setCurrentAgent(prev => ({ ...prev, isActive: !!checked }))}
              />
              <Label htmlFor="active">Active (agent can create bookings)</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={saveAgentMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              {saveAgentMutation.isPending ? "Saving..." : (editingAgent ? "Update Agent" : "Create Agent")}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}