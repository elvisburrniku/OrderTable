import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ExternalLink, Hash, Bell, Users, MessageSquare, CheckCircle, AlertCircle, RefreshCw, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SlackIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#general');
  const [isEnabled, setIsEnabled] = useState(false);
  const [notifications, setNotifications] = useState({
    newBookings: true,
    cancellations: true,
    modifications: true,
    prepayments: true,
    noShows: false,
    dailySummary: true,
  });

  // Check if secrets exist
  const { data: secretsCheck } = useQuery({
    queryKey: [`/api/check-secrets`],
    queryFn: async () => {
      const response = await fetch('/api/check-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_keys: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'] }),
      });
      if (!response.ok) throw new Error('Failed to check secrets');
      return response.json();
    },
  });

  // Fetch saved configuration
  const { data: config, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/slack`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled || false);
      setWebhookUrl(config.configuration?.webhookUrl || '');
      setChannel(config.configuration?.channel || '#general');
      setNotifications(config.configuration?.notifications || notifications);
    }
  }, [config]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/slack`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/slack`]
      });
      toast({
        title: "Configuration saved",
        description: "Slack integration settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/slack/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configuration: { webhookUrl, channel },
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test successful",
        description: "Successfully sent a test message to your Slack channel.",
      });
    },
    onError: (error) => {
      toast({
        title: "Test failed",
        description: "Could not send message to Slack. Please check your webhook URL.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      integrationId: 'slack',
      isEnabled,
      configuration: {
        webhookUrl,
        channel,
        notifications,
      },
    });
  };

  const handleConnect = () => {
    if (!webhookUrl) {
      toast({
        title: "Missing information",
        description: "Please enter your Slack webhook URL.",
        variant: "destructive",
      });
      return;
    }
    setIsEnabled(true);
    handleSave();
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!user || !tenant || !restaurant || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-6 h-6 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  const hasSlackSecrets = secretsCheck?.existing?.includes('SLACK_BOT_TOKEN') && 
                          secretsCheck?.existing?.includes('SLACK_CHANNEL_ID');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50/30 to-blue-50/20">
      {/* Header */}
      <motion.div 
        className="bg-white border-b"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto p-6">
          <a 
            href={`/${tenant.id}/integrations`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </a>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                💬
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Slack</h1>
                <p className="text-gray-600">Get real-time notifications in your team workspace</p>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* API Configuration Notice */}
        {hasSlackSecrets && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    Slack API credentials are configured. The system will use these for enhanced functionality.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  Get this from your Slack app's Incoming Webhooks settings
                </p>
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label htmlFor="channel">Default Channel</Label>
                <Input
                  id="channel"
                  placeholder="#general"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  The channel where notifications will be posted
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                {!isEnabled ? (
                  <Button onClick={handleConnect} className="flex-1">
                    Connect Slack
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => testMutation.mutate()}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEnabled(false);
                        handleSave();
                      }}
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Settings */}
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  newBookings: { label: 'New Bookings', icon: Bell },
                  cancellations: { label: 'Cancellations', icon: AlertCircle },
                  modifications: { label: 'Modifications', icon: Settings },
                  prepayments: { label: 'Prepayments', icon: Hash },
                  noShows: { label: 'No-Shows', icon: Users },
                  dailySummary: { label: 'Daily Summary', icon: MessageSquare },
                }).map(([key, { label, icon: Icon }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-600">
                          Receive notifications for {label.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={() => toggleNotification(key as keyof typeof notifications)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Real-time Alerts</h4>
                    <p className="text-sm text-gray-600">
                      Instant notifications for bookings and changes
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Team Coordination</h4>
                    <p className="text-sm text-gray-600">
                      Keep your staff informed and synchronized
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Custom Channels</h4>
                    <p className="text-sm text-gray-600">
                      Route notifications to specific channels
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Rich Formatting</h4>
                    <p className="text-sm text-gray-600">
                      Beautiful, informative notification messages
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Setup Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">How to get your Webhook URL:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Go to your Slack workspace</li>
                  <li>Navigate to Apps → Manage → Custom Integrations</li>
                  <li>Click on "Incoming Webhooks"</li>
                  <li>Add a new configuration for your desired channel</li>
                  <li>Copy the Webhook URL provided</li>
                </ol>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Slack Documentation
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}