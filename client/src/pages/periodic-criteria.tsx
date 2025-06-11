import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PeriodicCriteria() {
  const { user, restaurant } = useAuth();
  const [criteria, setCriteria] = useState<Array<{ name: string; period: string; guests: string; settings: string }>>([]);

  if (!user || !restaurant) {
    return null;
  }

  const addCriteria = () => {
    setCriteria([...criteria, { name: "", period: "", guests: "", settings: "" }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Periodic criteria</h1>
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

      {/* Main Content */}
      <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Periodic criteria</CardTitle>
              <p className="text-sm text-gray-600">
                Set up different criteria for specific periods of the day. Afterwards you can add one or more of the criteria 
                per weekday in the opening hours. Periodic criteria are also the basis of a specific dates and booking types.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium text-gray-700">Name</div>
                <div className="text-sm font-medium text-gray-700">Period</div>
                <div className="text-sm font-medium text-gray-700">Guests</div>
                <div className="text-sm font-medium text-gray-700">Settings</div>
              </div>

              {criteria.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No periodic criteria defined yet
                </div>
              ) : (
                criteria.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4">
                    <Input
                      placeholder="Criteria name"
                      value={item.name}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].name = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                    <Input
                      placeholder="Time period"
                      value={item.period}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].period = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                    <Input
                      placeholder="Guest count"
                      value={item.guests}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].guests = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                    <Input
                      placeholder="Settings"
                      value={item.settings}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].settings = e.target.value;
                        setCriteria(newCriteria);
                      }}
                    />
                  </div>
                ))
              )}

              <Button 
                onClick={addCriteria}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add periodic criterion
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}