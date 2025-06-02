import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CutOffTime() {
  const { user, restaurant } = useAuth();
  const [cutOffTimes, setCutOffTimes] = useState({
    Monday: "None",
    Tuesday: "None", 
    Wednesday: "None",
    Thursday: "None",
    Friday: "None",
    Saturday: "None",
    Sunday: "None"
  });

  if (!user || !restaurant) {
    return null;
  }

  const updateCutOffTime = (day: string, time: string) => {
    setCutOffTimes({ ...cutOffTimes, [day]: time });
  };

  const timeOptions = [
    "None",
    "1 hour before",
    "2 hours before", 
    "3 hours before",
    "4 hours before",
    "6 hours before",
    "12 hours before",
    "1 day before",
    "2 days before",
    "3 days before"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Cut-off time</h1>
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
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Cut-off time</div>
              
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
              <CardTitle>Cut-off time</CardTitle>
              <p className="text-sm text-gray-600">
                Here you can specify until when online booking should be closed for bookings for the same day.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(cutOffTimes).map(([day, time]) => (
                <div key={day} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 w-24">{day}</label>
                  <Select value={time} onValueChange={(value) => updateCutOffTime(day, value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              
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