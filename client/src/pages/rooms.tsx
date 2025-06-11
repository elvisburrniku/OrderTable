import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Room {
  id?: number;
  name: string;
  priority: string;
  restaurantId?: number;
  tenantId?: number;
}

export default function Rooms() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<Room[]>([]);

  // Fetch rooms from API
  const { data: fetchedRooms = [], isLoading } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "rooms"],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/rooms`,
      );
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Update local state when rooms are fetched
  useEffect(() => {
    if (fetchedRooms.length > 0) {
      setRooms(fetchedRooms);
    } else if (!isLoading && fetchedRooms.length === 0) {
      // If no rooms exist, start with default room
      setRooms([{ name: "The restaurant", priority: "Medium" }]);
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
              `/api/tenants/${currentTenantId}/rooms/${room.id}`,
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

  const addRoom = () => {
    setRooms([...rooms, { name: "", priority: "Medium" }]);
  };

  const updateRoom = (index: number, field: keyof Room, value: string) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRooms(newRooms);
  };

  const removeRoom = (index: number) => {
    const newRooms = rooms.filter((_, i) => i !== index);
    setRooms(newRooms);
  };

  const saveRooms = () => {
    // Filter out rooms with empty names
    const validRooms = rooms.filter(room => room.name.trim() !== "");
    saveRoomsMutation.mutate(validRooms);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Rooms</h1>
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
              <CardTitle>Rooms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                </div>
              </div>

              {rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-center">
                  <Input
                    placeholder="Room name"
                    value={room.name}
                    onChange={(e) => updateRoom(index, 'name', e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeRoom(index)}
                      className="text-red-600"
                    >
                      🗑
                    </Button>
                    <Button variant="ghost" size="sm">
                      ⚙
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex space-x-4">
                <Button 
                  onClick={saveRooms}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saveRoomsMutation.isPending}
                >
                  {saveRoomsMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={addRoom}
                >
                  Add area
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}