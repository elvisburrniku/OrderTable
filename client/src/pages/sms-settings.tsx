import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Info, MessageSquare, Clock, CreditCard } from "lucide-react";

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
  });

  const [testPhone, setTestPhone] = useState("");
  const [lastTestResult, setLastTestResult] = useState("");

  // Fetch SMS settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/sms-settings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

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

  // Add balance mutation
  const addBalanceMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/sms-balance/add`, { amount });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SMS balance added successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/sms-balance`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add SMS balance",
        variant: "destructive",
      });
    },
  });

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

  const handleAddBalance = (amount: number) => {
    addBalanceMutation.mutate(amount);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">SMS notifications</h1>
        </div>

        <div className="space-y-6">
          {/* Pricing Info */}
          <Card>
            <CardContent className="p-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    5 to 13 cent per SMS notification
                  </span>
                  <button className="text-blue-600 text-sm hover:underline">
                    (View international SMS prices)
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SMS Confirmation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sms-confirmation">SMS confirmation:</Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sms-confirmation"
                    checked={smsSettings.confirmationEnabled}
                    onCheckedChange={(checked) => 
                      setSmsSettings(prev => ({ ...prev, confirmationEnabled: !!checked }))
                    }
                  />
                  <span className="text-sm text-gray-600">Send booking confirmation to the guest</span>
                </div>
              </div>

              {/* Reminder */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="reminder">Reminder:</Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="reminder"
                    checked={smsSettings.reminderEnabled}
                    onCheckedChange={(checked) => 
                      setSmsSettings(prev => ({ ...prev, reminderEnabled: !!checked }))
                    }
                  />
                  <span className="text-sm text-gray-600">Send reminder to the guest</span>
                  <Select
                    value={smsSettings.reminderHours.toString()}
                    onValueChange={(value) => 
                      setSmsSettings(prev => ({ ...prev, reminderHours: parseInt(value) }))
                    }
                    disabled={!smsSettings.reminderEnabled}
                  >
                    <SelectTrigger className="w-16">
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
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Send to */}
              <div className="flex items-center justify-between">
                <Label htmlFor="send-to">Send to:</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-to"
                    checked={true}
                    disabled
                  />
                  <span className="text-sm text-gray-600">Send booking to</span>
                  <Select
                    value={smsSettings.countryCode}
                    onValueChange={(value) => 
                      setSmsSettings(prev => ({ ...prev, countryCode: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
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
                    placeholder="Phone number"
                    className="w-32"
                  />
                </div>
              </div>

              {/* Satisfaction Surveys */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="satisfaction">Satisfaction surveys:</Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="satisfaction"
                    checked={smsSettings.satisfactionSurveyEnabled}
                    onCheckedChange={(checked) => 
                      setSmsSettings(prev => ({ ...prev, satisfactionSurveyEnabled: !!checked }))
                    }
                    disabled
                  />
                  <span className="text-sm text-gray-400">Coming soon</span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saveSettingsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SMS Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">SMS balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current balance:</span>
                <span className="font-medium">
                  {smsBalance?.balance || "0.00"} EUR
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment</span>
                <Button 
                  onClick={() => handleAddBalance(10)}
                  disabled={addBalanceMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Enter billing details
                </Button>
              </div>

              {/* Quick Balance Add Options */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">Quick add balance:</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddBalance(5)}
                    disabled={addBalanceMutation.isPending}
                  >
                    +5 EUR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddBalance(10)}
                    disabled={addBalanceMutation.isPending}
                  >
                    +10 EUR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddBalance(25)}
                    disabled={addBalanceMutation.isPending}
                  >
                    +25 EUR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddBalance(50)}
                    disabled={addBalanceMutation.isPending}
                  >
                    +50 EUR
                  </Button>
                </div>
              </div>

              {/* Free Testing Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Test SMS for Free</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Send a test SMS to verify your settings without using your balance
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Test phone number"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleTestSMS}
                    disabled={testSMSMutation.isPending || !testPhone}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {testSMSMutation.isPending ? "Sending..." : "Send Test SMS"}
                  </Button>
                </div>
                {lastTestResult && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">{lastTestResult}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}