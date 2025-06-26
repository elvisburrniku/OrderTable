
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Globe, CheckCircle, MapPin, Phone, Mail, Building, Clock, Star, Shield, Zap, Users, Settings, RefreshCw, Sparkles, TrendingUp, Wifi, Lock, Award, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isActivated, setIsActivated] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Generate the booking URL dynamically
  const generateBookingUrl = () => {
    if (!restaurant?.id || !tenant?.id) return '';
    const currentDomain = window.location.origin;
    return `${currentDomain}/guest-booking/${tenant.id}/${restaurant.id}`;
  };

  const bookingUrl = generateBookingUrl();

  // Fetch Google profile data
  const { data: googleProfile, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/profile`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Load saved configuration on mount
  useEffect(() => {
    if (googleProfile && typeof googleProfile === 'object') {
      setIsActivated((googleProfile as any).isIntegrationEnabled || false);
    }
  }, [googleProfile]);

  // Activate Google integration mutation
  const activateGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to activate Google integration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/profile`]
      });
      setIsActivated(true);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);
      toast({
        title: "🎉 Reserve with Google Activated!",
        description: "Your restaurant is now live on Google Search and Maps. Customers can book directly!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate Google integration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleActivate = () => {
    activateGoogleMutation.mutate();
  };

  if (!user || !tenant || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              animate={{
                x: [0, 100, 0],
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
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
            className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-6"
          />
          <motion.p 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white text-xl font-medium"
          >
            Loading Google Integration...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const restaurantData = (googleProfile as any)?.restaurant || {};
  const validation = (googleProfile as any)?.validation || { isComplete: false, missingFields: [] };
  const integrationStatus = (googleProfile as any)?.googleIntegrationStatus || 'inactive';
  const isGoogleActive = integrationStatus === 'active' || isActivated;

  const getStatusInfo = () => {
    if (isGoogleActive) {
      return {
        status: 'Active',
        color: 'from-emerald-500 to-green-600',
        icon: CheckCircle,
        message: 'Reserve with Google is live! Customers can now book directly from Google Search and Maps.',
        bgColor: 'from-emerald-50 to-green-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
        dotColor: 'bg-emerald-500'
      };
    } else if (integrationStatus === 'ready_to_activate') {
      return {
        status: 'Ready to Launch',
        color: 'from-blue-500 to-indigo-600',
        icon: Rocket,
        message: 'Your profile is complete and ready for Google integration. Launch now!',
        bgColor: 'from-blue-50 to-indigo-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-500'
      };
    } else {
      return {
        status: 'Setup Required',
        color: 'from-amber-500 to-orange-600',
        icon: Settings,
        message: 'Complete your restaurant profile to unlock Google integration.',
        bgColor: 'from-amber-50 to-orange-50',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-200',
        dotColor: 'bg-amber-500'
      };
    }
  };

  const statusInfo = getStatusInfo();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-indigo-600/20"
        />
      </div>

      {/* Success animation overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="bg-white rounded-3xl p-12 text-center shadow-2xl"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 360, 720],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Integration Activated!</h3>
              <p className="text-gray-600">You're now live on Google Search and Maps</p>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 bg-emerald-400 rounded-full"
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos(i * 30 * Math.PI / 180) * 100,
                    y: Math.sin(i * 30 * Math.PI / 180) * 100,
                  }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto p-6 relative z-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <motion.a 
            href={`/${tenant.id}/integrations`}
            whileHover={{ x: -8, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center text-blue-300 hover:text-white mb-6 group transition-all duration-300"
          >
            <motion.div
              whileHover={{ x: -4 }}
              className="p-2 rounded-xl bg-white/10 backdrop-blur-sm mr-3 group-hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.div>
            <span className="font-medium">Back to Integrations</span>
          </motion.a>

          <div className="flex items-center space-x-8">
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden"
              >
                <Globe className="w-12 h-12 text-white relative z-10" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-3xl"
                />
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.8, 0.4]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-4 bg-gradient-to-r from-blue-400/30 to-indigo-500/30 rounded-3xl blur-xl"
              />
            </motion.div>
            
            <div>
              <motion.h1
                variants={itemVariants}
                className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent mb-2"
              >
                Reserve with Google
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="text-blue-200 text-xl max-w-2xl leading-relaxed"
              >
                Transform your restaurant's online presence and reach millions of potential customers directly through Google Search and Maps
              </motion.p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Status Card - Full Width */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-12"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden relative">
              <motion.div 
                className={`h-1 bg-gradient-to-r ${statusInfo.color}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <CardHeader className="pb-4 relative">
                <motion.div
                  animate={{ 
                    opacity: [0.1, 0.3, 0.1],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusInfo.dotColor}`}
                />
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`p-3 rounded-2xl bg-gradient-to-r ${statusInfo.bgColor} relative overflow-hidden`}
                    >
                      <statusInfo.icon className={`w-8 h-8 ${statusInfo.textColor} relative z-10`} />
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Integration Status</h3>
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                      >
                        <Badge 
                          className={`bg-gradient-to-r ${statusInfo.color} text-white border-0 font-semibold px-4 py-1 text-sm shadow-lg`}
                        >
                          {statusInfo.status}
                        </Badge>
                      </motion.div>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Switch
                      checked={isGoogleActive}
                      disabled={!validation.isComplete || activateGoogleMutation.isPending}
                      onCheckedChange={() => {
                        if (!isGoogleActive && validation.isComplete) {
                          handleActivate();
                        }
                      }}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600 scale-150"
                    />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`p-6 rounded-2xl bg-gradient-to-r ${statusInfo.bgColor} border ${statusInfo.borderColor} relative overflow-hidden`}
                >
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <p className={`${statusInfo.textColor} font-semibold text-lg relative z-10`}>
                    {statusInfo.message}
                  </p>
                </motion.div>

                {!validation.isComplete && validation.missingFields?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl relative overflow-hidden"
                  >
                    <div className="flex items-start space-x-4 relative z-10">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-2 bg-amber-100 rounded-xl"
                      >
                        <Settings className="w-6 h-6 text-amber-600" />
                      </motion.div>
                      <div>
                        <p className="text-amber-800 font-semibold text-lg mb-2">
                          Complete Your Restaurant Profile
                        </p>
                        <p className="text-amber-700 mb-3">
                          Missing required fields: {validation.missingFields.join(', ')}
                        </p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            className="border-amber-300 text-amber-700 hover:bg-amber-100"
                            asChild
                          >
                            <a href={`/${tenant.id}/restaurant-settings`}>
                              <Settings className="w-4 h-4 mr-2" />
                              Complete Profile
                            </a>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 rounded-2xl"
                    />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Data Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-8"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 h-full relative overflow-hidden">
              <motion.div
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50"
              />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl"
                  >
                    <Building className="w-8 h-8 text-blue-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Profile Validation</h3>
                    <p className="text-gray-600 font-normal text-lg">
                      Ensure your data matches Google My Business
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 relative z-10">
                <div className="space-y-8">
                  {[
                    { icon: Building, label: "Restaurant Name", value: restaurantData.name, field: "name" },
                    { icon: Phone, label: "Phone Number", value: restaurantData.phone, field: "phone" },
                    { icon: MapPin, label: "Address", value: restaurantData.address, field: "address" },
                    { icon: Mail, label: "Email", value: restaurantData.email, field: "email" },
                    { icon: Globe, label: "Website", value: restaurantData.website, field: "website" },
                  ].map((item, index) => (
                    item.value && (
                      <motion.div
                        key={item.field}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="space-y-3"
                      >
                        <Label className="flex items-center text-lg font-semibold text-gray-700">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="p-2 bg-gray-100 rounded-lg mr-3"
                          >
                            <item.icon className="w-5 h-5 text-gray-600" />
                          </motion.div>
                          {item.label}
                        </Label>
                        <div className="relative group">
                          <Input
                            type="text"
                            value={item.value}
                            readOnly
                            className="bg-gray-50 border-gray-200 text-gray-800 font-medium text-lg py-3 pl-4 pr-12 group-hover:bg-gray-100 transition-all duration-300"
                          />
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.7 + index * 0.1, type: "spring" }}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2"
                          >
                            <div className="p-1 bg-emerald-100 rounded-full">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits & Action Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-4 space-y-6"
          >
            {/* Benefits Card */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 relative overflow-hidden">
              <motion.div
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-blue-50/30 to-purple-50/50"
              />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl"
                  >
                    <Star className="w-8 h-8 text-emerald-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Key Benefits</h3>
                    <p className="text-gray-600 font-normal">
                      Why choose Google integration
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 relative z-10">
                <div className="space-y-4">
                  {[
                    { icon: Users, title: "Global Reach", desc: "Connect with millions of users worldwide", color: "from-blue-500 to-cyan-500" },
                    { icon: MapPin, title: "Local Discovery", desc: "Dominate local search results", color: "from-emerald-500 to-green-500" },
                    { icon: Zap, title: "Instant Booking", desc: "Real-time reservations from search", color: "from-purple-500 to-indigo-500" },
                    { icon: Shield, title: "Trusted Platform", desc: "Google's secure ecosystem", color: "from-orange-500 to-red-500" },
                    { icon: TrendingUp, title: "Analytics", desc: "Deep insights and performance metrics", color: "from-pink-500 to-rose-500" },
                    { icon: Award, title: "Premium Badge", desc: "Google verified restaurant status", color: "from-amber-500 to-yellow-500" },
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="flex items-start space-x-4 p-4 rounded-xl hover:bg-white/70 transition-all duration-300 cursor-pointer group"
                    >
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className={`p-2 bg-gradient-to-r ${benefit.color} rounded-xl flex-shrink-0 shadow-lg`}
                      >
                        <benefit.icon className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {benefit.title}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {benefit.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-2xl border-0 relative overflow-hidden">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"
              />
              <motion.div
                animate={{ 
                  rotate: [360, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full"
              />
              <CardContent className="p-8 relative z-10">
                <div className="text-center space-y-6">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"
                  >
                    <Rocket className="w-8 h-8" />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Ready to Launch?</h3>
                    <p className="text-blue-100 leading-relaxed">
                      Join thousands of restaurants already thriving with Google integration
                    </p>
                  </div>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={handleActivate}
                      disabled={!validation.isComplete || activateGoogleMutation.isPending || isGoogleActive}
                      className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {activateGoogleMutation.isPending ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                          Activating Magic...
                        </>
                      ) : isGoogleActive ? (
                        <>
                          <CheckCircle className="w-5 h-5 mr-3" />
                          Integration Active
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-3" />
                          Activate Integration
                        </>
                      )}
                      {!isGoogleActive && !activateGoogleMutation.isPending && (
                        <motion.div
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}
                    </Button>
                  </motion.div>

                  {validation.isComplete && !isGoogleActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="flex items-center justify-center space-x-2 text-emerald-200"
                    >
                      <Wifi className="w-4 h-4" />
                      <span className="text-sm font-medium">All systems ready</span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
