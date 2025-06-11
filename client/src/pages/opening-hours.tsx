import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

export default function OpeningHours() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id;

  const [hours, setHours] = useState([
    { day: "Sunday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Monday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Tuesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Wednesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Thursday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Friday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Saturday", enabled: true, open: "05:00", close: "09:00" }
  ]);

  // Load existing opening hours
  const { data: existingHours } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`],
    enabled: !!tenantId,
  });

  // Load existing hours into state when data is available
  useEffect(() => {
    if (existingHours && Array.isArray(existingHours) && existingHours.length > 0) {
      const formattedHours = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => {
        const existingHour = existingHours.find((h: any) => h.dayOfWeek === index);
        return {
          day,
          enabled: existingHour ? existingHour.isOpen : true,
          open: existingHour ? existingHour.openTime : "09:00",
          close: existingHour ? existingHour.closeTime : "17:00"
        };
      });
      setHours(formattedHours);
    }
  }, [existingHours]);

  // Save opening hours mutation
  const saveHoursMutation = useMutation({
    mutationFn: async () => {
      const hoursData = hours.map((hour, index) => ({
        dayOfWeek: index,
        isOpen: hour.enabled,
        openTime: hour.open,
        closeTime: hour.close,
      }));
      
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`, hoursData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Opening hours saved successfully!" });
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as (string | number)[];
          return queryKey.some(key => 
            (typeof key === 'string' && (
              key.includes('opening-hours') ||
              key.includes('openingHours') ||
              key.includes('statistics') ||
              key.includes('dashboard') ||
              key.includes('restaurant') ||
              key.includes(`tenants/${tenantId}`)
            )) ||
            (typeof key === 'number' && key === restaurantId)
          );
        }
      });
      
      // Force refetch specific query keys used by different components
      queryClient.refetchQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`] 
      });
      queryClient.refetchQueries({ 
        queryKey: ["openingHours", restaurantId, parseInt(tenantId)] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving opening hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleDay = (index: number) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, enabled: !hour.enabled } : hour
    ));
  };

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, [field]: value } : hour
    ));
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Restaurant Opening Hours
          </CardTitle>
          <p className="text-sm text-gray-600">
            Set your restaurant's operating hours for each day of the week.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-0">
            {hours.map((hour, index) => (
              <div key={hour.day} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <Switch
                    checked={hour.enabled}
                    onCheckedChange={() => toggleDay(index)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <span className="font-medium text-gray-900 w-20">{hour.day}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-12">Open:</span>
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={hour.open}
                        onChange={(e) => updateTime(index, 'open', e.target.value)}
                        disabled={!hour.enabled}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 w-20"
                      />
                      <span className="ml-1 text-xs text-gray-500 w-6">AM</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-12">Close:</span>
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={hour.close}
                        onChange={(e) => updateTime(index, 'close', e.target.value)}
                        disabled={!hour.enabled}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 w-20"
                      />
                      <span className="ml-1 text-xs text-gray-500 w-6">PM</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => saveHoursMutation.mutate()}
              disabled={saveHoursMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
            >
              {saveHoursMutation.isPending ? "Saving..." : "Save Opening Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}