import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus } from 'lucide-react';

interface Webhook {
  id: string;
  event: string;
  url: string;
}

export default function WebhooksIntegration() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  const addWebhook = () => {
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

  if (!user || !tenant) {
    return <div>Loading...</div>;
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhook Configuration</CardTitle>
                <Button onClick={addWebhook} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No webhooks configured. Click "Add webhook" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 font-medium text-gray-700 pb-2 border-b">
                    <div>Event</div>
                    <div>URL</div>
                  </div>
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="grid grid-cols-2 gap-4 items-center">
                      <Input
                        value={webhook.event}
                        onChange={(e) => updateWebhook(webhook.id, 'event', e.target.value)}
                        placeholder="Enter event type"
                        className="bg-blue-50"
                      />
                      <div className="flex space-x-2">
                        <Input
                          value={webhook.url}
                          onChange={(e) => updateWebhook(webhook.id, 'url', e.target.value)}
                          placeholder="Enter webhook URL"
                          className="bg-blue-50 flex-1"
                        />
                        <Button
                          onClick={() => removeWebhook(webhook.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
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