import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeSlot {
  from: string;
  to: string;
  onlineBooking: boolean;
}

interface DaySchedule {
  day: string;
  timeSlots: TimeSlot[];
}

export default function OpeningHours() {
  const { user, restaurant } = useAuth();
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: "Monday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Tuesday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Wednesday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Thursday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Friday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Saturday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] },
    { day: "Sunday", timeSlots: [{ from: "10:00", to: "22:00", onlineBooking: true }] }
  ]);

  if (!user || !restaurant) {
    return null;
  }

  const addTimeSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].timeSlots.push({ from: "12:00", to: "14:00", onlineBooking: true });
    setSchedule(newSchedule);
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string | boolean) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].timeSlots[slotIndex] = {
      ...newSchedule[dayIndex].timeSlots[slotIndex],
      [field]: value
    };
    setSchedule(newSchedule);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Opening hours</h1>
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
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Opening hours</div>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">General opening hours</a>
              <a href="/special-periods" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Special periods</a>
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
              <CardTitle>Opening hours</CardTitle>
              <p className="text-sm text-gray-600">
                Important: The closing time indicates when the last booking should end. If for example the closing time is 
                set to 10PM and a booking lasts 2 hours then dinner should start by 8 PM.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {schedule.map((daySchedule, dayIndex) => (
                <div key={daySchedule.day} className="space-y-3">
                  <h3 className="font-medium text-gray-900">{daySchedule.day}</h3>
                  
                  {daySchedule.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Select 
                          value={slot.from} 
                          onValueChange={(value) => updateTimeSlot(dayIndex, slotIndex, 'from', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                {`${i.toString().padStart(2, '0')}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-gray-500">to</span>
                        
                        <Select 
                          value={slot.to} 
                          onValueChange={(value) => updateTimeSlot(dayIndex, slotIndex, 'to', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                {`${i.toString().padStart(2, '0')}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={slot.onlineBooking}
                          onCheckedChange={(checked) => updateTimeSlot(dayIndex, slotIndex, 'onlineBooking', checked)}
                        />
                        <span className="text-sm text-gray-600">Online booking</span>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="text-red-600">
                        🗑
                      </Button>
                    </div>
                  ))}
                  
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => addTimeSlot(dayIndex)}
                    className="text-green-600 p-0"
                  >
                    + Add opening hours
                  </Button>
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