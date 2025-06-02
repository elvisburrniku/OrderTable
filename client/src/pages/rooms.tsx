import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Room {
  name: string;
  priority: string;
}

export default function Rooms() {
  const { user, restaurant } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([
    { name: "The restaurant", priority: "Medium" }
  ]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Rooms</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 mb-3">General</div>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">The place</a>
              <a href="/opening-hours" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Opening hours</a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">General opening hours</a>
              <a href="/special-periods" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Special periods</a>
              <a href="/cut-off-time" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Cut-off time</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Tables and rooms</div>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Rooms</div>
              <a href="/tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Tables</a>
              <a href="/combined-tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Combined tables</a>
              <a href="/table-plan" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Table plan</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
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
                  onClick={addRoom}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Save
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
    </div>
  );
}