import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Phone, Bot, Settings, Languages, MessageCircle, Play, Pause, PhoneCall, Clock, DollarSign, User, Calendar, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface VoiceAgentConfig {
  id: number;
  restaurantId: number;
  isActive: boolean;
  language: string;
  customInstructions?: string;
  callsPerMonth: number;
  maxCallsPerMonth: number;
  phoneNumberId?: number;
}

interface SystemVoiceAgent {
  id: number;
  name: string;
  defaultGreeting: string;
  defaultInstructions: string;
  supportedLanguages: string[];
  isActive: boolean;
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

interface VoiceCallLog {
  id: number;
  callerPhone: string;
  callDirection: string;
  callStatus: string;
  duration: number;
  cost: string;
  startTime: string;
  transcription?: string;
  bookingCreated?: boolean;
  bookingDetails?: any;
  agentResponse?: any;
}

const voiceAgentSchema = z.object({
  isActive: z.boolean(),
  language: z.string().min(1, "Please select a language"),
  customInstructions: z.string().optional(),
});

type VoiceAgentFormData = z.infer<typeof voiceAgentSchema>;

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
];

export default function VoiceAgents() {
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;
  const [showSettings, setShowSettings] = useState(false);

  const form = useForm<VoiceAgentFormData>({
    resolver: zodResolver(voiceAgentSchema),
    defaultValues: {
      isActive: false,
      language: 'en',
      customInstructions: '',
    },
  });

  if (!tenantId || !restaurantId) {
    return <div>Loading...</div>;
  }

  // Fetch system voice agent configuration (admin managed)
  const { data: systemAgent, isLoading: systemLoading } = useQuery<SystemVoiceAgent>({
    queryKey: ['/api/system-voice-agent']
  });

  // Fetch restaurant-specific voice agent configuration
  const { data: agentConfig, isLoading: configLoading } = useQuery<VoiceAgentConfig>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-config`],
    onSuccess: (data) => {
      if (data) {
        form.reset({
          isActive: data.isActive,
          language: data.language,
          customInstructions: data.customInstructions || '',
        });
      }
    }
  });

  // Fetch available phone numbers
  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: [`/api/tenants/${tenantId}/phone-numbers`]
  });

  // Fetch voice call logs
  const { data: callLogs = [] } = useQuery<VoiceCallLog[]>({
    queryKey: [`/api/tenants/${tenantId}/voice-call-logs`],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update voice agent configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (data: VoiceAgentFormData) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update voice agent configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/tenants/${tenantId}/restaurants/${restaurantId}/voice-agent-config`]);
      toast({
        title: 'Success',
        description: 'Voice agent configuration updated successfully',
      });
      setShowSettings(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update voice agent configuration',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: VoiceAgentFormData) => {
    updateConfigMutation.mutate(data);
  };

  const handleToggleAgent = async (isActive: boolean) => {
    const currentData = form.getValues();
    updateConfigMutation.mutate({
      ...currentData,
      isActive
    });
  };

  if (systemLoading || configLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading voice agent...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!systemAgent || !systemAgent.isActive) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Voice Agent Not Available</h3>
            <p className="text-muted-foreground">
              The voice agent system is currently not available. Please contact support for assistance.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">AI Voice Agent</h1>
        <p className="text-muted-foreground">
          Activate and customize the AI voice agent for automated phone reservations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Main Voice Agent Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>{systemAgent.name}</CardTitle>
                  <CardDescription>AI-powered reservation assistant</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={agentConfig?.isActive ? "default" : "secondary"}>
                  {agentConfig?.isActive ? "Active" : "Inactive"}
                </Badge>
                <Switch
                  checked={agentConfig?.isActive || false}
                  onCheckedChange={handleToggleAgent}
                  disabled={updateConfigMutation.isLoading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Default Greeting</h4>
                <p className="text-sm bg-muted p-3 rounded-md">{systemAgent.defaultGreeting}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Base Instructions</h4>
                <p className="text-sm bg-muted p-3 rounded-md">{systemAgent.defaultInstructions}</p>
              </div>

              {agentConfig?.customInstructions && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Your Custom Instructions</h4>
                  <p className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20">
                    {agentConfig.customInstructions}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Language: <span className="font-medium">
                        {languageOptions.find(lang => lang.value === agentConfig?.language)?.label || 'English'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Calls: <span className="font-medium">{agentConfig?.callsPerMonth || 0}</span> this month
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Numbers */}
        {phoneNumbers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Numbers
              </CardTitle>
              <CardDescription>
                Phone numbers available for the voice agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phoneNumbers.map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{phone.phoneNumber}</p>
                      <p className="text-sm text-muted-foreground">{phone.friendlyName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{phone.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">${phone.monthlyFee}/month</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Call Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Recent Call Logs
            </CardTitle>
            <CardDescription>
              Recent voice agent call activity and booking attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {callLogs.length === 0 ? (
              <div className="text-center py-8">
                <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Call Logs Yet</h3>
                <p className="text-muted-foreground">
                  Once customers start calling, their interactions with the AI voice agent will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {callLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          log.callStatus === 'completed' ? 'bg-green-100 text-green-600' :
                          log.callStatus === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          <PhoneCall className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{log.callerPhone}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(log.startTime).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.startTime).toLocaleTimeString()}
                            </span>
                            {log.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.round(log.duration / 60)}m {log.duration % 60}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={
                          log.callStatus === 'completed' ? 'default' :
                          log.callStatus === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {log.callStatus}
                        </Badge>
                        {log.cost && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${parseFloat(log.cost).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {log.bookingDetails && (log.bookingDetails.date || log.bookingDetails.customerName) && (
                      <div className={`mb-3 p-3 rounded-md border ${
                        log.bookingDetails.action === 'cancelled' ? 'bg-red-50 border-red-200' :
                        log.bookingDetails.inquiryType === 'availability' ? 'bg-blue-50 border-blue-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className={`flex items-center gap-2 ${
                          log.bookingDetails.action === 'cancelled' ? 'text-red-700' :
                          log.bookingDetails.inquiryType === 'availability' ? 'text-blue-700' :
                          'text-green-700'
                        }`}>
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {log.bookingDetails.action === 'cancelled' ? 'Booking Cancelled' :
                             log.bookingDetails.inquiryType === 'availability' ? 'Availability Inquiry' :
                             'Booking Created Successfully'}
                          </span>
                        </div>
                        <div className={`mt-2 text-sm ${
                          log.bookingDetails.action === 'cancelled' ? 'text-red-600' :
                          log.bookingDetails.inquiryType === 'availability' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {log.bookingDetails.date && <p>Date: {log.bookingDetails.date}</p>}
                          {log.bookingDetails.time && <p>Time: {log.bookingDetails.time}</p>}
                          {log.bookingDetails.guestCount && <p>Guests: {log.bookingDetails.guestCount}</p>}
                          {log.bookingDetails.customerName && <p>Customer: {log.bookingDetails.customerName}</p>}
                          {log.bookingDetails.originalTime && log.bookingDetails.newTime && (
                            <p>Changed from {log.bookingDetails.originalTime} to {log.bookingDetails.newTime}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {log.transcription && (
                      <div className="mb-3">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Call Transcription
                        </h4>
                        <div className="bg-muted p-3 rounded-md text-sm">
                          <p className="line-clamp-3">{log.transcription}</p>
                        </div>
                      </div>
                    )}

                    {log.agentResponse && (
                      <div className="mb-3">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          AI Agent Analysis
                        </h4>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm">
                          {log.agentResponse.intent && (
                            <p><span className="font-medium">Intent:</span> {log.agentResponse.intent}</p>
                          )}
                          {log.agentResponse.sentiment && (
                            <p><span className="font-medium">Sentiment:</span> {log.agentResponse.sentiment}</p>
                          )}
                          {log.agentResponse.summary && (
                            <p className="mt-1">{log.agentResponse.summary}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span className="capitalize">{log.callDirection}</span> call
                      </div>
                      {log.bookingDetails?.customerName && (
                        <span>Customer: {log.bookingDetails.customerName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Voice Agent</DialogTitle>
            <DialogDescription>
              Configure the language and add custom instructions for your restaurant
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add specific instructions for your restaurant, such as special policies, menu highlights, or reservation procedures..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateConfigMutation.isLoading}
                >
                  {updateConfigMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}