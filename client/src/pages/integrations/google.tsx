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
import { ArrowLeft, Globe, CheckCircle, MapPin, Phone, Mail, Building, Clock, Star, Shield, Zap, Users, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isActivated, setIsActivated] = useState(false);

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
      toast({
        title: "Reserve with Google Activated",
        description: "Your restaurant can now accept bookings directly from Google Search and Maps.",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 text-lg">Loading Google Integration...</p>
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
        color: 'bg-green-500',
        icon: CheckCircle,
        message: 'Reserve with Google is active. Customers can now book directly from Google Search and Maps.',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    } else if (integrationStatus === 'ready_to_activate') {
      return {
        status: 'Ready to Activate',
        color: 'bg-blue-500',
        icon: Clock,
        message: 'Your profile data is complete and ready for Google integration.',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      };
    } else {
      return {
        status: 'Pending Profile',
        color: 'bg-amber-500',
        icon: Clock,
        message: 'Complete your restaurant profile to enable Google integration.',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <motion.a 
            href={`/${tenant.id}/integrations`}
            whileHover={{ x: -4 }}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Integrations</span>
          </motion.a>

          <div className="flex items-center space-x-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl opacity-20 blur-xl"
              />
            </motion.div>
            <div>
              <motion.h1
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
              >
                Reserve with Google
              </motion.h1>
              <motion.p
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-gray-600 text-lg mt-2"
              >
                Allow guests to book directly from Google Search and Maps
              </motion.p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <Card className="shadow-xl border-0 overflow-hidden">
              <div className={`h-2 ${statusInfo.color}`} />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${statusInfo.bgColor}`}>
                      <statusInfo.icon className={`w-6 h-6 ${statusInfo.textColor}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Integration Status</h3>
                      <Badge 
                        variant="secondary" 
                        className={`${statusInfo.color} text-white border-0 font-medium`}
                      >
                        {statusInfo.status}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={isGoogleActive}
                    disabled={!validation.isComplete || activateGoogleMutation.isPending}
                    onCheckedChange={() => {
                      if (!isGoogleActive && validation.isComplete) {
                        handleActivate();
                      }
                    }}
                    className="data-[state=checked]:bg-green-500 scale-125"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className={`p-4 rounded-xl ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
                >
                  <p className={`${statusInfo.textColor} font-medium`}>
                    {statusInfo.message}
                  </p>
                </motion.div>

                {!validation.isComplete && validation.missingFields?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-1 bg-amber-100 rounded-lg">
                        <Settings className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-amber-800 font-medium text-sm">
                          Complete your profile data to activate Google integration
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Missing: {validation.missingFields.join(', ')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Data Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-xl border-0 h-full">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Profile Data Validation</h3>
                    <p className="text-sm text-gray-600 font-normal">
                      Ensure your profile data is complete and matches your Google My Business account
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Restaurant Name */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-2"
                  >
                    <Label className="flex items-center text-sm font-semibold text-gray-700">
                      <Building className="w-4 h-4 mr-2 text-gray-500" />
                      Restaurant Name
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={restaurantData.name || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                      />
                      {restaurantData.name && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Phone Number */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="space-y-2"
                  >
                    <Label className="flex items-center text-sm font-semibold text-gray-700">
                      <Phone className="w-4 h-4 mr-2 text-gray-500" />
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={restaurantData.phone || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                      />
                      {restaurantData.phone && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Address */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="space-y-2"
                  >
                    <Label className="flex items-center text-sm font-semibold text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                      Address
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={restaurantData.address || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                      />
                      {restaurantData.address && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="space-y-2"
                  >
                    <Label className="flex items-center text-sm font-semibold text-gray-700">
                      <Mail className="w-4 h-4 mr-2 text-gray-500" />
                      Email
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={restaurantData.email || ''}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                      />
                      {restaurantData.email && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Website */}
                  {restaurantData.website && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 }}
                      className="space-y-2"
                    >
                      <Label className="flex items-center text-sm font-semibold text-gray-700">
                        <Globe className="w-4 h-4 mr-2 text-gray-500" />
                        Website
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={restaurantData.website}
                          readOnly
                          className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Auto-Fill Profile Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="pt-4"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      asChild
                    >
                      <a href={`/${tenant.id}/restaurant-settings`}>
                        <Settings className="w-4 h-4 mr-2" />
                        Auto-Fill Profile
                      </a>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="lg:col-span-1"
          >
            <Card className="shadow-xl border-0 h-full">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Benefits</h3>
                    <p className="text-sm text-gray-600 font-normal">
                      What you get with Google integration
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { icon: Users, title: "Wider Reach", desc: "Reach millions of Google users" },
                    { icon: MapPin, title: "Local Discovery", desc: "Appear in local search results" },
                    { icon: Zap, title: "Instant Booking", desc: "Direct bookings from search" },
                    { icon: Shield, title: "Trusted Platform", desc: "Google's secure booking system" },
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <benefit.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{benefit.title}</h4>
                        <p className="text-gray-600 text-xs">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Separator className="my-6" />

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recommendations:</h4>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span>Website is recommended for better Google matching</span>
                    </li>
                  </ul>
                </motion.div>

                {/* Activate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="pt-6"
                >
                  <Button 
                    onClick={handleActivate}
                    disabled={!validation.isComplete || activateGoogleMutation.isPending || isGoogleActive}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg disabled:opacity-50"
                  >
                    {activateGoogleMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : isGoogleActive ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activated
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Activate Integration
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}