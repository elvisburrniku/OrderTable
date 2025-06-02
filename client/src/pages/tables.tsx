import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TableData {
  id?: number;
  name: string;
  seats: number;
  priority: string;
}

export default function Tables() {
  const { user, restaurant } = useAuth();
  const [restaurantTables, setRestaurantTables] = useState<TableData[]>([
    { name: "1", seats: 2, priority: "Medium" },
    { name: "2", seats: 4, priority: "Medium" },
    { name: "3", seats: 6, priority: "Medium" },
    { name: "4", seats: 4, priority: "Medium" },
    { name: "5", seats: 4, priority: "Medium" },
    { name: "6", seats: 6, priority: "Medium" },
    { name: "7", seats: 8, priority: "Medium" },
    { name: "8", seats: 4, priority: "Medium" }
  ]);
  
  const [nonRoomTables, setNonRoomTables] = useState<TableData[]>([
    { name: "9", seats: 2, priority: "Medium" }
  ]);

  const { data: tables } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'tables'],
    enabled: !!restaurant
  });

  if (!user || !restaurant) {
    return null;
  }

  const addTable = (isRestaurant: boolean) => {
    const newTable = { name: "", seats: 2, priority: "Medium" };
    if (isRestaurant) {
      setRestaurantTables([...restaurantTables, newTable]);
    } else {
      setNonRoomTables([...nonRoomTables, newTable]);
    }
  };

  const updateTable = (index: number, field: keyof TableData, value: string | number, isRestaurant: boolean) => {
    if (isRestaurant) {
      const newTables = [...restaurantTables];
      newTables[index] = { ...newTables[index], [field]: value };
      setRestaurantTables(newTables);
    } else {
      const newTables = [...nonRoomTables];
      newTables[index] = { ...newTables[index], [field]: value };
      setNonRoomTables(newTables);
    }
  };

  const removeTable = (index: number, isRestaurant: boolean) => {
    if (isRestaurant) {
      const newTables = restaurantTables.filter((_, i) => i !== index);
      setRestaurantTables(newTables);
    } else {
      const newTables = nonRoomTables.filter((_, i) => i !== index);
      setNonRoomTables(newTables);
    }
  };

  const TableRow = ({ table, index, isRestaurant }: { table: TableData; index: number; isRestaurant: boolean }) => (
    <div className="grid grid-cols-5 gap-4 items-center py-2">
      <Input
        placeholder="Table name"
        value={table.name}
        onChange={(e) => updateTable(index, 'name', e.target.value, isRestaurant)}
      />
      <Select 
        value={table.seats.toString()} 
        onValueChange={(value) => updateTable(index, 'seats', parseInt(value), isRestaurant)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20].map((num) => (
            <SelectItem key={num} value={num.toString()}>
              {num}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select 
        value={table.priority} 
        onValueChange={(value) => updateTable(index, 'priority', value, isRestaurant)}
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
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" className="text-red-600">
          🗑
        </Button>
        <Button variant="ghost" size="sm">
          ⚙
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Tables</h1>
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
              <a href="/rooms" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Rooms</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Tables</div>
              <a href="/combined-tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Combined tables</a>
              <a href="/table-plan" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Table plan</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* The restaurant section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">The restaurant</h3>
                
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">Seats</div>
                  <div className="text-sm font-medium text-gray-700">Priority</div>
                  <div></div>
                </div>

                {restaurantTables.map((table, index) => (
                  <TableRow 
                    key={index} 
                    table={table} 
                    index={index} 
                    isRestaurant={true}
                  />
                ))}

                <Button 
                  variant="link" 
                  onClick={() => addTable(true)}
                  className="text-green-600 p-0 mt-2"
                >
                  + Add table
                </Button>
              </div>

              {/* Not in a room section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Not in a room</h3>
                
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">Seats</div>
                  <div className="text-sm font-medium text-gray-700">Priority</div>
                  <div></div>
                </div>

                {nonRoomTables.map((table, index) => (
                  <TableRow 
                    key={index} 
                    table={table} 
                    index={index} 
                    isRestaurant={false}
                  />
                ))}

                <Button 
                  variant="link" 
                  onClick={() => addTable(false)}
                  className="text-green-600 p-0 mt-2"
                >
                  + Add table
                </Button>
              </div>

              <div className="pt-6">
                <Button className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}