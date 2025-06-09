import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Settings, ExternalLink, Check, X } from 'lucide-react';

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
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map(int => [int.id, int.connected]))
  );

  const toggleIntegration = (integrationId: string) => {
    setIntegrationStates(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
  };

  const toggleExpanded = (integrationId: string) => {
    setExpandedIntegration(prev => prev === integrationId ? null : integrationId);
  };

  if (!user || !tenant) {
    return <div>Loading...</div>;
  }

  const uniqueCategories = integrations.map(int => int.category);
  const categories = uniqueCategories.filter((category, index) => uniqueCategories.indexOf(category) === index);

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
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
            <p className="text-gray-600">Connect your restaurant with powerful third-party services</p>
          </div>

          {categories.map(category => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-1 h-6 bg-blue-500 mr-3 rounded"></span>
                {category}
              </h2>
              
              <div className="space-y-3">
                {integrations
                  .filter(integration => integration.category === category)
                  .map(integration => (
                    <Card key={integration.id} className="overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                              {integration.icon}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <p className="text-gray-600 text-sm mt-1">{integration.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {integration.price && (
                              <Badge variant="outline" className="text-xs">
                                {integration.price}
                              </Badge>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              {integrationStates[integration.id] ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <X className="w-4 h-4 text-gray-400" />
                              )}
                              <Switch
                                checked={integrationStates[integration.id]}
                                onCheckedChange={() => toggleIntegration(integration.id)}
                              />
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(integration.id)}
                            >
                              {expandedIntegration === integration.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {expandedIntegration === integration.id && (
                        <CardContent className="pt-0">
                          <Separator className="mb-4" />
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                              <ul className="space-y-1">
                                {integration.features.map((feature, index) => (
                                  <li key={index} className="flex items-center text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="flex space-x-3 pt-2">
                              <Button size="sm" variant="outline">
                                <Settings className="w-4 h-4 mr-2" />
                                Configure
                              </Button>
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Learn More
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}