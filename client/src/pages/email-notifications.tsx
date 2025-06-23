
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Users, 
  Clock, 
  Star, 
  Settings, 
  Bell, 
  Send,
  Heart,
  MessageSquare,
  CheckCircle,
  Sparkles,
  Calendar,
  Globe
} from "lucide-react";

export default function EmailNotifications() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  const [guestSettings, setGuestSettings] = useState({
    emailConfirmation: true,
    sendBookingConfirmation: true,
    reminderHours: "24",
    sendReminder: true,
    confirmationLanguage: "english",
    satisfactionSurvey: false,
    allowRescheduling: false,
    reviewSite: "Google",
  });

  const [placeSettings, setPlaceSettings] = useState({
    sentTo: restaurant?.email || "restaurant@example.com",
    emailBooking: true,
    newBookingsOnly: false,
    satisfactionSurvey: true,
    rating: "3.0",
  });

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load email settings
  const { data: emailSettings, isLoading: isQueryLoading } = useQuery({
    queryKey: ["email-settings", restaurant?.tenantId, restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.tenantId || !restaurant?.id) return null;

      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/email-settings`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch email settings");
      }
      return response.json();
    },
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });

  // Load settings when data arrives
  useEffect(() => {
    if (emailSettings) {
      setGuestSettings(emailSettings.guestSettings);
      setPlaceSettings(emailSettings.placeSettings);
    }
    setIsLoading(false);
  }, [emailSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!restaurant?.tenantId || !restaurant?.id) {
        throw new Error("Restaurant information not available");
      }

      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/email-settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guestSettings,
            placeSettings,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save email settings");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description:
          "Email notification settings have been updated successfully.",
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("email-settings") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      queryClient.refetchQueries({
        queryKey: ["email-settings", restaurant?.tenantId, restaurant?.id],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const settingVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 20
      }
    }
  };

  if (!user || !restaurant) {
    return null;
  }

  if (isLoading || isQueryLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <Mail className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">Loading email settings...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
              opacity: [0, 0.05, 0],
              scale: [0, 1, 0],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 4,
              delay: i * 0.8,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="absolute w-6 h-6 bg-blue-100 rounded-full"
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 bg-white border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20,
                delay: 0.3 
              }}
              className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
            >
              <Mail className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-3xl font-bold text-gray-900"
              >
                Email Notifications
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-gray-600 mt-1"
              >
                Configure automated email communications for guests and staff
              </motion.p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-6 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Guest Settings Card */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Users className="w-6 h-6" />
                  </motion.div>
                  <span>Guest Communications</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Email Confirmation */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-800">
                          Booking Confirmation
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Send confirmation emails to guests
                        </p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Switch
                        checked={guestSettings.sendBookingConfirmation}
                        onCheckedChange={(checked) =>
                          setGuestSettings((prev) => ({
                            ...prev,
                            sendBookingConfirmation: checked,
                          }))
                        }
                      />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Reminder Settings */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <label className="text-sm font-medium text-gray-800">
                            Reminder Notifications
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            Automated reminders before visits
                          </p>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Switch
                          checked={guestSettings.sendReminder}
                          onCheckedChange={(checked) =>
                            setGuestSettings((prev) => ({
                              ...prev,
                              sendReminder: checked,
                            }))
                          }
                        />
                      </motion.div>
                    </div>
                    
                    <AnimatePresence>
                      {guestSettings.sendReminder && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center space-x-2 ml-8"
                        >
                          <span className="text-sm text-gray-600">Send</span>
                          <Select
                            value={guestSettings.reminderHours}
                            onValueChange={(value) =>
                              setGuestSettings((prev) => ({
                                ...prev,
                                reminderHours: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="48">48</SelectItem>
                              <SelectItem value="72">72</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-600">hours before</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Rescheduling */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-800">
                          Allow Rescheduling
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Let guests reschedule their bookings
                        </p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Switch
                        checked={guestSettings.allowRescheduling || false}
                        onCheckedChange={(checked) =>
                          setGuestSettings((prev) => ({
                            ...prev,
                            allowRescheduling: checked,
                          }))
                        }
                      />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Satisfaction Survey */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Heart className="w-5 h-5 text-red-600" />
                        <div>
                          <label className="text-sm font-medium text-gray-800">
                            Satisfaction Surveys
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            Request feedback after visits
                          </p>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Switch
                          checked={guestSettings.satisfactionSurvey}
                          onCheckedChange={(checked) =>
                            setGuestSettings((prev) => ({
                              ...prev,
                              satisfactionSurvey: checked,
                            }))
                          }
                        />
                      </motion.div>
                    </div>

                    <div className="ml-8">
                      <label className="text-sm text-gray-700 block mb-2">
                        Review Platform
                      </label>
                      <Select
                        value={guestSettings.reviewSite}
                        onValueChange={(value) =>
                          setGuestSettings((prev) => ({
                            ...prev,
                            reviewSite: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Google">
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4" />
                              <span>Google</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="TripAdvisor">TripAdvisor</SelectItem>
                          <SelectItem value="Yelp">Yelp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Restaurant Settings Card */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  >
                    <Settings className="w-6 h-6" />
                  </motion.div>
                  <span>Restaurant Notifications</span>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Bell className="w-5 h-5" />
                  </motion.div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Email Address */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300"
                >
                  <label className="text-sm font-medium text-gray-800 block mb-2">
                    Notification Email
                  </label>
                  <Input
                    value={placeSettings.sentTo}
                    onChange={(e) =>
                      setPlaceSettings((prev) => ({
                        ...prev,
                        sentTo: e.target.value,
                      }))
                    }
                    className="w-full focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    placeholder="restaurant@example.com"
                  />
                </motion.div>

                {/* Booking Notifications */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Send className="w-5 h-5 text-green-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-800">
                          Booking Notifications
                        </label>
                        <p className="text-xs text-gray-600 mt-1">
                          Get notified about new bookings
                        </p>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Switch
                        checked={placeSettings.emailBooking}
                        onCheckedChange={(checked) =>
                          setPlaceSettings((prev) => ({
                            ...prev,
                            emailBooking: checked,
                          }))
                        }
                      />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Survey Notifications */}
                <motion.div 
                  variants={settingVariants}
                  className="group p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5 text-orange-600" />
                        <div>
                          <label className="text-sm font-medium text-gray-800">
                            Survey Alerts
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            Get notified about customer feedback
                          </p>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Switch
                          checked={placeSettings.satisfactionSurvey}
                          onCheckedChange={(checked) =>
                            setPlaceSettings((prev) => ({
                              ...prev,
                              satisfactionSurvey: checked,
                            }))
                          }
                        />
                      </motion.div>
                    </div>
                    
                    <div className="ml-8 flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Alert for ratings below</span>
                      <Select
                        value={placeSettings.rating}
                        onValueChange={(value) =>
                          setPlaceSettings((prev) => ({ ...prev, rating: value }))
                        }
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3.0">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>3.0</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="3.5">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>3.5</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="4.0">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>4.0</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 flex justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              <AnimatePresence mode="wait">
                {saveSettingsMutation.isPending ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="save"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Save Settings</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
