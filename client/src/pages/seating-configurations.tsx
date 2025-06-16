import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function SeatingConfigurations() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [configurations, setConfigurations] = useState([]);

  // Fetch seating configurations
  const { data: fetchedConfigurations, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/seating-configurations`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  useEffect(() => {
    if (fetchedConfigurations) {
      setConfigurations(fetchedConfigurations);
    }
  }, [fetchedConfigurations]);

  // Save configurations mutation
  const saveConfigurationsMutation = useMutation({
    mutationFn: async () => {
      const promises = configurations.map(async (config) => {
        if (config.id && config.id > 0) {
          // Update existing configuration
          return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations/${config.id}`, {
            name: config.name,
            criteria: config.criteria,
            validOnline: config.validOnline,
            isActive: config.isActive ?? true,
          });
        } else {
          // Create new configuration
          return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`, {
            name: config.name,
            criteria: config.criteria,
            validOnline: config.validOnline,
            isActive: config.isActive ?? true,
          });
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seating configurations saved successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save seating configurations",
        variant: "destructive",
      });
      console.error("Error saving configurations:", error);
    },
  });

  // Delete configuration mutation
  const deleteConfigurationMutation = useMutation({
    mutationFn: async (configId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations/${configId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seating configuration deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/seating-configurations`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete seating configuration",
        variant: "destructive",
      });
      console.error("Error deleting configuration:", error);
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const addConfiguration = () => {
    const newConfig = {
      id: -(configurations.length + 1), // Negative ID for new items
      name: "",
      criteria: "Unlimited", 
      validOnline: "Unlimited",
      isActive: true,
    };
    setConfigurations([...configurations, newConfig]);
  };

  const updateConfiguration = (index: number, field: string, value: string) => {
    const updatedConfigs = [...configurations];
    updatedConfigs[index] = { ...updatedConfigs[index], [field]: value };
    setConfigurations(updatedConfigs);
  };

  const deleteConfiguration = (index: number) => {
    const config = configurations[index];
    if (config.id && config.id > 0) {
      // Delete from backend if it exists
      deleteConfigurationMutation.mutate(config.id);
    }
    // Remove from local state
    const updatedConfigs = configurations.filter((_, i) => i !== index);
    setConfigurations(updatedConfigs);
  };

  const handleSave = () => {
    // Filter out configurations with empty names
    const validConfigs = configurations.filter(config => config.name.trim() !== "");
    if (validConfigs.length !== configurations.length) {
      setConfigurations(validConfigs);
    }
    saveConfigurationsMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Seating configurations</h1>
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
              <CardTitle>Seating configurations</CardTitle>
              <p className="text-sm text-gray-600">
                Special customers can be allowed to make reservations at specific times. You can create one or more 
                seating configurations. The configurations will then appear in the opening hours.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Seating name</div>
                
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">ID/key</div>
                  <div className="text-sm font-medium text-gray-700">Type name</div>
                  <div className="text-sm font-medium text-gray-700">Criteria</div>
                  <div className="text-sm font-medium text-gray-700">Valid Online</div>
                  <div className="text-sm font-medium text-gray-700">Actions</div>
                </div>

                {isLoading ? (
                  <div className="text-center py-4">Loading configurations...</div>
                ) : (
                  configurations.map((config, index) => (
                    <div key={config.id || index} className="grid grid-cols-5 gap-4 items-center">
                      <Input
                        value={config.id > 0 ? `00-${config.id.toString().padStart(2, '0')}` : 'NEW'}
                        disabled
                        className="bg-gray-50"
                      />
                      <Input
                        placeholder="Type name"
                        value={config.name || ""}
                        onChange={(e) => updateConfiguration(index, 'name', e.target.value)}
                      />
                      <Select value={config.criteria} onValueChange={(value) => updateConfiguration(index, 'criteria', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unlimited">Unlimited</SelectItem>
                          <SelectItem value="Limited">Limited</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={config.validOnline} onValueChange={(value) => updateConfiguration(index, 'validOnline', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unlimited">Unlimited</SelectItem>
                          <SelectItem value="Limited">Limited</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteConfiguration(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4">
                <Button 
                  variant="outline"
                  onClick={addConfiguration}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  + Add seating configuration
                </Button>
              </div>

              <div className="pt-6">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSave}
                  disabled={saveConfigurationsMutation.isPending}
                >
                  {saveConfigurationsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}