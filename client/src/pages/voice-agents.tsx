import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Phone, Bot, CreditCard, PhoneCall, Plus, Settings, Trash2, Play, Pause, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface VoiceAgent {
  id: number;
  name: string;
  restaurantId: number;
  synthflowAgentId?: string;
  phoneNumberId?: number;
  greeting: string;
  instructions: string;
  isActive: boolean;
  callsPerMonth: number;
  maxCallsPerMonth: number;
  agentConfig: {
    voice?: string;
    language?: string;
  };
}

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string;
  status: string;
  monthlyFee: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface VoiceCredits {
  totalMinutes: number;
  usedMinutes: number;
  monthlyMinutes: number;
  additionalMinutes: number;
  remainingMinutes: number;
  costPerMinute: string;
}

interface CallLog {
  id: number;
  callerPhone: string;
  callDirection: string;
  callStatus: string;
  duration: number;
  cost: string;
  startTime: string;
  transcription?: string;
  bookingCreated?: boolean;
}

export default function VoiceAgents() {
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const tenantId = restaurant?.tenantId;
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isPurchasePhoneOpen, setIsPurchasePhoneOpen] = useState(false);
  const [isPurchaseMinutesOpen, setIsPurchaseMinutesOpen] = useState(false);

  if (!tenantId) {
    return <div>Loading...</div>;
  }

  // Fetch data
  const { data: agents = [], isLoading: agentsLoading } = useQuery<VoiceAgent[]>({
    queryKey: [`/api/tenants/${tenantId}/voice-agents`]
  });

  const { data: phoneNumbers = [], isLoading: phonesLoading } = useQuery<PhoneNumber[]>({
    queryKey: [`/api/tenants/${tenantId}/phone-numbers`]
  });

  const { data: credits, isLoading: creditsLoading } = useQuery<VoiceCredits>({
    queryKey: [`/api/tenants/${tenantId}/voice-credits`]
  });

  const { data: callLogs = [] } = useQuery<CallLog[]>({
    queryKey: [`/api/tenants/${tenantId}/voice-call-logs`],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: restaurants = [] } = useQuery<any[]>({
    queryKey: ['/api/user/restaurants']
  });

  // Mutations
  const createAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/voice-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/voice-agents`] });
      setIsCreateAgentOpen(false);
      toast({
        title: 'Success',
        description: 'Voice agent created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create voice agent',
        variant: 'destructive'
      });
    }
  });

  const purchasePhoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/tenants/${tenantId}/phone-numbers/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to purchase phone number');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/phone-numbers`] });
      setIsPurchasePhoneOpen(false);
      toast({
        title: 'Success',
        description: 'Phone number purchased successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase phone number',
        variant: 'destructive'
      });
    }
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/tenants/${tenantId}/voice-agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Failed to update agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/voice-agents`] });
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tenants/${tenantId}/voice-agents/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/voice-agents`] });
      toast({
        title: 'Success',
        description: 'Voice agent deleted successfully'
      });
    }
  });

  const releasePhoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tenants/${tenantId}/phone-numbers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to release phone number');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/phone-numbers`] });
      toast({
        title: 'Success',
        description: 'Phone number released successfully'
      });
    }
  });

  const purchaseMinutesMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const response = await fetch(`/api/tenants/${tenantId}/voice-credits/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
      });
      if (!response.ok) throw new Error('Failed to purchase minutes');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/voice-credits`] });
      setIsPurchaseMinutesOpen(false);
      toast({
        title: 'Success',
        description: 'Voice minutes purchased successfully'
      });
    }
  });

  const assignPhoneMutation = useMutation({
    mutationFn: async ({ agentId, phoneNumberId }: { agentId: number; phoneNumberId: number }) => {
      const response = await fetch(`/api/voice-agents/${agentId}/assign-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId })
      });
      if (!response.ok) throw new Error('Failed to assign phone number');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice-agents'] });
      toast({
        title: 'Success',
        description: 'Phone number assigned to agent'
      });
    }
  });

  const getPhoneNumberById = (id?: number) => {
    if (!id) return null;
    return phoneNumbers.find(p => p.id === id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (agentsLoading || phonesLoading || creditsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground">Manage AI voice agents for phone reservations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPurchasePhoneOpen} onOpenChange={setIsPurchasePhoneOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Buy Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purchase Phone Number</DialogTitle>
                <DialogDescription>
                  Purchase a new phone number from Twilio for your voice agents
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                purchasePhoneMutation.mutate({
                  areaCode: formData.get('areaCode'),
                  country: formData.get('country')
                });
              }} className="space-y-4">
                <div>
                  <Label htmlFor="areaCode">Area Code (optional)</Label>
                  <Input id="areaCode" name="areaCode" placeholder="212" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select name="country" defaultValue="US">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsPurchasePhoneOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={purchasePhoneMutation.isPending}>
                    {purchasePhoneMutation.isPending ? 'Purchasing...' : 'Purchase ($3/month)'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Voice Agent</DialogTitle>
                <DialogDescription>
                  Set up a new AI voice agent for handling phone reservations
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const phoneNumberIdValue = formData.get('phoneNumberId') as string;
                createAgentMutation.mutate({
                  restaurantId: parseInt(formData.get('restaurantId') as string),
                  name: formData.get('name'),
                  greeting: formData.get('greeting'),
                  instructions: formData.get('instructions'),
                  synthflowApiKey: formData.get('synthflowApiKey'),
                  phoneNumberId: phoneNumberIdValue && phoneNumberIdValue !== 'none' ? parseInt(phoneNumberIdValue) : undefined,
                  voice: formData.get('voice'),
                  language: formData.get('language')
                });
              }} className="space-y-4">
                <div>
                  <Label htmlFor="restaurantId">Restaurant</Label>
                  <Select name="restaurantId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input id="name" name="name" required placeholder="Reception Agent" />
                </div>
                <div>
                  <Label htmlFor="synthflowApiKey">Synthflow API Key</Label>
                  <Input id="synthflowApiKey" name="synthflowApiKey" type="password" required placeholder="Your Synthflow API key" />
                </div>
                <div>
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea 
                    id="greeting" 
                    name="greeting" 
                    required 
                    placeholder="Thank you for calling [Restaurant Name]. How may I help you today?"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="instructions">Agent Instructions</Label>
                  <Textarea 
                    id="instructions" 
                    name="instructions" 
                    required 
                    placeholder="You are a professional restaurant receptionist. Help customers make reservations, answer questions about the menu and hours, and provide excellent service..."
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="voice">Voice</Label>
                    <Select name="voice" defaultValue="alloy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select name="language" defaultValue="en-US">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                        <SelectItem value="it-IT">Italian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="phoneNumberId">Phone Number (optional)</Label>
                  <Select name="phoneNumberId" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {phoneNumbers.filter(p => p.status === 'active').map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.phoneNumber} - {p.friendlyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateAgentOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAgentMutation.isPending}>
                    {createAgentMutation.isPending ? 'Creating...' : 'Create Agent'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Credits Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Minutes</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits?.remainingMinutes || 0} / {(credits?.totalMinutes || 0) + (credits?.additionalMinutes || 0)}
            </div>
            <Progress 
              value={((credits?.usedMinutes || 0) / ((credits?.totalMinutes || 1) + (credits?.additionalMinutes || 0))) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              ${credits?.costPerMinute || '0.10'} per minute
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 w-full"
              onClick={() => setIsPurchaseMinutesOpen(true)}
            >
              <DollarSign className="mr-2 h-3 w-3" />
              Buy More Minutes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.isActive).length} / {agents.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total agents configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phoneNumbers.filter(p => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${phoneNumbers.reduce((sum, p) => sum + parseFloat(p.monthlyFee), 0).toFixed(2)}/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          <TabsTrigger value="logs">Call Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No voice agents yet</h3>
                <p className="text-muted-foreground mb-4">Create your first AI voice agent to start handling phone reservations</p>
                <Button onClick={() => setIsCreateAgentOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {agents.map(agent => {
                const phone = getPhoneNumberById(agent.phoneNumberId);
                return (
                  <Card key={agent.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Bot className="h-8 w-8 text-primary" />
                          <div>
                            <CardTitle>{agent.name}</CardTitle>
                            <CardDescription>
                              {restaurants.find(r => r.id === agent.restaurantId)?.name || 'Unknown Restaurant'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                            {agent.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={agent.isActive}
                            onCheckedChange={(checked) => {
                              toggleAgentMutation.mutate({ id: agent.id, isActive: checked });
                            }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Phone Number:</span>
                          <span className="text-sm">
                            {phone ? phone.phoneNumber : 'Not assigned'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Calls This Month:</span>
                          <span className="text-sm">{agent.callsPerMonth} / {agent.maxCallsPerMonth}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Voice:</span>
                          <span className="text-sm">{agent.agentConfig.voice || 'alloy'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Language:</span>
                          <span className="text-sm">{agent.agentConfig.language || 'en-US'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!agent.phoneNumberId && phoneNumbers.filter(p => p.status === 'active').length > 0 && (
                          <Select
                            onValueChange={(value) => {
                              assignPhoneMutation.mutate({ 
                                agentId: agent.id, 
                                phoneNumberId: parseInt(value) 
                              });
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Assign phone number" />
                            </SelectTrigger>
                            <SelectContent>
                              {phoneNumbers.filter(p => p.status === 'active').map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.phoneNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this agent?')) {
                              deleteAgentMutation.mutate(agent.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="numbers" className="space-y-4">
          {phoneNumbers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No phone numbers</h3>
                <p className="text-muted-foreground mb-4">Purchase a phone number to connect to your voice agents</p>
                <Button onClick={() => setIsPurchasePhoneOpen(true)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Buy Your First Number
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {phoneNumbers.map(number => (
                <Card key={number.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{number.phoneNumber}</CardTitle>
                        <CardDescription>{number.friendlyName}</CardDescription>
                      </div>
                      <Badge variant={number.status === 'active' ? 'default' : 'secondary'}>
                        {number.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {number.capabilities.voice && <Badge variant="outline">Voice</Badge>}
                        {number.capabilities.sms && <Badge variant="outline">SMS</Badge>}
                        {number.capabilities.mms && <Badge variant="outline">MMS</Badge>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          ${number.monthlyFee}/month
                        </span>
                        {number.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to release this phone number?')) {
                                releasePhoneMutation.mutate(number.id);
                              }
                            }}
                          >
                            Release
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {(callLogs as CallLog[]).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No calls yet</h3>
                <p className="text-muted-foreground">Call logs will appear here once you receive calls</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(callLogs as CallLog[]).map((log: CallLog) => (
                <Card key={log.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <PhoneCall className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.callerPhone}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={log.callStatus === 'completed' ? 'default' : 'secondary'}>
                          {log.callStatus}
                        </Badge>
                        <span className="text-sm">{formatDuration(log.duration)}</span>
                        <span className="text-sm font-medium">${log.cost}</span>
                        {log.bookingCreated && (
                          <Badge variant="outline" className="bg-green-50">
                            Booking Created
                          </Badge>
                        )}
                      </div>
                    </div>
                    {log.transcription && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm">{log.transcription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Minutes Dialog */}
      <Dialog open={isPurchaseMinutesOpen} onOpenChange={setIsPurchaseMinutesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Voice Minutes</DialogTitle>
            <DialogDescription>
              Add more minutes to your voice agent credit balance
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const minutes = parseInt(formData.get('minutes') as string);
            purchaseMinutesMutation.mutate(minutes);
          }} className="space-y-4">
            <div>
              <Label htmlFor="minutes">Number of Minutes</Label>
              <Select name="minutes" defaultValue="60">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 minutes - $6.00</SelectItem>
                  <SelectItem value="120">120 minutes - $12.00</SelectItem>
                  <SelectItem value="300">300 minutes - $30.00</SelectItem>
                  <SelectItem value="600">600 minutes - $60.00</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPurchaseMinutesOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={purchaseMinutesMutation.isPending}>
                {purchaseMinutesMutation.isPending ? 'Processing...' : 'Purchase'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}