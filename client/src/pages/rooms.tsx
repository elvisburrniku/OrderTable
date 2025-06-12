import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-2xl font-bold">Room Management</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Organize your restaurant into different dining areas or rooms. Each room can have tables assigned to it for better management.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button onClick={addRoom} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Room</span>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room, index) => (
                    <Card key={index} className="relative">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`room-${index}`} className="text-sm font-medium">
                              Room Name
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Give each room a descriptive name like "Main Dining", "Patio", "Private Room", etc.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRoom(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete this room. This will also remove any tables assigned to it.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <Input
                          id={`room-${index}`}
                          value={room.name}
                          onChange={(e) => updateRoom(index, "name", e.target.value)}
                          placeholder="Enter room name"
                          className="w-full"
                        />

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`priority-${index}`} className="text-sm font-medium">
                              Priority Level
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Set booking priority: High priority rooms get filled first, Low priority rooms are used when others are full.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select
                            value={room.priority}
                            onValueChange={(value) => updateRoom(index, "priority", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High Priority</SelectItem>
                              <SelectItem value="Medium">Medium Priority</SelectItem>
                              <SelectItem value="Low">Low Priority</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {hasRoomChanges(room, index) && (
                          <div className="flex justify-end">
                            {room.isNew ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => saveRoom(room)}
                                    disabled={!room.name.trim() || saveIndividualRoomMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {saveIndividualRoomMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Save this new room to your restaurant</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => saveRoom(room)}
                                    disabled={!room.name.trim() || saveIndividualRoomMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {saveIndividualRoomMutation.isPending ? "Updating..." : "Update"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Save changes to this existing room</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {rooms.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No rooms configured yet.</p>
                    <Button onClick={addRoom} className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Your First Room</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}