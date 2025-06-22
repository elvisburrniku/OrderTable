import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthGuard } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Clock, Save } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

export default function CutOffTime() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const queryClient = useQueryClient();

  // Auto scroll to top when page loads
  useScrollToTop();

  const [cutOffTimes, setCutOffTimes] = useState({
    Sunday: "None",
    Monday: "None",
    Tuesday: "None",
    Wednesday: "None",
    Thursday: "None",
    Friday: "None",
    Saturday: "None",
  });

  // Fetch existing cut-off times
  const { data: existingCutOffTimes, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`,
    ],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save cut-off times mutation
  const saveCutOffTimesMutation = useMutation({
    mutationFn: async (timesData: any) => {
      const cutOffHoursMap: { [key: string]: number } = {
        None: 0,
        "1 hour before": 1,
        "2 hours before": 2,
        "3 hours before": 3,
        "4 hours before": 4,
        "6 hours before": 6,
        "12 hours before": 12,
        "1 day before": 24,
        "2 days before": 48,
        "3 days before": 72,
      };

      const daysMap = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const cutOffTimesArray = daysMap.map((day, index) => ({
        dayOfWeek: index, // 0 = Sunday, 1 = Monday, etc.
        cutOffHours: cutOffHoursMap[timesData[day]] || 0,
        isEnabled: true,
      }));

      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cutOffTimes: cutOffTimesArray }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save cut-off times");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cut-off times saved successfully!",
      });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/cut-off-times`,
        ],
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
    if (
      existingCutOffTimes &&
      Array.isArray(existingCutOffTimes) &&
      existingCutOffTimes.length > 0
    ) {
      const daysMap = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
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
        72: "3 days before",
      };

      const loadedTimes: any = {};
      daysMap.forEach((day, index) => {
        const dayData = existingCutOffTimes.find(
          (t: any) => t.dayOfWeek === index,
        );
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
    "3 days before",
  ];

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Clock className="h-6 w-6 text-green-600" />
                Cut-off time
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  onClick={handleSave}
                  disabled={saveCutOffTimesMutation.isPending || isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saveCutOffTimesMutation.isPending ? "Saving..." : "Save"}</span>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Description Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="p-6 border-b"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Booking Cut-off Times</h2>
            <p className="text-sm text-gray-600">
              Here you can specify until when online booking should be closed for bookings for the same day.
            </p>
          </motion.div>

          {/* Cut-off Times List */}
          <div className="p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              {Object.entries(cutOffTimes).map(([day, time], index) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900 block">
                        {day}
                      </label>
                      <p className="text-xs text-gray-500">Cut-off time for {day.toLowerCase()}</p>
                    </div>
                  </div>
                  <Select
                    value={time}
                    onValueChange={(value) => updateCutOffTime(day, value)}
                  >
                    <SelectTrigger className="w-48 h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-2 border-gray-200">
                      {timeOptions.map((option) => (
                        <SelectItem key={option} value={option} className="rounded-md">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
