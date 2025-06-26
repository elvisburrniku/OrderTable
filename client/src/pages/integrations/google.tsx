
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
import { ArrowLeft, AlertTriangle, Copy, ExternalLink, CheckCircle, MapPin, Globe, Clock, Star, Users, Calendar, Settings, Sparkles, Zap, Shield, Rocket, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isActivated, setIsActivated] = useState(true);
  const [businessType, setBusinessType] = useState('Restaurant');
  const [copied, setCopied] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  
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

  const features = [
    { icon: Globe, title: "Global Reach", desc: "Reach millions of customers searching on Google" },
    { icon: MapPin, title: "Local Discovery", desc: "Appear in local search results and Google Maps" },
    { icon: Clock, title: "Real-time Sync", desc: "Instant availability updates across all platforms" },
    { icon: Star, title: "Review Integration", desc: "Showcase your ratings directly in search" },
    { icon: Shield, title: "Secure Booking", desc: "Enterprise-grade security for all transactions" },
    { icon: Rocket, title: "Instant Setup", desc: "Go live in minutes with automated matching" }
  ];

  if (!user || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white text-xl font-medium"
          >
            Loading Google Integration...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0],
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{ 
              duration: 8 + Math.random() * 4,
              delay: i * 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute w-${4 + Math.floor(Math.random() * 8)} h-${4 + Math.floor(Math.random() * 8)} bg-gradient-to-r ${
              i % 3 === 0 ? 'from-blue-400 to-cyan-400' : 
              i % 3 === 1 ? 'from-purple-400 to-pink-400' : 
              'from-green-400 to-blue-400'
            } rounded-full blur-xl`}
          />
        ))}
        
        {/* Wave Animation */}
        <motion.div
          animate={{
            x: [-100, 100, -100],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-0 w-full h-64 opacity-10"
        >
          <Waves className="w-full h-full text-white" />
        </motion.div>

        {/* Sparkle Effects */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 3,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </motion.div>
        ))}
      </div>

      <div className="flex relative z-10">
        {/* Enhanced Sidebar */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 min-h-screen shadow-2xl"
        >
          <div className="p-8">
            {/* Logo Section */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", bounce: 0.6 }}
              className="mb-12 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Google Suite</h2>
              <p className="text-blue-200 text-sm">Enterprise Integration</p>
            </motion.div>

            {/* Navigation Menu */}
            <div className="space-y-3">
              {[
                { href: `/${tenant.id}/bookings`, label: 'Bookings', icon: Calendar, color: 'from-purple-500 to-pink-500' },
                { href: `/${tenant.id}/tables`, label: 'Tables', icon: Users, color: 'from-green-500 to-blue-500' },
                { href: `/${tenant.id}/customers`, label: 'Customers', icon: Users, color: 'from-orange-500 to-red-500' },
                { href: `/${tenant.id}/integrations`, label: 'Integrations', active: true, icon: Globe, color: 'from-blue-500 to-purple-500' },
                { href: `/${tenant.id}/statistics`, label: 'Statistics', icon: Star, color: 'from-yellow-500 to-orange-500' },
              ].map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, x: 10 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group overflow-hidden ${
                    item.active 
                      ? 'text-white bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${item.active ? 'bg-white/20' : 'bg-gradient-to-r ' + item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="relative">
                    <span className="font-semibold text-lg">{item.label}</span>
                    {item.active && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="h-0.5 bg-white/50 rounded-full mt-1"
                      />
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-12"
            >
              <motion.a 
                href={`/${tenant.id}/integrations`}
                whileHover={{ x: -8, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="inline-flex items-center text-blue-300 hover:text-white mb-8 group"
              >
                <motion.div
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowLeft className="w-6 h-6 mr-3" />
                </motion.div>
                <span className="text-lg font-medium">Back to Integrations</span>
              </motion.a>
              
              <div className="flex items-center space-x-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 1.2, type: "spring", bounce: 0.6 }}
                  className="relative"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Globe className="w-12 h-12 text-white" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl opacity-30 blur-xl"
                  />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
                  >
                    Google Integration
                  </motion.h1>
                  <motion.p
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-xl text-gray-300 mb-4"
                  >
                    Connect with Google My Business and reach millions of customers
                  </motion.p>
                  <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex items-center space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 font-medium">Live Integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">Instant Setup</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -10,
                    transition: { duration: 0.2 }
                  }}
                  onHoverStart={() => setHoveredFeature(index)}
                  onHoverEnd={() => setHoveredFeature(null)}
                  className="relative group"
                >
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 h-full shadow-2xl overflow-hidden">
                    <div className="relative z-10">
                      <motion.div
                        animate={{ 
                          rotate: hoveredFeature === index ? [0, 10, -10, 0] : 0,
                          scale: hoveredFeature === index ? 1.1 : 1 
                        }}
                        transition={{ duration: 0.5 }}
                        className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                      >
                        <feature.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                    
                    {/* Hover Effect Background */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: hoveredFeature === index ? 1 : 0,
                        opacity: hoveredFeature === index ? 0.1 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Configuration Section */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
            >
              {/* Settings Card */}
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center space-x-3 text-2xl">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Settings className="w-7 h-7" />
                    </motion.div>
                    <span>Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="space-y-4"
                  >
                    <Label htmlFor="type" className="text-lg font-semibold text-white">Business Type:</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger className="h-14 text-lg bg-white/10 border-white/20 text-white backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="Restaurant">🍽️ Restaurant</SelectItem>
                        <SelectItem value="Hotel">🏨 Hotel</SelectItem>
                        <SelectItem value="Spa">🧘 Spa</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20"
                  >
                    <div className="flex items-center space-x-4">
                      <motion.div
                        animate={{ 
                          rotate: isActivated ? 360 : 0,
                          scale: isActivated ? [1, 1.2, 1] : 1
                        }}
                        transition={{ duration: 0.8 }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                          isActivated ? 'bg-gradient-to-br from-green-400 to-blue-500' : 'bg-gradient-to-br from-gray-400 to-gray-600'
                        }`}
                      >
                        <Globe className="w-7 h-7 text-white" />
                      </motion.div>
                      <div>
                        <Label htmlFor="activate-google" className="text-xl font-bold text-white">
                          Reserve with Google
                        </Label>
                        <p className="text-gray-300 mt-1">
                          Enable Google integration for your restaurant
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="activate-google"
                      checked={isActivated}
                      onCheckedChange={setIsActivated}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-500 scale-125"
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={handleSave}
                      disabled={saveConfigMutation.isPending}
                      className="w-full h-16 text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl transition-all duration-300 font-bold"
                    >
                      {saveConfigMutation.isPending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-7 h-7 border-3 border-white border-t-transparent rounded-full mr-3"
                        />
                      ) : (
                        <CheckCircle className="w-7 h-7 mr-3" />
                      )}
                      {saveConfigMutation.isPending ? 'Saving Configuration...' : 'Save Configuration'}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>

              {/* URL Card */}
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                  <CardTitle className="flex items-center space-x-3 text-2xl">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ExternalLink className="w-7 h-7" />
                    </motion.div>
                    <span>Booking URL</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="booking-url" className="text-lg font-semibold text-white">
                        Your Business Booking URL:
                      </Label>
                      <div className="flex gap-3">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="flex-1"
                        >
                          <Input
                            id="booking-url"
                            type="text"
                            value={bookingUrl}
                            readOnly
                            className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm"
                          />
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline"
                            onClick={handleCopyUrl}
                            className="h-14 px-6 border-2 border-blue-400 hover:border-blue-300 hover:bg-blue-500/20 text-white backdrop-blur-sm"
                          >
                            <AnimatePresence mode="wait">
                              {copied ? (
                                <motion.div
                                  key="check"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                  <span className="text-green-400 font-bold">Copied!</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="copy"
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: 180 }}
                                  className="flex items-center gap-2"
                                >
                                  <Copy className="w-5 h-5" />
                                  <span className="font-bold">Copy</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline"
                            onClick={handleTestBooking}
                            className="h-14 px-6 border-2 border-green-400 hover:border-green-300 hover:bg-green-500/20 text-white backdrop-blur-sm"
                          >
                            <ExternalLink className="w-5 h-5 mr-2" />
                            <span className="font-bold">Test</span>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 }}
                      className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-blue-400/30 backdrop-blur-sm"
                    >
                      <div className="flex items-start space-x-4">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <Clock className="w-6 h-6 text-blue-400 mt-1" />
                        </motion.div>
                        <div>
                          <h4 className="font-bold text-white mb-3 text-lg">How to Use This URL</h4>
                          <ul className="text-gray-300 space-y-2">
                            <motion.li
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.6 }}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 bg-blue-400 rounded-full" />
                              <span>Share with customers for direct bookings</span>
                            </motion.li>
                            <motion.li
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.7 }}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 bg-purple-400 rounded-full" />
                              <span>Add to your website and social media</span>
                            </motion.li>
                            <motion.li
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.8 }}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 bg-green-400 rounded-full" />
                              <span>Include in marketing materials</span>
                            </motion.li>
                            <motion.li
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.9 }}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 bg-pink-400 rounded-full" />
                              <span>Customers can book without creating accounts</span>
                            </motion.li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Benefits Section */}
            <AnimatePresence>
              {isActivated && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 50 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -50 }}
                  transition={{ duration: 0.8 }}
                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-3xl p-8 backdrop-blur-xl"
                >
                  <div className="flex items-start space-x-6">
                    <motion.div
                      animate={{ 
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl"
                    >
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-white mb-4"
                      >
                        🚀 Important Setup Requirements
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-gray-200 mb-6 text-lg leading-relaxed"
                      >
                        Complete your business profile with accurate information that matches your Google My Business account for seamless integration.
                      </motion.p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { icon: MapPin, text: "Full business address", color: "from-blue-400 to-cyan-400" },
                          { icon: Globe, text: "Consistent business name", color: "from-purple-400 to-pink-400" },
                          { icon: ExternalLink, text: "Valid contact information", color: "from-green-400 to-blue-400" },
                          { icon: Clock, text: "Business hours", color: "from-orange-400 to-red-400" }
                        ].map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            whileHover={{ scale: 1.05, x: 10 }}
                            className="flex items-center space-x-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20"
                          >
                            <div className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center`}>
                              <item.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-white font-medium">{item.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
