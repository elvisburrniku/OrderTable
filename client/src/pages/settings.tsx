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
  Utensils,
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
    // Basic booking settings
    enableWalkIns: true,
    enableWaitingList: true,
    autoConfirmBookings: false,
    requireDeposit: false,
    depositAmount: 0,
    allowSameDayBookings: true,
    minBookingNotice: 0,

    // Duration and timing settings
    defaultDuration: 120,
    emptySeats: 2,
    turnaroundTime: 0,
    useEndingTime: false,

    // Contact and cancellation
    contactMethod: "phone",
    allowCancellationAndChanges: true,
    cancellationNotice: "none",
    groupRequest: false,

    // Table booking preferences
    tableBooking: "recommended",

    // Data storage
    personalDataStorage: "1year",

    // Field visibility
    showCompanyNameField: { manual: false, online: false },
    showRoomNumberField: { manual: false, online: false },
    showAgreedPriceField: false,
    showPromoCodeField: { manual: false, online: false },

    // Online booking settings
    onlineBooking: {
      enabled: true,
      bookingFlow: "guest_first",
      minGuests: 1,
      maxGuests: 10,
      minNotice: 1.5,
      maxNotice: 45,
      interval: 15,
      maxBookingsPerTime: "unlimited",
      maxGuestsPerTime: "unlimited",
      maxCapacity: "unlimited",
      collectEmail: true,
      emailRequired: false,
      collectAddress: "zipcode",
      confirmNewsletter: true,
      confirmDuration: false,
      confirmUrl: "",
      privacyPolicyUrl: "",
    },

    // Manual booking (administration)
    manualBooking: {
      tableSuggestions: true,
      interval: 15,
      initialsRequired: false,
    },

    // Administration
    administration: {
      newBookingNotification: true,
    },
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
      // Invalidate all queries to ensure immediate updates across the app
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="timeZone" className="text-sm font-medium">Time Zone</Label>
                <Select
                  value={generalSettings.timeZone}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, timeZone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
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

              <div className="space-y-2">
                <Label htmlFor="dateFormat" className="text-sm font-medium">Date Format</Label>
                <Select
                  value={generalSettings.dateFormat}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, dateFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (12/25/2024)</SelectItem>
                    <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (25/12/2024)</SelectItem>
                    <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2024-12-25)</SelectItem>
                    <SelectItem value="MMM dd, yyyy">MMM DD, YYYY (Dec 25, 2024)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat" className="text-sm font-medium">Time Format</Label>
                <Select
                  value={generalSettings.timeFormat}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, timeFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (2:30 PM)</SelectItem>
                    <SelectItem value="24h">24 Hour (14:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                <Select
                  value={generalSettings.currency}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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

              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                <Select
                  value={generalSettings.language}
                  onValueChange={(value) =>
                    setGeneralSettings({ ...generalSettings, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
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

              <div className="space-y-2">
                <Label htmlFor="defaultDuration" className="text-sm font-medium">Default Booking Duration (minutes)</Label>
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
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAdvance" className="text-sm font-medium">Maximum Advance Booking Days</Label>
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
                className="max-w-xs"
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
              <span>Booking Settings</span>
            </CardTitle>
            <CardDescription>
              Configure detailed booking policies, timing, and operational preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Core Booking Configuration */}
            <div>
              <h4 className="text-lg font-medium mb-4">Bookings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="duration">Duration:</Label>
                  <Select
                    value={`${bookingSettings.defaultDuration} minutes`}
                    onValueChange={(value) => {
                      const minutes = parseInt(value.split(' ')[0]);
                      setBookingSettings({ ...bookingSettings, defaultDuration: minutes });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60 minutes">1 hour</SelectItem>
                      <SelectItem value="90 minutes">1.5 hours</SelectItem>
                      <SelectItem value="120 minutes">2 hours</SelectItem>
                      <SelectItem value="150 minutes">2.5 hours</SelectItem>
                      <SelectItem value="180 minutes">3 hours</SelectItem>
                      <SelectItem value="240 minutes">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="emptySeats">Empty seats:</Label>
                  <Select
                    value={bookingSettings.emptySeats.toString()}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, emptySeats: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="turnaroundTime">Turnaround time:</Label>
                  <Select
                    value={`${bookingSettings.turnaroundTime} min.`}
                    onValueChange={(value) => {
                      const minutes = parseInt(value.split(' ')[0]);
                      setBookingSettings({ ...bookingSettings, turnaroundTime: minutes });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 min.">0 min.</SelectItem>
                      <SelectItem value="15 min.">15 min.</SelectItem>
                      <SelectItem value="30 min.">30 min.</SelectItem>
                      <SelectItem value="45 min.">45 min.</SelectItem>
                      <SelectItem value="60 min.">60 min.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contactMethod">Contact method:</Label>
                  <Select
                    value={bookingSettings.contactMethod}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, contactMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookingSettings.useEndingTime}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, useEndingTime: checked })
                    }
                  />
                  <Label>Use ending time:</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Allow cancellation and changes:</Label>
                    <Select
                      value={bookingSettings.allowCancellationAndChanges ? "Yes" : "No"}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          allowCancellationAndChanges: value === "Yes" 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Cancellation notice:</Label>
                    <Select
                      value={bookingSettings.cancellationNotice}
                      onValueChange={(value) =>
                        setBookingSettings({ ...bookingSettings, cancellationNotice: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="2h">2 hours</SelectItem>
                        <SelectItem value="4h">4 hours</SelectItem>
                        <SelectItem value="24h">24 hours</SelectItem>
                        <SelectItem value="48h">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookingSettings.groupRequest}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ ...bookingSettings, groupRequest: checked })
                    }
                  />
                  <Label>Group Request</Label>
                </div>

                <div className="space-y-2">
                  <Label>Enable waiting list:</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={bookingSettings.enableWaitingList}
                        onCheckedChange={(checked) =>
                          setBookingSettings({ ...bookingSettings, enableWaitingList: checked })
                        }
                      />
                      <span className="text-sm">Enable</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={bookingSettings.autoWaitingList || false}
                        onCheckedChange={(checked) =>
                          setBookingSettings({ ...bookingSettings, autoWaitingList: checked })
                        }
                      />
                      <span className="text-sm">Automate the waiting list</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={bookingSettings.waitingListOnlyNoTimes || false}
                        onCheckedChange={(checked) =>
                          setBookingSettings({ ...bookingSettings, waitingListOnlyNoTimes: checked })
                        }
                      />
                      <span className="text-sm">Only use waiting list if no available times</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Table booking:</Label>
                  <Select
                    value={bookingSettings.tableBooking}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, tableBooking: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Book with tables (recommended)</SelectItem>
                      <SelectItem value="required">Book with tables (required)</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Storage of personal data:</Label>
                  <Select
                    value={bookingSettings.personalDataStorage}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, personalDataStorage: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6months">6 months</SelectItem>
                      <SelectItem value="1year">1 year</SelectItem>
                      <SelectItem value="2years">2 years</SelectItem>
                      <SelectItem value="5years">5 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Field Visibility Settings */}
                <div className="space-y-4">
                  <h5 className="font-medium">Show fields:</h5>

                  <div className="space-y-3">
                    <div>
                      <Label>Show "Company name" field:</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showCompanyNameField.manual}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showCompanyNameField: { 
                                  ...bookingSettings.showCompanyNameField, 
                                  manual: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Manual booking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showCompanyNameField.online}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showCompanyNameField: { 
                                  ...bookingSettings.showCompanyNameField, 
                                  online: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Both manual and online booking</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Show "Room no." field:</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showRoomNumberField.manual}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showRoomNumberField: { 
                                  ...bookingSettings.showRoomNumberField, 
                                  manual: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Manual booking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showRoomNumberField.online}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showRoomNumberField: { 
                                  ...bookingSettings.showRoomNumberField, 
                                  online: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Both manual and online booking</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={bookingSettings.showAgreedPriceField}
                        onCheckedChange={(checked) =>
                          setBookingSettings({ ...bookingSettings, showAgreedPriceField: checked })
                        }
                      />
                      <Label>Show Agreed Price field:</Label>
                    </div>

                    <div>
                      <Label>Show promo code field:</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showPromoCodeField.manual}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showPromoCodeField: { 
                                  ...bookingSettings.showPromoCodeField, 
                                  manual: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Manual booking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={bookingSettings.showPromoCodeField.online}
                            onCheckedChange={(checked) =>
                              setBookingSettings({ 
                                ...bookingSettings, 
                                showPromoCodeField: { 
                                  ...bookingSettings.showPromoCodeField, 
                                  online: checked 
                                }
                              })
                            }
                          />
                          <span className="text-sm">Both manual and online booking</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Online Booking Settings */}
            <div>
              <h4 className="text-lg font-medium mb-4">Online booking (on website)</h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Booking flow:</Label>
                    <Select
                      value={bookingSettings.onlineBooking.bookingFlow}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            bookingFlow: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest_first">Guest selects booking type first, then date and time</SelectItem>
                        <SelectItem value="date_first">Guest selects date and time first, then booking type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Min. guests:</Label>
                    <Select
                      value={bookingSettings.onlineBooking.minGuests.toString()}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            minGuests: parseInt(value) 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max. guests:</Label>
                    <Select
                      value={bookingSettings.onlineBooking.maxGuests.toString()}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            maxGuests: parseInt(value) 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2,4,6,8,10,12,15,20,25,30].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Min. notice:</Label>
                    <Select
                      value={`${bookingSettings.onlineBooking.minNotice} hour`}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            minNotice: parseFloat(value.split(' ')[0])
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5 hour">½ hour</SelectItem>
                        <SelectItem value="1 hour">1 hour</SelectItem>
                        <SelectItem value="1.5 hour">1½ hour</SelectItem>
                        <SelectItem value="2 hour">2 hours</SelectItem>
                        <SelectItem value="4 hour">4 hours</SelectItem>
                        <SelectItem value="8 hour">8 hours</SelectItem>
                        <SelectItem value="24 hour">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max. notice:</Label>
                    <Select
                      value={`${bookingSettings.onlineBooking.maxNotice} days`}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            maxNotice: parseInt(value.split(' ')[0])
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7 days">7 days</SelectItem>
                        <SelectItem value="14 days">14 days</SelectItem>
                        <SelectItem value="30 days">30 days</SelectItem>
                        <SelectItem value="45 days">45 days</SelectItem>
                        <SelectItem value="60 days">60 days</SelectItem>
                        <SelectItem value="90 days">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Interval:</Label>
                    <Select
                      value={`${bookingSettings.onlineBooking.interval} min.`}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            interval: parseInt(value.split(' ')[0])
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 min.">15 min.</SelectItem>
                        <SelectItem value="30 min.">30 min.</SelectItem>
                        <SelectItem value="45 min.">45 min.</SelectItem>
                        <SelectItem value="60 min.">60 min.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Max. bookings per arrival time:</Label>
                    <Select
                      value={bookingSettings.onlineBooking.maxBookingsPerTime}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            maxBookingsPerTime: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max. guests per arrival time:</Label>
                    <Select
                      value={bookingSettings.onlineBooking.maxGuestsPerTime}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            maxGuestsPerTime: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max. capacity (concurrent guests):</Label>
                    <Select
                      value={bookingSettings.onlineBooking.maxCapacity}
                      onValueChange={(value) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            maxCapacity: value 
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="150">150</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={bookingSettings.onlineBooking.collectEmail}
                      onCheckedChange={(checked) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            collectEmail: checked 
                          }
                        })
                      }
                    />
                    <Label>Collect e-mail:</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={bookingSettings.onlineBooking.emailRequired}
                      onCheckedChange={(checked) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            emailRequired: checked 
                          }
                        })
                      }
                    />
                    <Label>E-mail required:</Label>
                  </div>

                  <div>
                    <Label>Collect address:</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={bookingSettings.onlineBooking.collectAddress === "zipcode"}
                          onCheckedChange={(checked) =>
                            setBookingSettings({ 
                              ...bookingSettings, 
                              onlineBooking: { 
                                ...bookingSettings.onlineBooking, 
                                collectAddress: checked ? "zipcode" : "none" 
                              }
                            })
                          }
                        />
                        <span className="text-sm">Zip code only</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={bookingSettings.onlineBooking.collectAddress === "full"}
                          onCheckedChange={(checked) =>
                            setBookingSettings({ 
                              ...bookingSettings, 
                              onlineBooking: { 
                                ...bookingSettings.onlineBooking, 
                                collectAddress: checked ? "full" : "none" 
                              }
                            })
                          }
                        />
                        <span className="text-sm">Full address</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={bookingSettings.onlineBooking.confirmNewsletter}
                      onCheckedChange={(checked) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            confirmNewsletter: checked 
                          }
                        })
                      }
                    />
                    <Label>Confirm newsletter:</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={bookingSettings.onlineBooking.confirmDuration}
                      onCheckedChange={(checked) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            confirmDuration: checked 
                          }
                        })
                      }
                    />
                    <Label>Confirm duration:</Label>
                  </div>

                  <div>
                    <Label htmlFor="confirmUrl">Confirm URL:</Label>
                    <Input
                      id="confirmUrl"
                      type="url"
                      placeholder="https://yourrestaurant.com/booking-confirmed"
                      value={bookingSettings.onlineBooking.confirmUrl}
                      onChange={(e) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            confirmUrl: e.target.value 
                          }
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="privacyPolicyUrl">Privacy Policy URL:</Label>
                    <Input
                      id="privacyPolicyUrl"
                      type="url"
                      placeholder="https://yourrestaurant.com/privacy-policy"
                      value={bookingSettings.onlineBooking.privacyPolicyUrl}
                      onChange={(e) =>
                        setBookingSettings({ 
                          ...bookingSettings, 
                          onlineBooking: { 
                            ...bookingSettings.onlineBooking, 
                            privacyPolicyUrl: e.target.value 
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Manual Booking (Administration) */}
            <div>
              <h4 className="text-lg font-medium mb-4">Manual booking (administration)</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookingSettings.manualBooking.tableSuggestions}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ 
                        ...bookingSettings, 
                        manualBooking: { 
                          ...bookingSettings.manualBooking, 
                          tableSuggestions: checked 
                        }
                      })
                    }
                  />
                  <Label>Table suggestions:</Label>
                </div>

                <div>
                  <Label>Interval:</Label>
                  <Select
                    value={`${bookingSettings.manualBooking.interval} min.`}
                    onValueChange={(value) =>
                      setBookingSettings({ 
                        ...bookingSettings, 
                        manualBooking: { 
                          ...bookingSettings.manualBooking, 
                          interval: parseInt(value.split(' ')[0])
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15 min.">15 min.</SelectItem>
                      <SelectItem value="30 min.">30 min.</SelectItem>
                      <SelectItem value="45 min.">45 min.</SelectItem>
                      <SelectItem value="60 min.">60 min.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookingSettings.manualBooking.initialsRequired}
                    onCheckedChange={(checked) =>
                      setBookingSettings({ 
                        ...bookingSettings, 
                        manualBooking: { 
                          ...bookingSettings.manualBooking, 
                          initialsRequired: checked 
                        }
                      })
                    }
                  />
                  <Label>Initials are mandatory:</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Administration */}
            <div>
              <h4 className="text-lg font-medium mb-4">Administration</h4>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={bookingSettings.administration.newBookingNotification}
                  onCheckedChange={(checked) =>
                    setBookingSettings({ 
                      ...bookingSettings, 
                      administration: { 
                        ...bookingSettings.administration, 
                        newBookingNotification: checked 
                      }
                    })
                  }
                />
                <Label>New booking notification:</Label>
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

        {/* Kitchen & Operations Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Utensils className="h-5 w-5" />
              <span>Kitchen & Operations</span>
            </CardTitle>
            <CardDescription>
              Configure kitchen workflow, service options, and operational preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Service Options</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Table Service</Label>
                    <p className="text-sm text-gray-500">Full-service dining</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Takeout Orders</Label>
                    <p className="text-sm text-gray-500">Customer pickup orders</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delivery Service</Label>
                    <p className="text-sm text-gray-500">Home delivery options</p>
                  </div>
                  <Switch />
                </div>

                <div>
                  <Label htmlFor="deliveryRadius">Delivery Radius (miles)</Label>
                  <Input
                    id="deliveryRadius"
                    type="number"
                    min="1"
                    max="25"
                    defaultValue="5"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Kitchen Operations</h4>

                <div>
                  <Label htmlFor="avgServiceTime">Average Service Time (minutes)</Label>
                  <Select defaultValue="90">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="75">75 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="105">105 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Special Requests</Label>
                    <p className="text-sm text-gray-500">Allow dietary modifications</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label htmlFor="noShowGrace">No-Show Grace Period (minutes)</Label>
                  <Select defaultValue="15">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tableRelease">Auto Table Release (minutes)</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Payment & Financial Settings</span>
            </CardTitle>
            <CardDescription>
              Configure payment methods, policies, and financial preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Accepted Payment Methods</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Credit/Debit Cards</Label>
                    <p className="text-sm text-gray-500">Visa, Mastercard, Amex</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cash Payments</Label>
                    <p className="text-sm text-gray-500">Physical currency</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Digital Payments</Label>
                    <p className="text-sm text-gray-500">Apple Pay, Google Pay</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Deposit for Large Groups</Label>
                    <p className="text-sm text-gray-500">Security deposit requirement</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label htmlFor="groupThreshold">Large Group Threshold</Label>
                  <Select defaultValue="8">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6+ guests</SelectItem>
                      <SelectItem value="8">8+ guests</SelectItem>
                      <SelectItem value="10">10+ guests</SelectItem>
                      <SelectItem value="12">12+ guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Policies</h4>

                <div>
                  <Label>Cancellation Policy</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 hours notice</SelectItem>
                      <SelectItem value="48h">48 hours notice</SelectItem>
                      <SelectItem value="72h">72 hours notice</SelectItem>
                      <SelectItem value="1week">1 week notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Refund Policy</Label>
                  <Select defaultValue="full">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full refund</SelectItem>
                      <SelectItem value="partial">Partial refund (50%)</SelectItem>
                      <SelectItem value="credit">Store credit only</SelectItem>
                      <SelectItem value="none">No refunds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serviceFee">Service Fee (%)</Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    min="0"
                    max="25"
                    step="0.5"
                    placeholder="0"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional service charge percentage
                  </p>
                </div>

                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="15"
                    step="0.25"
                    placeholder="8.25"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Experience Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Customer Experience</span>
            </CardTitle>
            <CardDescription>
              Enhance customer satisfaction and engagement features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Loyalty & Rewards</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Loyalty Program</Label>
                    <p className="text-sm text-gray-500">Points-based rewards</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Birthday Rewards</Label>
                    <p className="text-sm text-gray-500">Special birthday offers</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Feedback Collection</Label>
                    <p className="text-sm text-gray-500">Post-meal surveys</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label>Review Platform Integration</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">Google Reviews</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">Yelp Integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <span className="text-sm">TripAdvisor</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Communication Preferences</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automated Thank You Messages</Label>
                    <p className="text-sm text-gray-500">Post-visit appreciation</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Special Event Invitations</Label>
                    <p className="text-sm text-gray-500">Private events & tastings</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Newsletter Subscriptions</Label>
                    <p className="text-sm text-gray-500">Monthly updates</p>
                  </div>
                  <Switch />
                </div>

                <div>
                  <Label htmlFor="avgResponseTime">Average Response Time</Label>
                  <Select defaultValue="2h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30m">30 minutes</SelectItem>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="2h">2 hours</SelectItem>
                      <SelectItem value="4h">4 hours</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing & Promotions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Marketing & Promotions</span>
            </CardTitle>
            <CardDescription>
              Configure promotional campaigns and marketing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Promotional Features</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Happy Hour Specials</Label>
                    <p className="text-sm text-gray-500">Time-based discounts</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Early Bird Discounts</Label>
                    <p className="text-sm text-gray-500">Morning reservations</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Group Discounts</Label>
                    <p className="text-sm text-gray-500">Large party savings</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Seasonal Promotions</Label>
                    <p className="text-sm text-gray-500">Holiday specials</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label htmlFor="promoCode">Default Promo Code</Label>
                  <Input
                    id="promoCode"
                    placeholder="WELCOME10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Social Media Integration</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Instagram Integration</Label>
                    <p className="text-sm text-gray-500">Photo sharing</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Facebook Check-ins</Label>
                    <p className="text-sm text-gray-500">Location tagging</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Twitter Updates</Label>
                    <p className="text-sm text-gray-500">Daily specials</p>
                  </div>
                  <Switch />
                </div>

                <div>
                  <Label htmlFor="hashtag">Restaurant Hashtag</Label>
                  <Input
                    id="hashtag"
                    placeholder="#YourRestaurant"
                  />
                </div>

                <div>
                  <Label htmlFor="socialHandle">Social Media Handle</Label>
                  <Input
                    id="socialHandle"
                    placeholder="@yourrestaurant"
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