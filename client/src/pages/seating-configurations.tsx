import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function SeatingConfigurations() {
  const { user, restaurant } = useAuth();
  const [configurations, setConfigurations] = useState([
    {
      id: 1,
      name: "Default seating",
      criteria: "Unlimited",
      validOnline: "Unlimited"
    }
  ]);

  if (!user || !restaurant) {
    return null;
  }

  const addConfiguration = () => {
    const newConfig = {
      id: configurations.length + 1,
      name: "",
      criteria: "Unlimited", 
      validOnline: "Unlimited"
    };
    setConfigurations([...configurations, newConfig]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Seating configurations</h1>
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
              <a href="/special-periods" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Special periods</a>
              <a href="/cut-off-time" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Cut-off time</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Tables and rooms</div>
              <a href="/rooms" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Rooms</a>
              <a href="/tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Tables</a>
              <a href="/combined-tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Combined tables</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Booking settings</div>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Seating configurations</div>
              <a href="/periodic-criteria" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Periodic criteria</a>
              <a href="/custom-fields" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Custom Fields</a>
              <a href="/booking-agents" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Booking agents</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Seating configurations</CardTitle>
              <p className="text-sm text-gray-600">
                Special customers can be allowed to make reservations at specific times. You can create one or more 
                seating configurations. The configurations will then appear in the opening hours.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Seating name</div>
                
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">ID/key</div>
                  <div className="text-sm font-medium text-gray-700">Type name</div>
                  <div className="text-sm font-medium text-gray-700">Unlimited</div>
                  <div className="text-sm font-medium text-gray-700">Unlimited</div>
                </div>

                {configurations.map((config, index) => (
                  <div key={config.id} className="grid grid-cols-4 gap-4 items-center">
                    <Input
                      value={`00-${config.id.toString().padStart(2, '0')}`}
                      disabled
                      className="bg-gray-50"
                    />
                    <Input
                      placeholder="Type name"
                      value={config.name}
                      onChange={(e) => {
                        const newConfigs = [...configurations];
                        newConfigs[index].name = e.target.value;
                        setConfigurations(newConfigs);
                      }}
                    />
                    <Select value={config.criteria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unlimited">Unlimited</SelectItem>
                        <SelectItem value="Limited">Limited</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Select value={config.validOnline}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unlimited">Unlimited</SelectItem>
                          <SelectItem value="Limited">Limited</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        🗑
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button 
                  variant="outline"
                  onClick={addConfiguration}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  + Add seating configuration
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