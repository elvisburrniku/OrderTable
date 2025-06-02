
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";

interface OpeningHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

export default function OpeningHours() {
  const { user, restaurant } = useAuth();
  const [hours, setHours] = useState<OpeningHours>({
    monday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
    saturday: { isOpen: true, openTime: "10:00", closeTime: "23:00" },
    sunday: { isOpen: true, openTime: "10:00", closeTime: "21:00" },
  });

  const [isSaving, setIsSaving] = useState(false);

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const handleTimeChange = (day: string, field: string, value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleToggleDay = (day: string, isOpen: boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("Opening hours saved successfully!");
  };

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Opening Hours</h1>
            <nav className="flex space-x-6">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Booking
              </a>
              <a href="#" className="text-green-600 font-medium">
                CRM
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Archive
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Restaurant Opening Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {days.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={hours[key].isOpen}
                      onCheckedChange={(checked) => handleToggleDay(key, checked)}
                    />
                    <Label className="w-24 font-medium">{label}</Label>
                  </div>
                  
                  {hours[key].isOpen ? (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${key}-open`} className="text-sm">Open:</Label>
                        <Input
                          id={`${key}-open`}
                          type="time"
                          value={hours[key].openTime}
                          onChange={(e) => handleTimeChange(key, 'openTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`${key}-close`} className="text-sm">Close:</Label>
                        <Input
                          id={`${key}-close`}
                          type="time"
                          value={hours[key].closeTime}
                          onChange={(e) => handleTimeChange(key, 'closeTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Opening Hours"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
