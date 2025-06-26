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
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  ExternalLink, 
  Check, 
  X, 
  Plug,
  Zap,
  Globe,
  Sparkles,
  Layers,
  Shield,
  Activity,
  Smartphone,
  Mail,
  BarChart3,
  Megaphone,
  Users,
  Star,
  Lock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  category: string;
  features: string[];
  price?: string;
  premium?: boolean;
  status?: 'healthy' | 'warning' | 'error';
  lastSync?: string;
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
    price: 'Free',
    status: 'healthy'
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Google Business Profile and Analytics integration',
    icon: '🔍',
    connected: true,
    category: 'Analytics',
    features: ['Business listings', 'Analytics tracking', 'Maps integration'],
    price: 'Free',
    status: 'healthy',
    lastSync: '2 minutes ago'
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email and SMS marketing platform for restaurants',
    icon: '📧',
    connected: false,
    category: 'Marketing',
    features: ['Email marketing', 'SMS campaigns', 'Customer insights'],
    price: '$20/month',
    premium: true,
    status: 'warning'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'All-in-one marketing platform for email campaigns',
    icon: '🐵',
    connected: false,
    category: 'Marketing',
    features: ['Email templates', 'Audience management', 'Campaign analytics'],
    price: 'Free tier available',
    status: 'healthy'
  },
  {
    id: 'meta',
    name: 'Meta (Facebook & Instagram)',
    description: 'Social media marketing and advertising platform',
    icon: '📱',
    connected: false,
    category: 'Social Media',
    features: ['Social posting', 'Ad management', 'Audience targeting'],
    price: 'Free',
    status: 'healthy'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and financial services',
    icon: '💳',
    connected: true,
    category: 'Payments',
    features: ['Payment processing', 'Subscription billing', 'Financial reporting'],
    price: '2.9% + 30¢',
    status: 'healthy',
    lastSync: '5 minutes ago'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Customer communication via WhatsApp',
    icon: '💬',
    connected: false,
    category: 'Communication',
    features: ['Direct messaging', 'Booking confirmations', 'Customer support'],
    price: 'Free',
    premium: true,
    status: 'healthy'
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice communication platform',
    icon: '📞',
    connected: false,
    category: 'Communication',
    features: ['SMS notifications', 'Voice calls', 'Two-way messaging'],
    price: 'Pay per use',
    status: 'healthy'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team collaboration and notification platform',
    icon: '💬',
    connected: false,
    category: 'Communication',
    features: ['Team alerts', 'Booking notifications', 'Staff coordination'],
    price: 'Free',
    status: 'healthy'
  },
  {
    id: 'michelin',
    name: 'Michelin Guide',
    description: 'Premium restaurant listing and recognition platform',
    icon: '⭐',
    connected: false,
    category: 'Recognition',
    features: ['Guide listing', 'Star ratings', 'Premium visibility'],
    price: 'Enterprise',
    premium: true,
    status: 'healthy'
  }
];

