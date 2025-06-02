import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingAgents() {
  const { user, restaurant } = useAuth();
  const [agents, setAgents] = useState<Array<{ name: string; status: string }>>([]);

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Booking agents</h1>
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
              <a href="/seating-configurations" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Seating configurations</a>
              <a href="/periodic-criteria" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Periodic criteria</a>
              <a href="/custom-fields" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Custom Fields</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Booking agents</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking agents</CardTitle>
              <p className="text-sm text-gray-600">
                Here you can give the opportunity to register external booking agents or a colleague who will be able to accept 
                reservations on behalf of guests, but without having to login as they might. These bookings will have it on top of 
                guest details that book externally for others. The system automatically updates the existing guest profile, and 
                therefore overrides the guest's name on previous bookings in case a booking agent makes bookings. The system will 
                be able to credit each tool the booking agents to view commission and potentially.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8 text-gray-500">
                <p>No booking agents have been created</p>
              </div>

              <div className="flex space-x-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
                <Button variant="outline">Add agent</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}