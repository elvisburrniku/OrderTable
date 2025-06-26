
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
import { ArrowLeft, Globe, CheckCircle, MapPin, Phone, Mail, Building, Clock, Star, Shield, Zap, Users, Settings, RefreshCw, Sparkles, TrendingUp, Wifi, Lock, Award, Rocket, Eye, Target, Lightbulb, BarChart3, Heart, Crown } from 'lucide-react';
import { motion, AnimatePresence, useInView, useAnimation } from 'framer-motion';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isActivated, setIsActivated] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Generate the booking URL dynamically
  const generateBookingUrl = () => {
    if (!restaurant?.id || !tenant?.id) return '';
    const currentDomain = window.location.origin;
    return `${currentDomain}/guest-booking/${tenant.id}/${restaurant.id}`;
  };

  const bookingUrl = generateBookingUrl();

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      setTimeout(() => setShowSuccessAnimation(false), 4000);
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
        {/* Enhanced animated background elements */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              animate={{
                x: [0, Math.random() * 200 - 100, 0],
                y: [0, Math.random() * 200 - 100, 0],
                opacity: [0, 1, 0],
                scale: [0, Math.random() * 2 + 1, 0],
              }}
              transition={{
                duration: Math.random() * 4 + 2,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
          {/* Floating geometric shapes */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`geo-${i}`}
              className="absolute border-2 border-white/10"
              style={{
                width: Math.random() * 80 + 40,
                height: Math.random() * 80 + 40,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                borderRadius: i % 2 === 0 ? '50%' : '20%',
              }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.3, 1],
            }}
            transition={{ 
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-20 h-20 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-8 relative"
          >
            <motion.div
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-2 bg-blue-400/20 rounded-full"
            />
          </motion.div>
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white text-2xl font-medium mb-4"
          >
            Initializing Google Integration...
          </motion.p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "200px" }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mx-auto"
          />
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
        color: 'from-emerald-500 via-green-500 to-teal-600',
        icon: CheckCircle,
        message: 'Reserve with Google is live! Customers can now book directly from Google Search and Maps.',
        bgColor: 'from-emerald-50 via-green-50 to-teal-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
        shadowColor: 'shadow-emerald-500/20'
      };
    } else if (integrationStatus === 'ready_to_activate') {
      return {
        status: 'Ready to Launch',
        color: 'from-blue-500 via-indigo-600 to-purple-700',
        icon: Rocket,
        message: 'Your profile is complete and ready for Google integration. Launch now!',
        bgColor: 'from-blue-50 via-indigo-50 to-purple-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-500',
        shadowColor: 'shadow-blue-500/20'
      };
    } else {
      return {
        status: 'Setup Required',
        color: 'from-amber-500 via-orange-600 to-red-600',
        icon: Settings,
        message: 'Complete your restaurant profile to unlock Google integration.',
        bgColor: 'from-amber-50 via-orange-50 to-red-50',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-200',
        dotColor: 'bg-amber-500',
        shadowColor: 'shadow-amber-500/20'
      };
    }
  };

  const statusInfo = getStatusInfo();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:60px_60px]" />
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-transparent to-indigo-600/30"
        />
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-600/20 blur-xl"
            style={{
              width: Math.random() * 300 + 100,
              height: Math.random() * 300 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 200 - 100, 0],
              y: [0, Math.random() * 200 - 100, 0],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Mouse follower effect */}
      <motion.div
        className="fixed w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-3xl pointer-events-none z-0"
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 30 }}
      />

      {/* Enhanced success animation overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180, y: 100 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0, rotate: 180, y: -100 }}
              transition={{ type: "spring", duration: 1.2, bounce: 0.4 }}
              className="bg-white/95 backdrop-blur-sm rounded-3xl p-16 text-center shadow-2xl relative overflow-hidden"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 360, 720],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 rounded-full flex items-center justify-center relative overflow-hidden"
              >
                <CheckCircle className="w-16 h-16 text-white relative z-10" />
                <motion.div
                  animate={{ 
                    scale: [1, 2, 1],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full"
                />
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold text-gray-900 mb-4"
              >
                🎉 Integration Activated!
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-gray-600 text-lg"
              >
                You're now live on Google Search and Maps
              </motion.p>
              {/* Enhanced confetti effect */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full"
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos(i * 18 * Math.PI / 180) * 150,
                    y: Math.sin(i * 18 * Math.PI / 180) * 150,
                    rotate: [0, 360],
                  }}
                  transition={{ duration: 2, delay: i * 0.05 }}
                />
              ))}
              <motion.div
                animate={{ 
                  opacity: [0.1, 0.3, 0.1],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-3xl"
              />
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
        {/* Enhanced header */}
        <motion.div variants={itemVariants} className="mb-8">
          <motion.a 
            href={`/${tenant.id}/integrations`}
            whileHover={{ x: -10, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center text-blue-300 hover:text-white mb-8 group transition-all duration-300"
          >
            <motion.div
              whileHover={{ x: -6, rotate: -5 }}
              className="p-3 rounded-xl bg-white/10 backdrop-blur-sm mr-4 group-hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.div>
            <span className="font-semibold text-lg">Back to Integrations</span>
          </motion.a>

          <div className="flex items-center space-x-10">
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.15, 1],
                }}
                transition={{ 
                  rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden"
              >
                <Globe className="w-14 h-14 text-white relative z-10" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.8, 1],
                    opacity: [0.2, 0.6, 0.2],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-white/30 via-blue-200/40 to-transparent rounded-3xl"
                />
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.4, 0.1]
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-indigo-400/30 rounded-3xl"
                />
              </motion.div>
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-6 bg-gradient-to-r from-blue-400/40 to-indigo-500/40 rounded-3xl blur-2xl"
              />
              {/* Orbiting elements */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 bg-white/60 rounded-full"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    transformOrigin: `${60 + i * 15}px center`,
                    left: '50%',
                    top: '50%',
                    marginLeft: '-6px',
                    marginTop: '-6px',
                  }}
                />
              ))}
            </motion.div>
            
            <div className="flex-1">
              <motion.h1
                variants={itemVariants}
                className="text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent mb-4"
              >
                Reserve with Google
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="text-blue-200 text-xl max-w-3xl leading-relaxed"
              >
                Transform your restaurant's online presence and reach millions of potential customers 
                directly through Google Search and Maps with seamless booking integration
              </motion.p>
              <motion.div
                variants={itemVariants}
                className="flex items-center space-x-6 mt-6"
              >
                {[
                  { icon: Eye, label: "Global Visibility" },
                  { icon: Target, label: "Direct Booking" },
                  { icon: BarChart3, label: "Advanced Analytics" },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
                  >
                    <feature.icon className="w-4 h-4 text-blue-300" />
                    <span className="text-blue-200 text-sm font-medium">{feature.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Enhanced status card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-12"
          >
            <Card className={`bg-white/95 backdrop-blur-sm shadow-2xl border-0 overflow-hidden relative ${statusInfo.shadowColor} shadow-2xl`}>
              <motion.div 
                className={`h-2 bg-gradient-to-r ${statusInfo.color}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <CardHeader className="pb-6 relative">
                <motion.div
                  animate={{ 
                    opacity: [0.2, 0.8, 0.2],
                    scale: [1, 1.3, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className={`absolute top-6 right-6 w-4 h-4 rounded-full ${statusInfo.dotColor} shadow-lg`}
                />
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className={`p-4 rounded-2xl bg-gradient-to-r ${statusInfo.bgColor} relative overflow-hidden border ${statusInfo.borderColor}`}
                    >
                      <statusInfo.icon className={`w-10 h-10 ${statusInfo.textColor} relative z-10`} />
                      <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />
                    </motion.div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">Integration Status</h3>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                      >
                        <Badge 
                          className={`bg-gradient-to-r ${statusInfo.color} text-white border-0 font-bold px-6 py-2 text-base shadow-lg relative overflow-hidden`}
                        >
                          <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          />
                          <span className="relative z-10">{statusInfo.status}</span>
                        </Badge>
                      </motion.div>
                    </div>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
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
                    {isGoogleActive && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -inset-2 bg-emerald-400/30 rounded-full blur-sm"
                      />
                    )}
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`p-8 rounded-2xl bg-gradient-to-r ${statusInfo.bgColor} border-2 ${statusInfo.borderColor} relative overflow-hidden`}
                >
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  />
                  <p className={`${statusInfo.textColor} font-semibold text-xl relative z-10 leading-relaxed`}>
                    {statusInfo.message}
                  </p>
                </motion.div>

                {!validation.isComplete && validation.missingFields?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 p-8 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border-2 border-amber-200 rounded-2xl relative overflow-hidden"
                  >
                    <div className="flex items-start space-x-6 relative z-10">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-3 bg-amber-100 rounded-xl"
                      >
                        <Settings className="w-8 h-8 text-amber-600" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-amber-800 font-bold text-xl mb-3">
                          Complete Your Restaurant Profile
                        </p>
                        <p className="text-amber-700 mb-4 text-lg">
                          Missing required fields: <span className="font-semibold">{validation.missingFields.join(', ')}</span>
                        </p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            className="border-amber-300 text-amber-700 hover:bg-amber-100 font-semibold px-6 py-3 text-lg"
                            asChild
                          >
                            <a href={`/${tenant.id}/restaurant-settings`}>
                              <Settings className="w-5 h-5 mr-3" />
                              Complete Profile
                            </a>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-r from-amber-200/30 to-orange-200/30 rounded-2xl"
                    />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced profile data card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-8"
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 h-full relative overflow-hidden">
              <motion.div
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/50"
              />
              <CardHeader className="relative z-10 pb-6">
                <CardTitle className="flex items-center space-x-6">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    variants={floatingVariants}
                    animate="animate"
                    className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl"
                  >
                    <Building className="w-10 h-10 text-blue-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">Profile Validation</h3>
                    <p className="text-gray-600 font-normal text-xl mt-2">
                      Ensure your data matches Google My Business
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 relative z-10">
                <div className="space-y-10">
                  {[
                    { icon: Building, label: "Restaurant Name", value: restaurantData.name, field: "name", color: "from-blue-500 to-cyan-500" },
                    { icon: Phone, label: "Phone Number", value: restaurantData.phone, field: "phone", color: "from-green-500 to-emerald-500" },
                    { icon: MapPin, label: "Address", value: restaurantData.address, field: "address", color: "from-purple-500 to-indigo-500" },
                    { icon: Mail, label: "Email", value: restaurantData.email, field: "email", color: "from-orange-500 to-red-500" },
                    { icon: Globe, label: "Website", value: restaurantData.website, field: "website", color: "from-pink-500 to-rose-500" },
                  ].map((item, index) => (
                    item.value && (
                      <motion.div
                        key={item.field}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 10 }}
                        className="space-y-4 group"
                      >
                        <Label className="flex items-center text-xl font-bold text-gray-700">
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            className={`p-3 bg-gradient-to-r ${item.color} rounded-xl mr-4 shadow-lg`}
                          >
                            <item.icon className="w-6 h-6 text-white" />
                          </motion.div>
                          {item.label}
                        </Label>
                        <div className="relative group">
                          <Input
                            type="text"
                            value={item.value}
                            readOnly
                            className="bg-gray-50 border-gray-200 text-gray-800 font-semibold text-lg py-4 pl-5 pr-16 group-hover:bg-gray-100 transition-all duration-300 group-hover:shadow-lg"
                          />
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.7 + index * 0.1, type: "spring", bounce: 0.5 }}
                            className="absolute right-5 top-1/2 transform -translate-y-1/2"
                          >
                            <motion.div 
                              whileHover={{ scale: 1.2 }}
                              className="p-2 bg-emerald-100 rounded-full shadow-lg"
                            >
                              <CheckCircle className="w-6 h-6 text-emerald-600" />
                            </motion.div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced benefits & action section */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-4 space-y-8"
          >
            {/* Enhanced benefits card */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 relative overflow-hidden">
              <motion.div
                animate={{ 
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-blue-50/30 to-purple-50/50"
              />
              <CardHeader className="relative z-10 pb-6">
                <CardTitle className="flex items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 15 }}
                    variants={floatingVariants}
                    animate="animate"
                    className="p-4 bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl shadow-lg"
                  >
                    <Star className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Key Benefits</h3>
                    <p className="text-gray-600 font-normal text-lg">
                      Why choose Google integration
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 relative z-10">
                <div className="space-y-6">
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
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ scale: 1.05, x: 8, backgroundColor: "rgba(255,255,255,0.8)" }}
                      className="flex items-start space-x-5 p-5 rounded-xl hover:bg-white/70 transition-all duration-300 cursor-pointer group border border-transparent hover:border-gray-200 hover:shadow-lg"
                    >
                      <motion.div
                        whileHover={{ scale: 1.3, rotate: 15 }}
                        className={`p-3 bg-gradient-to-r ${benefit.color} rounded-xl flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                      >
                        <benefit.icon className="w-6 h-6 text-white" />
                      </motion.div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors text-lg">
                          {benefit.title}
                        </h4>
                        <p className="text-gray-600 text-base leading-relaxed mt-1">
                          {benefit.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced action card */}
            <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-2xl border-0 relative overflow-hidden">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full"
              />
              <motion.div
                animate={{ 
                  rotate: [360, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/5 rounded-full"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl"
              />
              <CardContent className="p-10 relative z-10">
                <div className="text-center space-y-8">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="mx-auto w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  >
                    <Rocket className="w-10 h-10 relative z-10" />
                    <motion.div
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.8, 0.2]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-2xl"
                    />
                  </motion.div>
                  
                  <div>
                    <motion.h3 
                      variants={floatingVariants}
                      animate="animate"
                      className="text-3xl font-bold mb-4"
                    >
                      Ready to Launch?
                    </motion.h3>
                    <p className="text-blue-100 leading-relaxed text-lg">
                      Join thousands of restaurants already thriving with Google integration and unlock your potential
                    </p>
                  </div>

                  <motion.div 
                    whileHover={{ scale: 1.05, y: -2 }} 
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Button 
                      onClick={handleActivate}
                      disabled={!validation.isComplete || activateGoogleMutation.isPending || isGoogleActive}
                      className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold py-5 text-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {activateGoogleMutation.isPending ? (
                        <>
                          <RefreshCw className="w-6 h-6 mr-4 animate-spin" />
                          Activating Magic...
                        </>
                      ) : isGoogleActive ? (
                        <>
                          <CheckCircle className="w-6 h-6 mr-4" />
                          Integration Active
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6 mr-4" />
                          Activate Integration
                        </>
                      )}
                      {!isGoogleActive && !activateGoogleMutation.isPending && (
                        <motion.div
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/30 to-transparent"
                        />
                      )}
                    </Button>
                    {!isGoogleActive && validation.isComplete && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -inset-2 bg-white/20 rounded-xl blur-sm"
                      />
                    )}
                  </motion.div>

                  {validation.isComplete && !isGoogleActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="flex items-center justify-center space-x-3 text-emerald-200"
                    >
                      <Wifi className="w-5 h-5" />
                      <span className="text-base font-semibold">All systems ready</span>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-emerald-400 rounded-full"
                      />
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
