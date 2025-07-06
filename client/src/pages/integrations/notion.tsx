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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ExternalLink, Database, FileText, Calendar, CheckCircle, AlertCircle, RefreshCw, Settings, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotionIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEnabled, setIsEnabled] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    syncBookings: true,
    syncCustomers: true,
    syncMenu: false,
    syncReviews: false,
    autoSync: true,
    syncInterval: '15', // minutes
  });

  // Check if secrets exist
  const { data: secretsCheck } = useQuery({
    queryKey: [`/api/check-secrets`],
    queryFn: async () => {
      const response = await fetch('/api/check-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_keys: ['NOTION_INTEGRATION_SECRET', 'NOTION_PAGE_URL'] }),
      });
      if (!response.ok) throw new Error('Failed to check secrets');
      return response.json();
    },
  });

  // Fetch saved configuration
  const { data: config, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/notion`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled || false);
      setSyncSettings(config.configuration?.syncSettings || syncSettings);
    }
  }, [config]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/notion`,
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
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/notion`]
      });
      toast({
        title: "Configuration saved",
        description: "Notion integration settings have been updated.",
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
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/notion/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test successful",
        description: "Successfully connected to your Notion workspace.",
      });
    },
    onError: (error) => {
      toast({
        title: "Test failed",
        description: "Could not connect to Notion. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      integrationId: 'notion',
      isEnabled,
      configuration: {
        syncSettings,
      },
    });
  };

  const handleConnect = async () => {
    if (!hasNotionSecrets) {
      toast({
        title: "Missing credentials",
        description: "Please contact your administrator to set up Notion credentials.",
        variant: "destructive",
      });
      return;
    }
    setIsEnabled(true);
    handleSave();
  };

  const toggleSync = (key: keyof typeof syncSettings) => {
    if (key === 'syncInterval') return;
    setSyncSettings(prev => ({ ...prev, [key]: !prev[key] }));
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

  const hasNotionSecrets = secretsCheck?.existing?.includes('NOTION_INTEGRATION_SECRET') && 
                          secretsCheck?.existing?.includes('NOTION_PAGE_URL');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50/30 to-zinc-50/20">
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
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center text-2xl text-white">
                📝
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notion</h1>
                <p className="text-gray-600">Sync your restaurant data with Notion workspace</p>
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
        {/* API Configuration Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={hasNotionSecrets ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {hasNotionSecrets ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">
                      Notion API credentials are configured. You can connect and sync data.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        Notion API credentials not configured
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Contact your administrator to set up NOTION_INTEGRATION_SECRET and NOTION_PAGE_URL.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sync Settings */}
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  syncBookings: { label: 'Bookings', icon: Calendar, description: 'Sync all booking data to Notion database' },
                  syncCustomers: { label: 'Customers', icon: Database, description: 'Sync customer profiles and history' },
                  syncMenu: { label: 'Menu Items', icon: FileText, description: 'Sync menu and pricing information' },
                  syncReviews: { label: 'Reviews', icon: MessageSquare, description: 'Sync customer reviews and ratings' },
                  autoSync: { label: 'Auto Sync', icon: RefreshCw, description: 'Automatically sync data at regular intervals' },
                }).map(([key, { label, icon: Icon, description }]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={syncSettings[key as keyof typeof syncSettings] as boolean}
                      onCheckedChange={() => toggleSync(key as keyof typeof syncSettings)}
                    />
                  </div>
                ))}

                {syncSettings.autoSync && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="syncInterval">Sync Interval</Label>
                    <Select
                      value={syncSettings.syncInterval}
                      onValueChange={(value) => setSyncSettings(prev => ({ ...prev, syncInterval: value }))}
                    >
                      <SelectTrigger id="syncInterval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex space-x-4">
                {!isEnabled ? (
                  <Button 
                    onClick={handleConnect} 
                    className="flex-1"
                    disabled={!hasNotionSecrets}
                  >
                    Connect Notion
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
                        'Test Connection'
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
                    <h4 className="font-medium">Database Sync</h4>
                    <p className="text-sm text-gray-600">
                      Two-way sync with Notion databases
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Custom Views</h4>
                    <p className="text-sm text-gray-600">
                      Create custom views and reports
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Team Collaboration</h4>
                    <p className="text-sm text-gray-600">
                      Share data with your team
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Automated Workflows</h4>
                    <p className="text-sm text-gray-600">
                      Trigger actions based on data changes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Setup Instructions */}
        {!hasNotionSecrets && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions for Administrator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">To enable Notion integration:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Notion Integrations</a></li>
                    <li>Create a new integration</li>
                    <li>Copy the integration secret</li>
                    <li>Create or select a Notion page for restaurant data</li>
                    <li>Share the page with your integration</li>
                    <li>Set environment variables:
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        NOTION_INTEGRATION_SECRET=secret_xxx...
                        NOTION_PAGE_URL=https://notion.so/...
                      </pre>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}