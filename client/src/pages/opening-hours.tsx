
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OpeningHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

export default function OpeningHours() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<OpeningHours>({
    sunday: { isOpen: true, openTime: "10:00", closeTime: "21:00" },
    monday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
    saturday: { isOpen: true, openTime: "10:00", closeTime: "23:00" },
  });

  // Fetch existing opening hours
  const { data: existingHours, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/opening-hours`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save opening hours mutation
  const saveHoursMutation = useMutation({
    mutationFn: async (hoursData: OpeningHours) => {
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const hoursArray = daysMap.map((day, index) => ({
        dayOfWeek: index,
        isOpen: hoursData[day].isOpen,
        openTime: hoursData[day].openTime,
        closeTime: hoursData[day].closeTime,
      }));

      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/opening-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hours: hoursArray
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save opening hours');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Opening hours saved successfully!",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/opening-hours`]
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save opening hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing hours when data is fetched
  useEffect(() => {
    if (existingHours && existingHours.length > 0) {
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const loadedHours: OpeningHours = {};
      
      daysMap.forEach((day, index) => {
        const dayData = existingHours.find((h: any) => h.dayOfWeek === index);
        if (dayData) {
          loadedHours[day] = {
            isOpen: dayData.isOpen,
            openTime: dayData.openTime,
            closeTime: dayData.closeTime,
          };
        } else {
          loadedHours[day] = hours[day]; // fallback to default
        }
      });
      
      setHours(loadedHours);
    }
  }, [existingHours]);

  const days = [
    { key: "sunday", label: "Sunday" },
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
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
    saveHoursMutation.mutate(hours);
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
                href={`/${restaurant.tenantId}/dashboard`}
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
                disabled={saveHoursMutation.isPending || isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveHoursMutation.isPending ? "Saving..." : "Save Opening Hours"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
