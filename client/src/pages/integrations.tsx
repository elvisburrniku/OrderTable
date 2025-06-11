import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Settings, ExternalLink, Check, X, Plug } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  category: string;
  features: string[];
  price?: string;
}

const integrations: Integration[] = [
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Email marketing automation and customer experience platform',
    icon: '🎯',
    connected: false,
    category: 'Marketing',
    features: ['Email campaigns', 'Customer segmentation', 'Automated workflows'],
    price: 'Free'
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Google Business Profile and Analytics integration',
    icon: '🔍',
    connected: true,
    category: 'Analytics',
    features: ['Business listings', 'Analytics tracking', 'Maps integration'],
    price: 'Free'
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email and SMS marketing platform for restaurants',
    icon: '📧',
    connected: false,
    category: 'Marketing',
    features: ['Email marketing', 'SMS campaigns', 'Customer insights'],
    price: '$20/month'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'All-in-one marketing platform for email campaigns',
    icon: '🐵',
    connected: false,
    category: 'Marketing',
    features: ['Email templates', 'Audience management', 'Campaign analytics'],
    price: 'Free tier available'
  },
  {
    id: 'meta',
    name: 'Meta (Facebook & Instagram)',
    description: 'Social media marketing and advertising platform',
    icon: '📱',
    connected: false,
    category: 'Social Media',
    features: ['Social posting', 'Ad management', 'Audience targeting'],
    price: 'Free'
  },
  {
    id: 'michelin',
    name: 'Michelin Guide',
    description: 'Connect with the prestigious Michelin restaurant guide',
    icon: '⭐',
    connected: false,
    category: 'Reviews',
    features: ['Profile management', 'Review monitoring', 'Quality standards'],
    price: 'Premium'
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Custom webhook integrations for third-party services',
    icon: '🔗',
    connected: false,
    category: 'Developer',
    features: ['Real-time data sync', 'Custom endpoints', 'Event triggers'],
    price: 'Free'
  },
  {
    id: 'tripadvisor',
    name: 'Tripadvisor',
    description: 'Manage your restaurant presence on TripAdvisor',
    icon: '🦉',
    connected: false,
    category: 'Reviews',
    features: ['Review management', 'Photo uploads', 'Business insights'],
    price: 'Free'
  }
];

export default function Integrations() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Marketing');

  // Fetch integration configurations from database
  const { data: savedConfigurations = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Create a map of saved configurations for quick lookup
  const configMap = (savedConfigurations as any[]).reduce((acc: Record<string, any>, config: any) => {
    acc[config.integrationId] = config;
    return acc;
  }, {});

  // Merge static integrations with saved configurations
  const mergedIntegrations = integrations.map(integration => ({
    ...integration,
    connected: configMap[integration.id]?.isEnabled || false,
    configuration: configMap[integration.id]?.configuration || {}
  }));

  // Mutation to save integration configuration
  const saveConfigMutation = useMutation({
    mutationFn: async ({ integrationId, isEnabled, configuration }: { integrationId: string; isEnabled: boolean; configuration?: any }) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/${integrationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled, configuration }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save integration configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`]
      });
      toast({
        title: "Integration updated",
        description: "Your integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleIntegration = (integrationId: string) => {
    const currentState = configMap[integrationId]?.isEnabled || false;
    saveConfigMutation.mutate({
      integrationId,
      isEnabled: !currentState,
      configuration: configMap[integrationId]?.configuration || {}
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category);
  };

  if (!user || !tenant || !restaurant) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading integration settings...</div>;
  }

  const uniqueCategories = mergedIntegrations.map(int => int.category);
  const categories = uniqueCategories.filter((category, index) => uniqueCategories.indexOf(category) === index);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-6">
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Plug className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            </div>
            <p className="text-gray-600">Connect your restaurant with powerful third-party services to enhance your operations.</p>
          </div>

          <div className="space-y-4">
            {categories.map(category => (
              <Card key={category} className="overflow-hidden bg-white shadow-sm">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Plug className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <p className="text-sm text-gray-500">
                        {integrations.filter(int => int.category === category).length} integrations available
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedCategory === category ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
                
                {expandedCategory === category && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 space-y-3">
                      {integrations
                        .filter(integration => integration.category === category)
                        .map(integration => {
                          const mergedIntegration = mergedIntegrations.find(mi => mi.id === integration.id) || integration;
                          return (
                            <div key={integration.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
                              <div className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                                      {integration.icon}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <h4 className="font-medium text-gray-900">{integration.name}</h4>
                                        {integration.price && (
                                          <Badge variant="outline" className="text-xs">
                                            {integration.price}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {integration.features.slice(0, 2).map((feature, index) => (
                                          <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            {feature}
                                          </span>
                                        ))}
                                        {integration.features.length > 2 && (
                                          <span className="text-xs text-gray-500">
                                            +{integration.features.length - 2} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      {mergedIntegration.connected ? (
                                        <div className="flex items-center space-x-1">
                                          <Check className="w-4 h-4 text-green-600" />
                                          <span className="text-sm text-green-600 font-medium">Connected</span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-500">Disconnected</span>
                                      )}
                                    </div>
                                    <Switch
                                      checked={mergedIntegration.connected}
                                      onCheckedChange={() => toggleIntegration(integration.id)}
                                      disabled={saveConfigMutation.isPending}
                                    />
                                    <a 
                                      href={`/${tenant.id}/integrations/${integration.id}`}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
    </div>
  );
}