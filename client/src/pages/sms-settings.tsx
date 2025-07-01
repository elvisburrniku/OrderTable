import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Info, 
  MessageSquare, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  Settings,
  Phone,
  Send,
  CheckCircle,
  Globe,
  Zap,
  Star,
  Shield
} from "lucide-react";
import { SmsBalanceManager } from "@/components/sms-balance-manager";

const countryCodes = [
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "+383", flag: "🇽🇰", name: "Kosovo" },
  { code: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "+389", flag: "🇲🇰", name: "North Macedonia" },
];

export default function SmsSettings() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [smsSettings, setSmsSettings] = useState({
    confirmationEnabled: false,
    reminderEnabled: false,
    reminderHours: 2,
    countryCode: "+381",
    phoneNumber: "",
    satisfactionSurveyEnabled: false,
    surveyMessage: "Thank you for visiting us! Please share your experience:",
    surveyUrl: "",
  });

  const [testPhone, setTestPhone] = useState("");
  const [lastTestResult, setLastTestResult] = useState("");

  // Fetch SMS settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/sms-settings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Populate form with existing settings
  useEffect(() => {
    if (currentSettings) {
      setSmsSettings({
        confirmationEnabled: currentSettings.confirmationEnabled || false,
        reminderEnabled: currentSettings.reminderEnabled || false,
        reminderHours: currentSettings.reminderHours || 2,
        countryCode: currentSettings.countryCode || "+381",
        phoneNumber: currentSettings.phoneNumber || "",
        satisfactionSurveyEnabled: currentSettings.satisfactionSurveyEnabled || false,
        surveyMessage: currentSettings.surveyMessage || "Thank you for visiting us! Please share your experience:",
        surveyUrl: currentSettings.surveyUrl || "",
      });
    }
  }, [currentSettings]);

  // Fetch SMS balance
  const { data: smsBalance } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/sms-balance`],
    enabled: !!restaurant?.tenantId,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/sms-settings`, smsSettings);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SMS settings saved successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/sms-settings`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save SMS settings",
        variant: "destructive",
      });
      console.error("Error saving SMS settings:", error);
    },
  });

  // Check if SMS features should be enabled
  const smsEnabled = parseFloat(smsBalance?.balance || "0") > 0;

  // Test SMS mutation
  const testSMSMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/sms-messages/test`, {
        phoneNumber: testPhone,
        message: "Test SMS from ReadyTable: Your booking system is working perfectly!",
        type: "test"
      });
    },
    onSuccess: (data) => {
      setLastTestResult(data.note || "Test SMS sent successfully");
      toast({
        title: "Test Successful",
        description: "SMS test completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to send test SMS",
        variant: "destructive",
      });
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  const handleTestSMS = () => {
    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number for testing",
        variant: "destructive",
      });
      return;
    }
    testSMSMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="p-8 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded-md w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SMS Notifications</h1>
              <p className="text-gray-600 mt-1">Configure SMS settings for booking confirmations and reminders</p>
            </div>
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-3">
            {smsEnabled ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                SMS Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Balance Required
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Globe className="w-3 h-3 mr-1" />
              Global Coverage
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pricing Overview */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">SMS Pricing</h3>
                      <p className="text-sm text-gray-600 mt-1">Competitive rates for global messaging</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    $0.05 - $0.13 per SMS
                  </Badge>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-700">
                    📱 <strong>International coverage:</strong> Send SMS to 190+ countries with reliable delivery
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Guest Notification Settings */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-700" />
                  <CardTitle className="text-xl text-gray-900">Guest Notifications</CardTitle>
                </div>
                <p className="text-sm text-gray-600 mt-1">Configure automatic SMS notifications for your guests</p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Booking Confirmation */}
                <div className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <Label htmlFor="sms-confirmation" className="text-base font-medium text-gray-900">
                          Booking Confirmation
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">Send instant confirmation when booking is made</p>
                      </div>
                    </div>
                    <Checkbox
                      id="sms-confirmation"
                      checked={smsSettings.confirmationEnabled}
                      onCheckedChange={(checked) => 
                        setSmsSettings(prev => ({ ...prev, confirmationEnabled: !!checked }))
                      }
                      className="h-5 w-5"
                    />
                  </div>
                </div>

                {/* Booking Reminder */}
                <div className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                        <Clock className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <Label htmlFor="reminder" className="text-base font-medium text-gray-900">
                          Booking Reminder
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">Send reminder before appointment time</p>
                      </div>
                    </div>
                    <Checkbox
                      id="reminder"
                      checked={smsSettings.reminderEnabled}
                      onCheckedChange={(checked) => 
                        setSmsSettings(prev => ({ ...prev, reminderEnabled: !!checked }))
                      }
                      className="h-5 w-5"
                    />
                  </div>
                  
                  {smsSettings.reminderEnabled && (
                    <div className="flex items-center gap-3 ml-11 pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Send reminder</span>
                      <Select
                        value={smsSettings.reminderHours.toString()}
                        onValueChange={(value) => 
                          setSmsSettings(prev => ({ ...prev, reminderHours: parseInt(value) }))
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">hours before visit</span>
                    </div>
                  )}
                </div>

                {/* Restaurant Phone Configuration */}
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Restaurant Contact Number
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">Number displayed in SMS messages for guest replies</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select
                      value={smsSettings.countryCode}
                      onValueChange={(value) => 
                        setSmsSettings(prev => ({ ...prev, countryCode: value }))
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span>{country.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={smsSettings.phoneNumber}
                      onChange={(e) => 
                        setSmsSettings(prev => ({ ...prev, phoneNumber: e.target.value }))
                      }
                      placeholder="Restaurant phone number"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Satisfaction Survey Configuration */}
                <div className="p-4 rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Star className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium text-gray-900">
                            Customer Satisfaction Surveys
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">Automatically send survey links to collect customer feedback</p>
                        </div>
                        <Switch
                          checked={smsSettings.satisfactionSurveyEnabled}
                          onCheckedChange={(checked) =>
                            setSmsSettings(prev => ({ ...prev, satisfactionSurveyEnabled: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {smsSettings.satisfactionSurveyEnabled && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="surveyMessage" className="text-sm font-medium text-gray-700">
                          Survey Message
                        </Label>
                        <p className="text-xs text-gray-500 mb-2">Message sent with the survey link</p>
                        <Textarea
                          id="surveyMessage"
                          value={smsSettings.surveyMessage}
                          onChange={(e) =>
                            setSmsSettings(prev => ({ ...prev, surveyMessage: e.target.value }))
                          }
                          placeholder="Thank you for visiting us! Please share your experience:"
                          className="w-full"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="surveyUrl" className="text-sm font-medium text-gray-700">
                          Custom Survey URL (Optional)
                        </Label>
                        <p className="text-xs text-gray-500 mb-2">Leave empty to use built-in survey system</p>
                        <Input
                          id="surveyUrl"
                          value={smsSettings.surveyUrl}
                          onChange={(e) =>
                            setSmsSettings(prev => ({ ...prev, surveyUrl: e.target.value }))
                          }
                          placeholder="https://your-custom-survey.com"
                          className="w-full"
                        />
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">How it works:</p>
                            <ul className="space-y-1 text-blue-600">
                              <li>• Survey SMS sent automatically after booking completion</li>
                              <li>• Customers rate 1-5 stars and leave optional feedback</li>
                              <li>• View responses and statistics in the Surveys page</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Save Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>Settings are saved automatically and applied immediately</span>
                  </div>
                  <Button 
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 shadow-md"
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SMS Balance Management */}
            <SmsBalanceManager />

            {/* Balance Warning */}
            {parseFloat(smsBalance?.balance || "0") <= 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>SMS Balance Required:</strong> Add balance to enable SMS notifications for your restaurant.
                </AlertDescription>
              </Alert>
            )}

            {/* SMS Testing */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Send className="w-4 h-4 text-green-600" />
                  </div>
                  <CardTitle className="text-lg text-gray-900">Free SMS Testing</CardTitle>
                </div>
                <p className="text-sm text-gray-600 mt-1">Test your SMS configuration without using balance</p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Enter test phone number"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full"
                  />
                  <Button 
                    onClick={handleTestSMS}
                    disabled={testSMSMutation.isPending || !testPhone}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {testSMSMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Test...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Send Test SMS
                      </>
                    )}
                  </Button>
                </div>
                
                {lastTestResult && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Test Successful</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">{lastTestResult}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                  <strong>Note:</strong> Test SMS messages don't count against your balance and help verify your configuration.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}