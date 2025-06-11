import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SpecialPeriod {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function SpecialPeriods() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const [periods, setPeriods] = useState<SpecialPeriod[]>([]);

  // Fetch existing special periods
  const { data: existingPeriods, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Create special period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (periodData: SpecialPeriod) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(periodData),
      });

      if (!response.ok) {
        throw new Error('Failed to create special period');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period created successfully!",
      });
      // Invalidate both API path and any nested query patterns
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && (
            queryKey.includes('special-periods') ||
            (queryKey.length >= 3 && queryKey[0] === 'specialPeriods')
          );
        }
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create special period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete special period mutation
  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/special-periods/${periodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete special period');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Special period deleted successfully!",
      });
      // Invalidate both API path and any nested query patterns
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && (
            queryKey.includes('special-periods') ||
            (queryKey.length >= 3 && queryKey[0] === 'specialPeriods')
          );
        }
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete special period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing periods when data is fetched
  useEffect(() => {
    console.log('Special periods data:', existingPeriods);
    if (existingPeriods && Array.isArray(existingPeriods)) {
      console.log('Processing periods:', existingPeriods.length);
      setPeriods(existingPeriods.map((period: any) => ({
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        isOpen: period.isOpen,
        openTime: period.openTime || "09:00",
        closeTime: period.closeTime || "22:00",
      })));
    }
  }, [existingPeriods]);

  if (!user || !restaurant) {
    return null;
  }

  const addPeriod = () => {
    setPeriods([...periods, { 
      name: "", 
      startDate: "", 
      endDate: "", 
      isOpen: true, 
      openTime: "09:00", 
      closeTime: "22:00" 
    }]);
  };

  const updatePeriod = (index: number, field: string, value: any) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const savePeriod = async (index: number) => {
    const period = periods[index];
    if (!period.name || !period.startDate || !period.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createPeriodMutation.mutate(period);
  };

  const deletePeriod = async (index: number, periodId?: number) => {
    if (periodId) {
      deletePeriodMutation.mutate(periodId);
    } else {
      // Remove from local state if not saved yet
      const newPeriods = periods.filter((_, i) => i !== index);
      setPeriods(newPeriods);
    }
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

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Special periods</CardTitle>
            <p className="text-sm text-gray-600">
              Here you can define periods with different opening hours and closing.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {periods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No special periods defined yet
              </div>
            ) : (
              <div className="space-y-4">
                {periods.map((period, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Special Period #{index + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePeriod(index, period.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`name-${index}`}>Period Name</Label>
                        <Input
                          id={`name-${index}`}
                          placeholder="e.g., Holiday Hours"
                          value={period.name}
                          onChange={(e) => updatePeriod(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`start-${index}`}>Start Date</Label>
                        <Input
                          id={`start-${index}`}
                          type="date"
                          value={period.startDate}
                          onChange={(e) => updatePeriod(index, 'startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${index}`}>End Date</Label>
                        <Input
                          id={`end-${index}`}
                          type="date"
                          value={period.endDate}
                          onChange={(e) => updatePeriod(index, 'endDate', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`open-${index}`}
                          checked={period.isOpen}
                          onCheckedChange={(checked) => updatePeriod(index, 'isOpen', checked)}
                        />
                        <Label htmlFor={`open-${index}`}>Restaurant Open</Label>
                      </div>
                    </div>

                    {period.isOpen && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`open-time-${index}`}>Open Time</Label>
                          <Input
                            id={`open-time-${index}`}
                            type="time"
                            value={period.openTime}
                            onChange={(e) => updatePeriod(index, 'openTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`close-time-${index}`}>Close Time</Label>
                          <Input
                            id={`close-time-${index}`}
                            type="time"
                            value={period.closeTime}
                            onChange={(e) => updatePeriod(index, 'closeTime', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {!period.id && (
                      <Button 
                        onClick={() => savePeriod(index)}
                        disabled={createPeriodMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {createPeriodMutation.isPending ? "Saving..." : "Save Period"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
  );
}