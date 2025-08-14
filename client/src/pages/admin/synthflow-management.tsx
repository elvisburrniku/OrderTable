import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Phone, Settings, CheckCircle, XCircle, Loader2, Play, Sync, Activity } from 'lucide-react';

export default function SynthflowManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // Test Synthflow connection
  const { data: connectionStatus, isLoading: isTestingConnection } = useQuery({
    queryKey: ['/api/synthflow/test-connection'],
  });

  // Get all voice agents that need Synthflow setup
  const { data: voiceAgents, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['/api/admin/voice-agents'],
  });

  // Get available phone numbers from Synthflow
  const { data: availablePhones, isLoading: isLoadingPhones } = useQuery({
    queryKey: ['/api/synthflow/available-phones'],
    enabled: !!connectionStatus?.success,
  });

  // Create Synthflow agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async ({ tenantId, restaurantId, restaurantName, language }: {
      tenantId: number;
      restaurantId: number;
      restaurantName: string;
      language: string;
    }) => {
      const response = await apiRequest('POST', `/api/synthflow/create-agent/${tenantId}/${restaurantId}`, {
        restaurantName,
        language
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Synthflow agent created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/voice-agents'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Synthflow agent',
        variant: 'destructive',
      });
    },
  });

  // Sync calls mutation
  const syncCallsMutation = useMutation({
    mutationFn: async ({ tenantId, restaurantId }: { tenantId: number; restaurantId: number }) => {
      const response = await apiRequest('POST', `/api/synthflow/sync-calls/${tenantId}/${restaurantId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Synced ${data.newCalls} new calls from Synthflow`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync calls',
        variant: 'destructive',
      });
    },
  });

  // Assign phone number mutation
  const assignPhoneMutation = useMutation({
    mutationFn: async ({ agentId, phoneNumber }: { agentId: string; phoneNumber: string }) => {
      const response = await apiRequest('POST', `/api/synthflow/assign-phone/${agentId}`, {
        phoneNumber
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Phone number assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/voice-agents'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign phone number',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Synthflow Integration Management</h1>
          <p className="text-muted-foreground">
            Manage AI voice agents and Synthflow integration for all tenants
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Synthflow API Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTestingConnection ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Testing connection...</span>
            </div>
          ) : connectionStatus?.success ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>
                Connected successfully - {connectionStatus.agentCount} agents found
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span>Connection failed - Check API key configuration</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Phone Numbers */}
      {connectionStatus?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Available Phone Numbers
            </CardTitle>
            <CardDescription>
              Phone numbers available for assignment to voice agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPhones ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading available phone numbers...</span>
              </div>
            ) : availablePhones?.phoneNumbers?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {availablePhones.phoneNumbers.map((phone: string, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="font-mono text-sm">{phone}</p>
                    <Badge variant="outline" className="mt-1">Available</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No available phone numbers found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Voice Agents Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Voice Agents
          </CardTitle>
          <CardDescription>
            Manage Synthflow AI agents for all restaurant tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAgents ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading voice agents...</span>
            </div>
          ) : voiceAgents?.length > 0 ? (
            <div className="space-y-4">
              {voiceAgents.map((agent: any) => (
                <div key={agent.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        {agent.restaurantName} ({agent.tenantName})
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Language: {agent.language || 'en'} | 
                        Max calls: {agent.maxCallsPerMonth}/month
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={agent.isActive ? 'default' : 'secondary'}
                      >
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {agent.synthflowAgentId && (
                        <Badge variant="outline">
                          Synthflow: {agent.synthflowAgentId.slice(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!agent.synthflowAgentId ? (
                      <Button
                        onClick={() => createAgentMutation.mutate({
                          tenantId: agent.tenantId,
                          restaurantId: agent.restaurantId,
                          restaurantName: agent.restaurantName,
                          language: agent.language || 'en'
                        })}
                        disabled={createAgentMutation.isPending}
                        size="sm"
                      >
                        {createAgentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Create Synthflow Agent
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => syncCallsMutation.mutate({
                            tenantId: agent.tenantId,
                            restaurantId: agent.restaurantId
                          })}
                          disabled={syncCallsMutation.isPending}
                          size="sm"
                          variant="outline"
                        >
                          {syncCallsMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sync className="w-4 h-4 mr-2" />
                          )}
                          Sync Calls
                        </Button>

                        {agent.phoneNumber ? (
                          <Badge variant="default" className="font-mono">
                            📞 {agent.phoneNumber}
                          </Badge>
                        ) : availablePhones?.phoneNumbers?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(phone) => 
                              assignPhoneMutation.mutate({ 
                                agentId: agent.synthflowAgentId, 
                                phoneNumber: phone 
                              })
                            }>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Assign phone number" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePhones.phoneNumbers.map((phone: string) => (
                                  <SelectItem key={phone} value={phone}>
                                    {phone}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Agent Configuration Display */}
                  {agent.agentConfig && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-sm font-medium mb-1">Agent Configuration:</p>
                      <p className="text-xs text-muted-foreground">
                        Voice: {agent.agentConfig.voice_id} | 
                        Greeting: {agent.agentConfig.greeting_message?.slice(0, 50)}...
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No voice agents found</p>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Synthflow Configuration</CardTitle>
          <CardDescription>
            System-wide settings for Synthflow integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>API Endpoint</Label>
                <Input value="https://api.synthflow.ai/v2" disabled />
              </div>
              <div>
                <Label>Webhook URL</Label>
                <Input 
                  value={`${window.location.origin}/api/synthflow/webhook`} 
                  disabled 
                />
              </div>
            </div>
            
            <div>
              <Label>Default Voice Configuration</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label className="text-xs">English Voice</Label>
                  <Input value="en-US-JennyNeural" disabled />
                </div>
                <div>
                  <Label className="text-xs">French Voice</Label>
                  <Input value="fr-FR-DeniseNeural" disabled />
                </div>
                <div>
                  <Label className="text-xs">Spanish Voice</Label>
                  <Input value="es-ES-ElviraNeural" disabled />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}