import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CombinedTables() {
  const { isLoading: authLoading, isAuthenticated, user, restaurant } = useAuthGuard();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const availableTables = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  const addCombination = () => {
    setCombinations([...combinations, { tables: [], seats: 0 }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Combined tables</h1>
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
              <a href="/tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Tables</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Combined tables</div>
              <a href="/table-plan" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Table plan</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Combined tables</CardTitle>
              <p className="text-sm text-gray-600">
                Here you can combine multiple tables to create larger seating arrangements.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {combinations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No table combinations defined yet
                </div>
              ) : (
                combinations.map((combo, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tables</label>
                        <div className="flex space-x-2">
                          {availableTables.map((table) => (
                            <Button
                              key={table}
                              variant={combo.tables.includes(table) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const newCombinations = [...combinations];
                                if (combo.tables.includes(table)) {
                                  newCombinations[index].tables = combo.tables.filter(t => t !== table);
                                } else {
                                  newCombinations[index].tables = [...combo.tables, table];
                                }
                                setCombinations(newCombinations);
                              }}
                            >
                              {table}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Seats</label>
                        <div className="text-lg font-semibold">{combo.tables.length * 4}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        🗑
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <div className="flex space-x-4">
                <Button 
                  onClick={addCombination}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add combination
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}