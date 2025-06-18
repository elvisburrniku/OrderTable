import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Clock,
  Bell,
  Palette,
  Mail,
  Save,
  Globe,
  Shield,
  CreditCard,
  MessageSquare,
  Calendar,
  Users,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [emailSettings, setEmailSettings] = useState({
    enableBookingConfirmation: true,
    enableBookingReminders: true,
    enableCancellationNotice: true,
    reminderHoursBefore: 24,
    fromEmail: "",
    fromName: "",
  });

  const [generalSettings, setGeneralSettings] = useState({
    timeZone: "America/New_York",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h",
    defaultBookingDuration: 120,
    maxAdvanceBookingDays: 30,
    currency: "USD",
    language: "en",
  });

  const [bookingSettings, setBookingSettings] = useState({
    enableWalkIns: true,
    enableWaitingList: true,
    autoConfirmBookings: false,
    requireDeposit: false,
    depositAmount: 0,
    allowSameDayBookings: true,
    minBookingNotice: 0,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    bookingReminders: true,
    cancelationAlerts: true,
    noShowAlerts: true,
  });

  // Load settings from backend
  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      if (settings.emailSettings) {
        setEmailSettings(prev => ({ ...prev, ...settings.emailSettings }));
      }
      if (settings.generalSettings) {
        setGeneralSettings(prev => ({ ...prev, ...settings.generalSettings }));
      }
      if (settings.bookingSettings) {
        setBookingSettings(prev => ({ ...prev, ...settings.bookingSettings }));
      }
      if (settings.notificationSettings) {
        setNotificationSettings(prev => ({ ...prev, ...settings.notificationSettings }));
      }
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`] 
      });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      emailSettings,
      generalSettings,
      bookingSettings,
      notificationSettings,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Restaurant Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your restaurant's operational preferences and system behavior
          </p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>General Settings</span>
            </CardTitle>
            <CardDescription>
              Configure basic system preferences including timezone, formatting, and regional settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select
                  value={generalSettings.timeZone}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, timeZone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time</SelectItem>
                    <SelectItem value="Europe/London">GMT (London)</SelectItem>
                    <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
                    <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={generalSettings.dateFormat}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, dateFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (12/25/2024)</SelectItem>
                    <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (25/12/2024)</SelectItem>
                    <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2024-12-25)</SelectItem>
                    <SelectItem value="MMM dd, yyyy">MMM DD, YYYY (Dec 25, 2024)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={generalSettings.timeFormat}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, timeFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (2:30 PM)</SelectItem>
                    <SelectItem value="24h">24 Hour (14:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={generalSettings.currency}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  value={generalSettings.language}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="defaultDuration">Default Booking Duration (minutes)</Label>
                <Input
                  id="defaultDuration"
                  type="number"
                  min="30"
                  max="480"
                  step="15"
                  value={generalSettings.defaultBookingDuration}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      defaultBookingDuration: parseInt(e.target.value) || 120,
                    })
                  }
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="maxAdvance">Maximum Advance Booking Days</Label>
              <Input
                id="maxAdvance"
                type="number"
                min="1"
                max="365"
                value={generalSettings.maxAdvanceBookingDays}
                onChange={(e) =>
                  setGeneralSettings({
                    ...generalSettings,
                    maxAdvanceBookingDays: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-sm text-gray-500 mt-1">
                How far in advance customers can make reservations
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Booking & Reservation Settings</span>
            </CardTitle>
            <CardDescription>
              Configure booking policies, requirements, and operational rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Walk-ins</Label>
                    <p className="text-sm text-gray-500">
                      Allow walk-in customers without reservations
                    </p>
                  </div>
                  <Switch
                    checked={bookingSettings.enableWalkIns}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, enableWalkIns: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Waiting List</Label>
                    <p className="text-sm text-gray-500">
                      Allow customers to join waiting list when fully booked
                    </p>
                  </div>
                  <Switch
                    checked={bookingSettings.enableWaitingList}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, enableWaitingList: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-confirm Bookings</Label>
                    <p className="text-sm text-gray-500">
                      Automatically confirm bookings without manual approval
                    </p>
                  </div>
                  <Switch
                    checked={bookingSettings.autoConfirmBookings}
                    onCheckedChange={(checked) =>
                      setBookingSettings({
                        ...bookingSettings,
                        autoConfirmBookings: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Same Day Bookings</Label>
                    <p className="text-sm text-gray-500">
                      Permit reservations for today
                    </p>
                  </div>
                  <Switch
                    checked={bookingSettings.allowSameDayBookings}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, allowSameDayBookings: checked })
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Deposit</Label>
                    <p className="text-sm text-gray-500">
                      Require deposit payment for reservations
                    </p>
                  </div>
                  <Switch
                    checked={bookingSettings.requireDeposit}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, requireDeposit: checked })
                    }
                  />
                </div>
                
                {bookingSettings.requireDeposit && (
                  <div>
                    <Label htmlFor="depositAmount">Deposit Amount ({generalSettings.currency})</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={bookingSettings.depositAmount}
                      onChange={(e) =>
                        setBookingSettings({
                          ...bookingSettings,
                          depositAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="minBookingNotice">Minimum Booking Notice (hours)</Label>
                  <Input
                    id="minBookingNotice"
                    type="number"
                    min="0"
                    max="72"
                    value={bookingSettings.minBookingNotice}
                    onChange={(e) =>
                      setBookingSettings({
                        ...bookingSettings,
                        minBookingNotice: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum time required before booking time
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Communication Settings</span>
            </CardTitle>
            <CardDescription>
              Configure email templates, sender information, and automated communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">Sender Name</Label>
                <Input
                  id="fromName"
                  placeholder="Your Restaurant Name"
                  value={emailSettings.fromName}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      fromName: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Name that appears in customer emails
                </p>
              </div>
              <div>
                <Label htmlFor="fromEmail">Sender Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@yourrestaurant.com"
                  value={emailSettings.fromEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      fromEmail: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Email address for outgoing messages
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-lg font-medium">Automated Email Types</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Booking Confirmation Emails</Label>
                      <p className="text-sm text-gray-500">
                        Send confirmation when booking is made
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.enableBookingConfirmation}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          enableBookingConfirmation: checked,
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Booking Reminder Emails</Label>
                      <p className="text-sm text-gray-500">
                        Send reminder before booking
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.enableBookingReminders}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          enableBookingReminders: checked,
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Cancellation Notice Emails</Label>
                      <p className="text-sm text-gray-500">
                        Notify when bookings are cancelled
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.enableCancellationNotice}
                      onCheckedChange={(checked) =>
                        setEmailSettings({
                          ...emailSettings,
                          enableCancellationNotice: checked,
                        })
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {emailSettings.enableBookingReminders && (
                    <div>
                      <Label htmlFor="reminderHours">Reminder Time Before Booking</Label>
                      <Select
                        value={emailSettings.reminderHoursBefore.toString()}
                        onValueChange={(value) =>
                          setEmailSettings({
                            ...emailSettings,
                            reminderHoursBefore: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour before</SelectItem>
                          <SelectItem value="2">2 hours before</SelectItem>
                          <SelectItem value="4">4 hours before</SelectItem>
                          <SelectItem value="6">6 hours before</SelectItem>
                          <SelectItem value="12">12 hours before</SelectItem>
                          <SelectItem value="24">24 hours before</SelectItem>
                          <SelectItem value="48">48 hours before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification & Alert Settings</span>
            </CardTitle>
            <CardDescription>
              Control how and when you receive notifications about restaurant activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Notification Channels</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive alerts via text message
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Browser and app notifications
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Alert Types</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Booking Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Upcoming reservation alerts
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, bookingReminders: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cancellation Alerts</Label>
                    <p className="text-sm text-gray-500">
                      When customers cancel bookings
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.cancelationAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, cancelationAlerts: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>No-Show Alerts</Label>
                    <p className="text-sm text-gray-500">
                      When customers don't arrive
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.noShowAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, noShowAlerts: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Advanced & Security Settings</span>
            </CardTitle>
            <CardDescription>
              Additional configuration options and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Data & Privacy</h4>
                
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-800 dark:text-yellow-200">Data Retention</h5>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Customer data is automatically purged after 2 years of inactivity, as per GDPR compliance requirements.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>System Timezone Display</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    All times are displayed in your selected timezone: <strong>{generalSettings.timeZone}</strong>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Integration Status</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Email Service</span>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Connected</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Payment Processing</span>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">SMS Service</span>
                    </div>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">Available</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-gray-500">
            Changes are saved automatically and take effect immediately
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            size="lg"
            className="min-w-[150px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending
              ? "Saving..."
              : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
