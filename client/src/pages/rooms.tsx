import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Info, Plus, Save, Edit, Trash2 } from "lucide-react";

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [originalRooms, setOriginalRooms] = useState<Room[]>([]);

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

  // Fetch rooms from API
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

  // Update local state when rooms are fetched
  useEffect(() => {
    if (fetchedRooms.length > 0) {
      setRooms(fetchedRooms);
      setOriginalRooms(fetchedRooms);
    } else if (!isLoading && fetchedRooms.length === 0) {
      // If no rooms exist, start with default room
      setRooms([{ name: "The restaurant", priority: "Medium", isNew: true }]);
      setOriginalRooms([]);
    }
  }, [fetchedRooms, isLoading]);

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
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('rooms') ||
              key.includes('statistics') ||
              key.includes('dashboard') ||
              key.includes('restaurant') ||
              key.includes('tables') ||
              key.includes(`tenants/${restaurant?.tenantId}`)
            )
          );
        }
      });
      
      // Force refetch of current page data
      queryClient.refetchQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
    },
    onError: (error) => {
      console.error("Room save error:", error);
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  // Check if room has changes compared to original
  const hasRoomChanges = (room: Room, index: number): boolean => {
    if (room.isNew) return true;
    const original = originalRooms.find(orig => orig.id === room.id);
    if (!original) return true;
    return room.name !== original.name || room.priority !== original.priority;
  };

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/rooms/${roomId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete room: ${errorData.message || response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
    },
  });

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

  // Save individual room
  const saveRoom = async (room: Room) => {
    const currentTenantId = restaurant?.tenantId;
    if (!currentTenantId || !restaurant?.id) return;

    if (room.id && !room.isNew) {
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
  };

  // Individual room save mutation
  const saveIndividualRoomMutation = useMutation({
    mutationFn: saveRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"] 
      });
    },
  });

  const saveRooms = () => {
    // Filter out rooms with empty names
    const validRooms = rooms.filter(room => room.name.trim() !== "");
    saveRoomsMutation.mutate(validRooms);
  };

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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-semibold">Rooms</h1>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage your restaurant's seating areas and dining rooms</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <nav className="flex space-x-6">
                <a href={`/${restaurant.tenantId}/dashboard`} className="text-gray-600 hover:text-gray-900">Booking</a>
                <a href={`/${restaurant.tenantId}/bookings`} className="text-green-600 font-medium">CRM</a>
                <a href={`/${restaurant.tenantId}/activity-log`} className="text-gray-600 hover:text-gray-900">Archive</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{restaurant.name}</span>
              <Button variant="outline" size="sm">Profile</Button>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Rooms</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configure dining areas and seating sections for your restaurant</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enter a descriptive name for this dining area (e.g., "Main Dining", "Patio", "Private Room")</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Set booking priority: High = preferred seating, Medium = standard, Low = overflow area</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save new rooms, update existing ones, or delete unwanted areas</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-center">
                  <Input
                    placeholder="Room name"
                    value={room.name}
                    onChange={(e) => updateRoom(index, 'name', e.target.value)}
                  />
                  <Select 
                    value={room.priority} 
                    onValueChange={(value) => updateRoom(index, 'priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    {room.isNew && room.name.trim() !== "" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            onClick={() => saveIndividualRoomMutation.mutate(room)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            disabled={saveIndividualRoomMutation.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {saveIndividualRoomMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Save this new room to your restaurant configuration</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!room.isNew && hasRoomChanges(room, index) && room.name.trim() !== "" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            onClick={() => saveIndividualRoomMutation.mutate(room)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                            disabled={saveIndividualRoomMutation.isPending}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {saveIndividualRoomMutation.isPending ? "Updating..." : "Update"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Update the changes made to this existing room</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeRoom(index)}
                          className="text-red-600 hover:bg-red-50"
                          disabled={deleteRoomMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete this room from your restaurant</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}

              <div className="flex space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      onClick={addRoom}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add area
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new dining area or seating section for your restaurant</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}