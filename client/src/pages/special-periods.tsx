import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpecialPeriods() {
  const { user, restaurant } = useAuth();
  const [periods, setPeriods] = useState<Array<{ name: string; period: string }>>([]);

  if (!user || !restaurant) {
    return null;
  }

  const addPeriod = () => {
    setPeriods([...periods, { name: "", period: "" }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Special periods</h1>
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
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Special periods</div>
              <a href="/cut-off-time" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Cut-off time</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Tables and rooms</div>
              <a href="/rooms" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Rooms</a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Booking settings</a>
              <a href="/tags" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Tags</a>
              <a href="/booking-types" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Booking types</a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Logics</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Special periods</CardTitle>
              <p className="text-sm text-gray-600">
                Here you can define periods with different opening hours and closing.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <div className="text-sm text-gray-500">Name</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                  <div className="text-sm text-gray-500">Period</div>
                </div>
              </div>

              {periods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No special periods defined yet
                </div>
              ) : (
                periods.map((period, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Period name"
                      value={period.name}
                      onChange={(e) => {
                        const newPeriods = [...periods];
                        newPeriods[index].name = e.target.value;
                        setPeriods(newPeriods);
                      }}
                    />
                    <Input
                      placeholder="Date range"
                      value={period.period}
                      onChange={(e) => {
                        const newPeriods = [...periods];
                        newPeriods[index].period = e.target.value;
                        setPeriods(newPeriods);
                      }}
                    />
                  </div>
                ))
              )}

              <Button 
                onClick={addPeriod}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add period
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}