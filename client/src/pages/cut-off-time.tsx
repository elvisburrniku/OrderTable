import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthGuard } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function CutOffTime() {
  const { isLoading: authLoading, isAuthenticated, user, restaurant } = useAuthGuard();
  const queryClient = useQueryClient();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const [cutOffTimes, setCutOffTimes] = useState({
    Sunday: "None",
    Monday: "None",
    Tuesday: "None", 
    Wednesday: "None",
    Thursday: "None",
    Friday: "None",
    Saturday: "None"
  });

  // Fetch existing cut-off times
  const { data: existingCutOffTimes, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save cut-off times mutation
  const saveCutOffTimesMutation = useMutation({
    mutationFn: async (timesData: any) => {
      const cutOffHoursMap: { [key: string]: number } = {
        "None": 0,
        "1 hour before": 1,
        "2 hours before": 2,
        "3 hours before": 3,
        "4 hours before": 4,
        "6 hours before": 6,
        "12 hours before": 12,
        "1 day before": 24,
        "2 days before": 48,
        "3 days before": 72
      };

      const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const cutOffTimesArray = daysMap.map(day => ({
        cutOffHours: cutOffHoursMap[timesData[day]] || 0
      }));

      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cutOffTimes: cutOffTimesArray }),
      });

      if (!response.ok) {
        throw new Error('Failed to save cut-off times');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cut-off times saved successfully!",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`]
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save cut-off times. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing cut-off times when data is fetched
  useEffect(() => {
    if (existingCutOffTimes && existingCutOffTimes.length > 0) {
      const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hoursToTextMap: { [key: number]: string } = {
        0: "None",
        1: "1 hour before",
        2: "2 hours before",
        3: "3 hours before",
        4: "4 hours before",
        6: "6 hours before",
        12: "12 hours before",
        24: "1 day before",
        48: "2 days before",
        72: "3 days before"
      };

      const loadedTimes: any = {};
      daysMap.forEach((day, index) => {
        const dayData = existingCutOffTimes.find((t: any) => t.dayOfWeek === index);
        if (dayData) {
          loadedTimes[day] = hoursToTextMap[dayData.cutOffHours] || "None";
        } else {
          loadedTimes[day] = "None";
        }
      });
      
      setCutOffTimes(loadedTimes);
    }
  }, [existingCutOffTimes]);

  const updateCutOffTime = (day: string, time: string) => {
    setCutOffTimes({ ...cutOffTimes, [day]: time });
  };

  const handleSave = () => {
    saveCutOffTimesMutation.mutate(cutOffTimes);
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
                <Button 
                  onClick={handleSave}
                  disabled={saveCutOffTimesMutation.isPending || isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveCutOffTimesMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}