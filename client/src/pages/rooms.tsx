import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Trash2, 
  Plus, 
  HelpCircle, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  MapPin,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { toast } from "@/hooks/use-toast";

interface Room {
  id?: number;
  name: string;
  priority: string;
  restaurantId?: number;
  tenantId?: number;
  isNew?: boolean;
  hasChanges?: boolean;
}

export default function Rooms() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();

  // Auto scroll to top when page loads
  useScrollToTop();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [originalRooms, setOriginalRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState({
    name: "",
    priority: "Medium"
  });

  // Fetch rooms from API - all hooks must be called before any conditional returns
  const { data: fetchedRooms = [], isLoading, error } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"],
    queryFn: async () => {
      if (!restaurant?.tenantId || !restaurant?.id) {
        throw new Error("Restaurant data not available");
      }
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/rooms`,
      );
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
    retry: false,
  });

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      if (!restaurant?.tenantId || !restaurant?.id) {
        throw new Error("Missing tenant or restaurant information");
      }
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/rooms/${roomId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
      toast({
        title: "Success",
        description: "Room deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to delete room. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save rooms mutation
  const saveRoomsMutation = useMutation({
    mutationFn: async (roomsToSave: Room[]) => {
      const currentTenantId = restaurant?.tenantId;
      if (!currentTenantId || !restaurant?.id) {
        throw new Error("Missing tenant or restaurant information");
      }

      // Create new rooms and update existing ones
      const results = await Promise.all(
        roomsToSave.map(async (room) => {
          if (room.id) {
            // Update existing room
            const response = await fetch(
              `/api/tenants/${currentTenantId}/restaurants/${restaurant.id}/rooms/${room.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: room.name,
                  priority: room.priority,
                  restaurantId: restaurant.id,
                  tenantId: currentTenantId,
                }),
              },
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Failed to update room: ${errorData.message || response.statusText}`);
            }
            return response.json();
          } else {
            // Create new room
            const response = await fetch(
              `/api/tenants/${currentTenantId}/restaurants/${restaurant.id}/rooms`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: room.name,
                  priority: room.priority,
                  restaurantId: restaurant.id,
                  tenantId: currentTenantId,
                }),
              },
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Failed to create room: ${errorData.message || response.statusText}`);
            }
            return response.json();
          }
        }),
      );
      return results;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
    },
    onError: (error) => {
      console.error("Room save error:", error);
    },
  });

  // Individual room save mutation
  const saveIndividualRoomMutation = useMutation({
    mutationFn: async (room: Room) => {
      const currentTenantId = restaurant?.tenantId;
      if (!currentTenantId || !restaurant?.id) {
        throw new Error("Missing tenant or restaurant information");
      }

      if (room.id) {
        // Update existing room
        const response = await fetch(
          `/api/tenants/${currentTenantId}/restaurants/${restaurant.id}/rooms/${room.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: room.name,
              priority: room.priority,
              restaurantId: restaurant.id,
              tenantId: currentTenantId,
            }),
          },
        );
        if (!response.ok) throw new Error("Failed to update room");
        return response.json();
      } else {
        // Create new room
        const response = await fetch(
          `/api/tenants/${currentTenantId}/restaurants/${restaurant.id}/rooms`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: room.name,
              priority: room.priority,
              restaurantId: restaurant.id,
              tenantId: currentTenantId,
            }),
          },
        );
        if (!response.ok) throw new Error("Failed to create room");
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
    },
  });

  // Create new room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; priority: string }) => {
      const currentTenantId = restaurant?.tenantId;
      if (!currentTenantId || !restaurant?.id) {
        throw new Error("Missing tenant or restaurant information");
      }

      const response = await fetch(
        `/api/tenants/${currentTenantId}/restaurants/${restaurant.id}/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roomData.name,
            priority: roomData.priority,
            restaurantId: restaurant.id,
            tenantId: currentTenantId,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
      setIsNewRoomOpen(false);
      setNewRoom({ name: "", priority: "Medium" });
      toast({
        title: "Success",
        description: "Room created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update local state when rooms are fetched
  useEffect(() => {
    if (fetchedRooms.length > 0) {
      setRooms(fetchedRooms);
      setOriginalRooms(fetchedRooms);
    } else if (!isLoading && fetchedRooms.length === 0) {
      // If no rooms exist, start with empty array
      setRooms([]);
      setOriginalRooms([]);
    }
  }, [fetchedRooms, isLoading]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter]);

  // Filter rooms
  const filteredRooms = (rooms || []).filter((room: Room) => {
    const matchesSearch = !searchTerm || 
      room.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || room.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

  // Priority badge style
  const getPriorityBadge = (priority: string) => {
    const variants = {
      High: "bg-red-100 text-red-800 border-red-200",
      Medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      Low: "bg-green-100 text-green-800 border-green-200"
    };
    return (
      <Badge variant="outline" className={variants[priority as keyof typeof variants] || variants.Medium}>
        {priority} Priority
      </Badge>
    );
  };

  // Early return if restaurant data is not available
  if (!restaurant?.id || !restaurant?.tenantId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <p className="text-gray-500">Loading restaurant data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <p className="text-gray-500">Loading rooms...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <p className="text-red-500">Error loading rooms: {error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if room has changes compared to original
  const hasRoomChanges = (room: Room, index: number): boolean => {
    if (room.isNew) return true;
    const original = originalRooms.find(orig => orig.id === room.id);
    if (!original) return true;
    return room.name !== original.name || room.priority !== original.priority;
  };

  const addRoom = () => {
    setRooms([...rooms, { name: "", priority: "Medium", isNew: true }]);
  };

  const updateRoom = (index: number, field: keyof Room, value: string) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
  };

  const removeRoom = (index: number) => {
    const room = rooms[index];
    if (room.id && !room.isNew) {
      // Delete from server if it's an existing room
      deleteRoomMutation.mutate(room.id);
    }
    // Remove from local state
    const newRooms = rooms.filter((_, i) => i !== index);
    setRooms(newRooms);
  };

  const saveRoom = (room: Room) => {
    saveIndividualRoomMutation.mutate(room);
  };

  const saveRooms = () => {
    // Filter out rooms with empty names
    const validRooms = rooms.filter(room => room.name.trim() !== "");
    saveRoomsMutation.mutate(validRooms);
  };

  const handleCreateRoom = () => {
    if (newRoom.name.trim()) {
      createRoomMutation.mutate(newRoom);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
  };

  const handleUpdateRoom = () => {
    if (editingRoom) {
      saveIndividualRoomMutation.mutate(editingRoom);
      setEditingRoom(null);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteRoom = () => {
    if (roomToDelete && roomToDelete.id) {
      deleteRoomMutation.mutate(roomToDelete.id);
      setIsDeleteDialogOpen(false);
      setRoomToDelete(null);
    }
  };

  return (
    <TooltipProvider>
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
                  <MapPin className="h-6 w-6 text-green-600" />
                  Rooms
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Button
                    onClick={() => setIsNewRoomOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Room</span>
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Room Management</h2>

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
                          {(priorityFilter !== 'all' || searchTerm) && (
                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                              {[priorityFilter !== 'all', searchTerm].filter(Boolean).length}
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
                                  placeholder="Search by room name..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                                />
                              </div>
                            </div>

                            {/* Priority Filter */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                  <SelectValue placeholder="All Priorities" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-2 border-gray-200">
                                  <SelectItem value="all" className="rounded-md">All Priorities</SelectItem>
                                  <SelectItem value="High" className="rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      <span>High Priority</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Medium" className="rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                      <span>Medium Priority</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Low" className="rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span>Low Priority</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* View Options */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredRooms.length)} of {filteredRooms.length} rooms
                    </span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20 h-9 border-2 border-gray-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="p-6">
              {/* Enhanced Table */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm"
              >
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room ID
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tables
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading rooms...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRooms.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <MapPin className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No rooms found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRooms.map((room, index) => (
                        <motion.tr
                          key={room.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        >
                          <td className="py-4 px-4 text-sm font-medium text-green-600">
                            #{room.id}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-semibold text-xs">
                                  {room.name?.charAt(0)?.toUpperCase() || 'R'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{room.name}</div>
                                <div className="text-xs text-gray-500">Room area</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1 text-gray-400" />
                              <span className="text-sm text-gray-900">0 tables</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getPriorityBadge(room.priority)}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              active
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                              manual
                            </Badge>
                          </td>
                           <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRoom(room);
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
                                  handleDeleteRoom(room);
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
              </motion.div>

            </div>
          </div>
        </div>

        {/* New Room Dialog */}
        <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="Enter room name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="room-priority">Priority Level</Label>
                <Select
                  value={newRoom.priority}
                  onValueChange={(value) => setNewRoom({ ...newRoom, priority: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High Priority</SelectItem>
                    <SelectItem value="Medium">Medium Priority</SelectItem>
                    <SelectItem value="Low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsNewRoomOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!newRoom.name.trim() || createRoomMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Room Dialog */}
        <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            {editingRoom && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-room-name">Room Name</Label>
                  <Input
                    id="edit-room-name"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    placeholder="Enter room name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-room-priority">Priority Level</Label>
                  <Select
                    value={editingRoom.priority}
                    onValueChange={(value) => setEditingRoom({ ...editingRoom, priority: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High Priority</SelectItem>
                      <SelectItem value="Medium">Medium Priority</SelectItem>
                      <SelectItem value="Low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingRoom(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateRoom}
                    disabled={!editingRoom.name.trim() || saveIndividualRoomMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saveIndividualRoomMutation.isPending ? "Updating..." : "Update Room"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Room</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to delete the room <strong>{roomToDelete?.name}</strong>?
              </p>
              <p className="text-red-600 text-sm mt-2">This action cannot be undone and will also delete all associated tables.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={confirmDeleteRoom}
                disabled={deleteRoomMutation.isPending}
              >
                {deleteRoomMutation.isPending ? "Deleting..." : "Delete Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}