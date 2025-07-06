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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ExternalLink, Star, TrendingUp, Users, MessageSquare, BarChart3, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TripAdvisorIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [listingUrl, setListingUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [replyTemplate, setReplyTemplate] = useState(`Thank you for your review! We appreciate your feedback and look forward to serving you again at ${restaurant?.name || 'our restaurant'}.`);

  // Fetch saved configuration
  const { data: config, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/tripadvisor`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled || false);
      setListingUrl(config.configuration?.listingUrl || '');
      setAutoReplyEnabled(config.configuration?.autoReplyEnabled || false);
      setReplyTemplate(config.configuration?.replyTemplate || replyTemplate);
    }
  }, [config]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/tripadvisor`,
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
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/tripadvisor`]
      });
      toast({
        title: "Configuration saved",
        description: "TripAdvisor integration settings have been updated.",
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

  const handleSave = () => {
    saveMutation.mutate({
      integrationId: 'tripadvisor',
      isEnabled,
      configuration: {
        listingUrl,
        autoReplyEnabled,
        replyTemplate,
      },
    });
  };

  const handleConnect = () => {
    if (!listingUrl) {
      toast({
        title: "Missing information",
        description: "Please enter your TripAdvisor listing URL.",
        variant: "destructive",
      });
      return;
    }
    setIsEnabled(true);
    handleSave();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20">
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
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                🦉
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TripAdvisor</h1>
                <p className="text-gray-600">Manage reviews and showcase your restaurant</p>
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
        {/* Stats Overview */}
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Rating</p>
                      <p className="text-2xl font-bold">4.5</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Reviews</p>
                      <p className="text-2xl font-bold">324</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ranking</p>
                      <p className="text-2xl font-bold">#12</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Visitors</p>
                      <p className="text-2xl font-bold">2.8K</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Listing URL */}
              <div className="space-y-2">
                <Label htmlFor="listingUrl">TripAdvisor Listing URL</Label>
                <Input
                  id="listingUrl"
                  placeholder="https://www.tripadvisor.com/Restaurant_Review-..."
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  Enter your restaurant's TripAdvisor listing URL
                </p>
              </div>

              {/* Auto Reply */}
              {isEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="autoReply">Auto-Reply to Reviews</Label>
                      <p className="text-sm text-gray-600">
                        Automatically thank guests for positive reviews
                      </p>
                    </div>
                    <Switch
                      id="autoReply"
                      checked={autoReplyEnabled}
                      onCheckedChange={setAutoReplyEnabled}
                    />
                  </div>

                  {autoReplyEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="replyTemplate">Reply Template</Label>
                      <Textarea
                        id="replyTemplate"
                        placeholder="Thank you for your review..."
                        value={replyTemplate}
                        onChange={(e) => setReplyTemplate(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4">
                {!isEnabled ? (
                  <Button onClick={handleConnect} className="flex-1">
                    Connect TripAdvisor
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} className="flex-1">
                      Save Changes
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
                    <h4 className="font-medium">Review Monitoring</h4>
                    <p className="text-sm text-gray-600">
                      Track all reviews in real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Response Management</h4>
                    <p className="text-sm text-gray-600">
                      Reply to reviews directly from dashboard
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Analytics Dashboard</h4>
                    <p className="text-sm text-gray-600">
                      Detailed insights and trends
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Booking Integration</h4>
                    <p className="text-sm text-gray-600">
                      Accept reservations from TripAdvisor
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Need help?</h3>
                  <p className="text-sm text-gray-600">
                    Learn how to make the most of your TripAdvisor listing
                  </p>
                </div>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}