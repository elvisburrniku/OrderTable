import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
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
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Marketing');
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map(int => [int.id, int.connected]))
  );

  const toggleIntegration = (integrationId: string) => {
    setIntegrationStates(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category);
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
      <div className="flex-1 bg-gray-50">
        <div className="max-w-2xl mx-auto py-8 px-6">
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
                        .map(integration => (
                          <div key={integration.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
                            <a 
                              href={`/${tenant.id}/integrations/${integration.id}`}
                              className="block p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                                    {integration.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-gray-900 hover:text-blue-600">{integration.name}</h4>
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
                                    {integrationStates[integration.id] ? (
                                      <div className="flex items-center space-x-1">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-green-600 font-medium">Connected</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-500">Disconnected</span>
                                    )}
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                              </div>
                            </a>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}