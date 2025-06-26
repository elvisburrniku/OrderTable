
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Copy, ExternalLink, CheckCircle, MapPin, Globe, Clock, Star, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isActivated, setIsActivated] = useState(true);
  const [businessType, setBusinessType] = useState('Restaurant');
  const [copied, setCopied] = useState(false);
  
  // Generate the booking URL dynamically based on the current domain, tenant ID, and restaurant ID
  const generateBookingUrl = () => {
    if (!restaurant?.id || !tenant?.id) return '';
    const currentDomain = window.location.origin;
    return `${currentDomain}/guest-booking/${tenant.id}/${restaurant.id}`;
  };
  
  const bookingUrl = generateBookingUrl();

  // Fetch existing configuration
  const { data: config, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Load saved configuration on mount
  useEffect(() => {
    if (config && typeof config === 'object') {
      setIsActivated((config as any).isEnabled || false);
      setBusinessType((config as any).configuration?.businessType || 'Restaurant');
    }
  }, [config]);

  // Mutation to save configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save Google integration configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`]
      });
      toast({
        title: "Google integration updated",
        description: "Your Google integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Google integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate({
      isEnabled: isActivated,
      configuration: {
        businessType,
        bookingUrl,
      }
    });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({
        title: "URL Copied",
        description: "Booking URL has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy URL to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleTestBooking = () => {
    window.open(bookingUrl, '_blank');
  };

  if (!user || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-400 to-green-500 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.08, scale: 1.1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", delay: 2 }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full blur-3xl"
        />
        
        {/* Floating Google Logo Elements */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            animate={{ 
              opacity: [0, 0.1, 0],
              scale: [0, 1, 0],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 6,
              delay: i * 1.2,
              repeat: Infinity,
              repeatDelay: 4
            }}
            className="absolute w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
          />
        ))}
      </div>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 min-h-screen shadow-lg"
        >
          <div className="p-6">
            <div className="space-y-2">
              {[
                { href: `/${tenant.id}/bookings`, label: 'Bookings', icon: Calendar },
                { href: `/${tenant.id}/tables`, label: 'Tables', icon: Users },
                { href: `/${tenant.id}/customers`, label: 'Customers', icon: Users },
                { href: `/${tenant.id}/integrations`, label: 'Integrations', active: true, icon: Globe },
                { href: `/${tenant.id}/statistics`, label: 'Statistics', icon: Star },
              ].map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    item.active 
                      ? 'text-blue-600 bg-blue-50 border-l-4 border-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <motion.a 
                href={`/${tenant.id}/integrations`}
                whileHover={{ x: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-6 group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                <span className="font-medium">Back to Integrations</span>
              </motion.a>
              
              <div className="flex items-center space-x-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg"
                >
                  <Globe className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"
                  >
                    Google Integration
                  </motion.h1>
                  <motion.p
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-gray-600 mt-2"
                  >
                    Connect with Google My Business to increase your visibility
                  </motion.p>
                </div>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"
                    >
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        Reserve with Google
                      </h3>
                      <p className="text-gray-700 mb-4 leading-relaxed">
                        Allow guests to book directly from Google Search and Maps. Your account will be matched with Google based on your business information.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-gray-700">Increased visibility</span>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-gray-700">Direct bookings</span>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-gray-700">Automated matching</span>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-gray-700">Easy integration</span>
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {isActivated && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                          >
                            <div className="flex items-start space-x-3">
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                              </motion.div>
                              <div>
                                <p className="font-semibold text-yellow-800 mb-2">Important Setup Requirements</p>
                                <p className="text-yellow-700 mb-2">
                                  Complete your business profile with accurate information that matches your Google My Business account.
                                </p>
                                <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                                  <li>Full business address</li>
                                  <li>Consistent business name</li>
                                  <li>Valid contact information</li>
                                  <li>Business hours</li>
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Configuration Card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-8"
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-6 h-6" />
                    <span>Configuration Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="space-y-4"
                  >
                    <Label htmlFor="type" className="text-lg font-medium">Business Type:</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger className="h-12 text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Restaurant">🍽️ Restaurant</SelectItem>
                        <SelectItem value="Hotel">🏨 Hotel</SelectItem>
                        <SelectItem value="Spa">🧘 Spa</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-4">
                      <motion.div
                        animate={{ rotate: isActivated ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isActivated ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <Globe className={`w-6 h-6 ${isActivated ? 'text-green-600' : 'text-gray-400'}`} />
                      </motion.div>
                      <div>
                        <Label htmlFor="activate-google" className="text-lg font-medium">
                          Activate Reserve with Google
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Enable Google integration for your restaurant
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="activate-google"
                      checked={isActivated}
                      onCheckedChange={setIsActivated}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={handleSave}
                      disabled={saveConfigMutation.isPending}
                      className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg transition-all duration-300"
                    >
                      {saveConfigMutation.isPending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <CheckCircle className="w-6 h-6 mr-2" />
                      )}
                      {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Booking URL Card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <ExternalLink className="w-6 h-6" />
                    <span>Booking URL</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="booking-url" className="text-lg font-medium">
                        Your Business Booking URL:
                      </Label>
                      <div className="flex gap-3">
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className="flex-1"
                        >
                          <Input
                            id="booking-url"
                            type="text"
                            value={bookingUrl}
                            readOnly
                            className="h-12 text-lg bg-gray-50 border-2 border-gray-200 focus:border-blue-500"
                          />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            onClick={handleCopyUrl}
                            className="h-12 px-6 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                          >
                            <AnimatePresence mode="wait">
                              {copied ? (
                                <motion.div
                                  key="check"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <span className="text-green-600">Copied!</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="copy"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="flex items-center gap-2"
                                >
                                  <Copy className="w-5 h-5" />
                                  <span>Copy</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            onClick={handleTestBooking}
                            className="h-12 px-6 border-2 border-green-200 hover:border-green-400 hover:bg-green-50"
                          >
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Test
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">How to Use This URL</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Share with customers for direct bookings</li>
                            <li>• Add to your website and social media</li>
                            <li>• Include in marketing materials</li>
                            <li>• Customers can book without creating accounts</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
