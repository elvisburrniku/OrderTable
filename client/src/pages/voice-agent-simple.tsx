import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Phone, Power, PowerOff, Copy, Mic, AlertCircle, CheckCircle } from 'lucide-react';

interface VoiceAgentSimpleProps {
  tenantId: string;
  restaurantId: string;
}

export default function VoiceAgentSimple({ tenantId, restaurantId }: VoiceAgentSimpleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch voice agent status
  const { data: agentData, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-simple`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Toggle voice agent mutation
  const toggleMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      return await apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-toggle`, {
        method: 'POST',
        body: JSON.stringify({ activate })
      });
    },
    onSuccess: (data, activate) => {
      toast({
        title: activate ? "Voice Agent Activated" : "Voice Agent Deactivated",
        description: activate 
          ? "Your AI voice agent is now answering customer calls" 
          : "Your AI voice agent has been deactivated",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-simple`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update voice agent status",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsToggling(false);
    }
  });

  const handleToggle = () => {
    if (isToggling) return;
    
    setIsToggling(true);
    const newState = !agentData?.isActive;
    toggleMutation.mutate(newState);
  };

  const copyPhoneNumber = () => {
    if (agentData?.phoneNumber) {
      navigator.clipboard.writeText(agentData.phoneNumber);
      toast({
        title: "Phone number copied",
        description: "Phone number has been copied to your clipboard"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Voice Assistant</h1>
        <p className="text-muted-foreground">
          Manage your restaurant's AI-powered phone assistant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Agent Status
          </CardTitle>
          <CardDescription>
            Control your AI assistant that handles customer phone calls 24/7
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Current Status:</span>
            <div className="flex items-center gap-2">
              {agentData?.isActive ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="default" className="bg-green-600">
                    Active
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Inactive
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Phone Number */}
          {agentData?.phoneNumber && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5" />
                Customer Phone Number
              </h3>
              <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-4 border shadow-sm">
                <div>
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {agentData.phoneNumber}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share this number with your customers
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPhoneNumber}
                  className="ml-4"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {/* Control Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleToggle}
              disabled={isToggling}
              className={`w-full h-12 text-lg font-medium ${
                agentData?.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              data-testid={agentData?.isActive ? 'button-deactivate-agent' : 'button-activate-agent'}
            >
              {isToggling ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {agentData?.isActive ? 'Deactivating...' : 'Activating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {agentData?.isActive ? (
                    <>
                      <PowerOff className="w-5 h-5" />
                      Deactivate Voice Agent
                    </>
                  ) : (
                    <>
                      <Power className="w-5 h-5" />
                      Activate Voice Agent
                    </>
                  )}
                </div>
              )}
            </Button>
          </div>

          {/* Information */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Customers call the number above to reach your AI assistant</li>
              <li>• The AI handles reservations, questions, and basic inquiries</li>
              <li>• Bookings are automatically added to your restaurant system</li>
              <li>• Available 24/7, even when your restaurant is closed</li>
              <li>• Provides information about menu, hours, and location</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {agentData?.isActive && agentData?.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{agentData.stats.callsToday || 0}</p>
                <p className="text-sm text-muted-foreground">Calls Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{agentData.stats.bookingsToday || 0}</p>
                <p className="text-sm text-muted-foreground">Bookings Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}