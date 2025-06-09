import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WEBHOOK_EVENTS = [
  { value: 'booking.created', label: 'Booking New' },
  { value: 'booking.updated', label: 'Booking Updated' },
  { value: 'booking.deleted', label: 'Booking Deleted' },
  { value: 'booking.cancelled', label: 'Booking Cancelled' },
] as const;

interface Webhook {
  id: string;
  event: string;
  url: string;
}

export default function WebhooksIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  // Check if webhooks integration is enabled
  const { data: integrationConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/webhooks`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Fetch existing webhooks
  const { data: savedWebhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/webhooks`],
    enabled: !!(tenant?.id && restaurant?.id && integrationConfig?.isEnabled),
  });

  // Load saved webhooks into state
  useEffect(() => {
    if (savedWebhooks.length > 0) {
      setWebhooks(savedWebhooks.map((webhook: any) => ({
        id: webhook.id.toString(),
        event: webhook.event || '',
        url: webhook.url || ''
      })));
    }
  }, [savedWebhooks]);

  // Mutation to save webhooks
  const saveWebhooksMutation = useMutation({
    mutationFn: async (webhooksData: Webhook[]) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhooks: webhooksData }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save webhooks');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/webhooks`]
      });
      toast({
        title: "Webhooks saved",
        description: "Your webhook configuration has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save webhooks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isWebhooksEnabled = integrationConfig?.isEnabled === true;

  const addWebhook = () => {
    if (!isWebhooksEnabled) {
      toast({
        title: "Integration not enabled",
        description: "Please enable the Webhooks integration first in the Developer category.",
        variant: "destructive",
      });
      return;
    }

    const newWebhook: Webhook = {
      id: Date.now().toString(),
      event: '',
      url: ''
    };
    setWebhooks([...webhooks, newWebhook]);
  };

  const updateWebhook = (id: string, field: keyof Webhook, value: string) => {
    setWebhooks(webhooks.map(webhook => 
      webhook.id === id ? { ...webhook, [field]: value } : webhook
    ));
  };

  const removeWebhook = (id: string) => {
    setWebhooks(webhooks.filter(webhook => webhook.id !== id));
  };

  const handleSave = () => {
    if (!isWebhooksEnabled) {
      toast({
        title: "Integration not enabled",
        description: "Please enable the Webhooks integration first in the Developer category.",
        variant: "destructive",
      });
      return;
    }

    // Validate webhooks
    const validWebhooks = webhooks.filter(webhook => webhook.event && webhook.url);
    
    if (validWebhooks.length === 0) {
      toast({
        title: "No valid webhooks",
        description: "Please add at least one webhook with both event and URL filled.",
        variant: "destructive",
      });
      return;
    }

    saveWebhooksMutation.mutate(validWebhooks);
  };

  if (!user || !tenant || !restaurant) {
    return <div>Loading...</div>;
  }

  if (configLoading || webhooksLoading) {
    return <div>Loading webhook settings...</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r min-h-screen">
        <div className="p-6">
          <div className="space-y-2">
            <a href={`/${tenant.id}/bookings`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Bookings</span>
            </a>
            <a href={`/${tenant.id}/tables`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Tables</span>
            </a>
            <a href={`/${tenant.id}/customers`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Customers</span>
            </a>
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              <span className="font-medium">Integrations</span>
            </div>
            <a href={`/${tenant.id}/statistics`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Statistics</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <a 
              href={`/${tenant.id}/integrations`}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          </div>

          <Card className="mb-6">
            <CardContent className="bg-gray-50 pt-6">
              <p className="text-gray-700">
                Webhooks make it possible to send data in real time from EasyTable to external systems. When an action occurs - such as a new booking, a modification, or a cancellation - the system automatically sends data as JSON to a specified URL.
              </p>
            </CardContent>
          </Card>

          {!isWebhooksEnabled && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Webhooks integration is not enabled. Please go back to{' '}
                <a href={`/${tenant.id}/integrations`} className="text-blue-600 underline">
                  Integrations
                </a>{' '}
                and enable the Webhooks integration in the Developer category first.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhook Configuration</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    onClick={addWebhook} 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!isWebhooksEnabled}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add webhook
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saveWebhooksMutation.isPending || !isWebhooksEnabled}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveWebhooksMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {isWebhooksEnabled 
                    ? 'No webhooks configured. Click "Add webhook" to get started.'
                    : 'Enable the Webhooks integration to configure webhooks.'
                  }
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 font-medium text-gray-700 pb-2 border-b">
                    <div>Event</div>
                    <div>URL</div>
                  </div>
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="grid grid-cols-2 gap-4 items-center">
                      <Select
                        value={webhook.event}
                        onValueChange={(value) => updateWebhook(webhook.id, 'event', value)}
                        disabled={!isWebhooksEnabled}
                      >
                        <SelectTrigger className="bg-blue-50">
                          <SelectValue placeholder="Select an event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {WEBHOOK_EVENTS.map((event) => (
                            <SelectItem key={event.value} value={event.value}>
                              {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex space-x-2">
                        <Input
                          value={webhook.url}
                          onChange={(e) => updateWebhook(webhook.id, 'url', e.target.value)}
                          placeholder="https://your-endpoint.com/webhook"
                          className="bg-blue-50 flex-1"
                          disabled={!isWebhooksEnabled}
                        />
                        <Button
                          onClick={() => removeWebhook(webhook.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={!isWebhooksEnabled}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}