export default function Integrations() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Marketing');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch integration configurations from database
  const { data: savedConfigurations = [], isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`],
    enabled: !!(tenant?.id && restaurant?.id && user),
    retry: 3,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Save integration configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (data: {
      integrationId: string;
      isEnabled: boolean;
      configuration: any;
    }) => {
      const response = await fetch(
        `/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save integration configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`],
      });
      toast({
        title: "Integration updated",
        description: "Your integration settings have been saved.",
      });
    },
    onError: (error) => {
      console.error('Integration update error:', error);
      toast({
        title: "Error",
        description: "Failed to update integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create a map of saved configurations for quick lookup
  const configMap = (savedConfigurations as any[]).reduce((acc: Record<string, any>, config: any) => {
    acc[config.integrationId] = config;
    return acc;
  }, {});

  // Merge static integrations with saved configurations
  const mergedIntegrations = integrations.map(integration => ({
    ...integration,
    connected: configMap[integration.id]?.isEnabled || integration.connected,
    configuration: configMap[integration.id]?.configuration || {}
  }));

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

  const uniqueCategories = mergedIntegrations.map(int => int.category);
  const categories = uniqueCategories.filter((category, index) => uniqueCategories.indexOf(category) === index);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Marketing': return Megaphone;
      case 'Analytics': return BarChart3;
      case 'Social Media': return Smartphone;
      case 'Payments': return Shield;
      case 'Communication': return Mail;
      case 'Recognition': return Star;
      default: return Layers;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const filteredIntegrations = mergedIntegrations.filter(integration =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const connectedCount = mergedIntegrations.filter(i => i.connected).length;
  const totalCount = mergedIntegrations.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Premium Header */}
      <motion.div 
        className="relative overflow-hidden bg-white/40 backdrop-blur-md border-b border-slate-200/60"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5" />
        <div className="relative z-10 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <motion.h1 
                  className="text-4xl font-bold tracking-tight flex items-center space-x-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Plug className="w-10 h-10 text-blue-600" />
                  </motion.div>
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Integrations Hub
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-slate-600 text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  Connect your restaurant with powerful third-party services to enhance operations
                </motion.p>
              </div>

              {/* Connection Status */}
              <motion.div 
                className="flex items-center space-x-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Activity className="w-5 h-5 text-green-500" />
                    </motion.div>
                    <div className="text-sm">
                      <p className="font-medium text-slate-700">{connectedCount} Connected</p>
                      <p className="text-slate-500">{totalCount} Available</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="space-y-8">
          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover More
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Categories */}
          <div className="space-y-6">
            {categories.map((category, categoryIndex) => {
              const CategoryIcon = getCategoryIcon(category);
              const categoryIntegrations = filteredIntegrations.filter(
                integration => integration.category === category
              );
              const connectedInCategory = categoryIntegrations.filter(i => i.connected).length;
              const isExpanded = expandedCategory === category;

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + categoryIndex * 0.1, duration: 0.6 }}
                >
                  <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <motion.div
                      whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardHeader 
                        className="cursor-pointer" 
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <motion.div
                              className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CategoryIcon className="w-6 h-6 text-blue-600" />
                            </motion.div>
                            <div>
                              <CardTitle className="text-xl font-semibold text-slate-800">
                                {category}
                              </CardTitle>
                              <p className="text-sm text-slate-600 mt-1">
                                {connectedInCategory} of {categoryIntegrations.length} connected
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={connectedInCategory > 0 ? "default" : "secondary"}
                              className={connectedInCategory > 0 ? "bg-green-100 text-green-800" : ""}
                            >
                              {categoryIntegrations.length} services
                            </Badge>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ChevronDown className="w-5 h-5 text-slate-500" />
                            </motion.div>
                          </div>
                        </div>
                      </CardHeader>
                    </motion.div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {categoryIntegrations.map((integration, index) => (
                                <motion.div
                                  key={integration.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1, duration: 0.4 }}
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  className="group"
                                >
                                  <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    <div className="relative z-10">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                          <motion.div 
                                            className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-xl shadow-sm"
                                            whileHover={{ rotate: 360 }}
                                            transition={{ duration: 0.6 }}
                                          >
                                            {integration.icon}
                                          </motion.div>
                                          <div>
                                            <div className="flex items-center space-x-2">
                                              <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                                {integration.name}
                                              </h4>
                                              {integration.premium && (
                                                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                                                  <Star className="w-3 h-3 mr-1" />
                                                  Premium
                                                </Badge>
                                              )}
                                            </div>
                                            {integration.price && (
                                              <Badge variant="outline" className="text-xs mt-1">
                                                {integration.price}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          {integration.connected && (
                                            <motion.div
                                              animate={{ scale: [1, 1.2, 1] }}
                                              transition={{ duration: 2, repeat: Infinity }}
                                            >
                                              <div className={`w-2 h-2 rounded-full ${
                                                integration.status === 'healthy' ? 'bg-green-500' :
                                                integration.status === 'warning' ? 'bg-yellow-500' :
                                                'bg-red-500'
                                              }`} />
                                            </motion.div>
                                          )}
                                          <Switch
                                            checked={integration.connected}
                                            onCheckedChange={() => toggleIntegration(integration.id)}
                                            disabled={saveConfigMutation.isPending}
                                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-500"
                                          />
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              asChild
                                            >
                                              <a 
                                                href={integration.id === 'google' ? 
                                                  `/${tenant.id}/integrations/google` : 
                                                  `/${tenant.id}/integrations/${integration.id}`
                                                }
                                                className="text-slate-400 hover:text-slate-600"
                                              >
                                                <Settings className="w-4 h-4" />
                                              </a>
                                            </Button>
                                          </motion.div>
                                        </div>
                                      </div>

                                      <p className="text-sm text-slate-600 mb-3">
                                        {integration.description}
                                      </p>

                                      {integration.connected && integration.lastSync && (
                                        <motion.div 
                                          className="flex items-center text-xs text-green-600 mb-3"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Last synced {integration.lastSync}
                                        </motion.div>
                                      )}

                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-700">Features:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {integration.features.slice(0, 3).map((feature, idx) => (
                                            <motion.span
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.8 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: 0.2 + idx * 0.1 }}
                                              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md"
                                            >
                                              {feature}
                                            </motion.span>
                                          ))}
                                          {integration.features.length > 3 && (
                                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                              +{integration.features.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            <Card className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Need Help?</h3>
                    <p className="text-sm text-slate-600">
                      Our integration specialists can help you connect and configure services
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Documentation
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                        <Users className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (!tenant?.id || !restaurant?.id || !user) && (
        <motion.div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-6 h-6 text-blue-600 mx-auto mb-3" />
            </motion.div>
            <p className="text-slate-600">Loading integrations...</p>
          </div>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <X className="w-6 h-6 text-red-500" />
              <h3 className="font-semibold text-slate-800">Connection Error</h3>
            </div>
            <p className="text-slate-600 mb-4">Unable to load integrations. Please check your connection and try again.</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({
                queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`]
              })}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}