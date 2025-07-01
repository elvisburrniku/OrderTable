import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Phone, MessageSquare, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TwilioSettings() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [testPhone, setTestPhone] = useState("");
  const [lastTestResult, setLastTestResult] = useState("");

  // Fetch Twilio account info
  const { data: twilioAccount, isLoading: isLoadingAccount } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/twilio/account`],
    enabled: !!restaurant?.tenantId,
  });

  // Fetch SMS balance
  const { data: smsBalance } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/sms-balance`],
    enabled: !!restaurant?.tenantId,
  });

  // Test SMS mutation
  const testSMSMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/sms-messages/test`, {
        phoneNumber: testPhone,
        message: "Test SMS from your restaurant booking system via Twilio. Integration is working correctly!",
        type: "test"
      });
    },
    onSuccess: (data) => {
      setLastTestResult(data.note || "Test SMS sent successfully via Twilio");
      toast({
        title: "Test Successful",
        description: "SMS test completed successfully",
      });
      // Refresh balance after test
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/sms-balance`] 
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

  const isConfigured = !twilioAccount?.error;
  const accountStatus = twilioAccount?.status;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Twilio SMS Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure Twilio SMS integration for booking confirmations and reminders
          </p>
        </div>

        {/* Configuration Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Twilio Integration Status
            </CardTitle>
            <CardDescription>
              Current status of your Twilio SMS integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {isConfigured ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  Not Configured
                </Badge>
              )}
              {accountStatus && (
                <Badge variant="outline" className="capitalize">
                  {accountStatus}
                </Badge>
              )}
            </div>

            {!isConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Twilio is not configured. Please set the following environment variables:
                  <ul className="list-disc list-inside mt-2 ml-4">
                    <li>TWILIO_ACCOUNT_SID</li>
                    <li>TWILIO_AUTH_TOKEN</li>
                    <li>TWILIO_PHONE_NUMBER</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isConfigured && twilioAccount && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account SID</Label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                    {twilioAccount.accountSid}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account Name</Label>
                  <p className="text-sm text-gray-900">
                    {twilioAccount.accountName || 'Not available'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Twilio Balance</Label>
                  <p className="text-sm text-gray-900 font-semibold">
                    ${twilioAccount.balance} {twilioAccount.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <p className="text-sm text-gray-900 capitalize">
                    {twilioAccount.status}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Balance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              SMS Balance
            </CardTitle>
            <CardDescription>
              Your current SMS credit balance for notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  €{smsBalance?.balance || '0.00'}
                </p>
                <p className="text-sm text-gray-600">Current balance</p>
              </div>
              <Badge variant={parseFloat(smsBalance?.balance || '0') > 5 ? 'default' : 'destructive'}>
                {parseFloat(smsBalance?.balance || '0') > 5 ? 'Sufficient' : 'Low Balance'}
              </Badge>
            </div>
            
            {parseFloat(smsBalance?.balance || '0') <= 5 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your SMS balance is low. Add credits to continue sending SMS notifications.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* SMS Testing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Test SMS Functionality
            </CardTitle>
            <CardDescription>
              Send a test SMS to verify your Twilio integration is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="testPhone">Test Phone Number</Label>
                <Input
                  id="testPhone"
                  type="tel"
                  placeholder="+1234567890"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>
              
              <Button 
                onClick={handleTestSMS}
                disabled={testSMSMutation.isPending || !isConfigured}
                className="w-full sm:w-auto"
              >
                {testSMSMutation.isPending ? "Sending..." : "Send Test SMS"}
              </Button>

              {lastTestResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">{lastTestResult}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SMS Features */}
        <Card>
          <CardHeader>
            <CardTitle>SMS Features</CardTitle>
            <CardDescription>
              Available SMS functionality with Twilio integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Booking Confirmations</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Automatically send SMS confirmations when bookings are made
                </p>
                <Badge variant="outline">Automatic</Badge>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Booking Reminders</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Send SMS reminders before booking appointments
                </p>
                <Badge variant="outline">Configurable</Badge>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Status Updates</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Real-time delivery status tracking via webhooks
                </p>
                <Badge variant="outline">Real-time</Badge>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Cost Tracking</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Detailed tracking of SMS costs and balance management
                </p>
                <Badge variant="outline">Transparent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Getting Twilio Credentials:</strong> Sign up at{" "}
                <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:underline">
                  twilio.com
                </a>{" "}
                and get your Account SID, Auth Token, and phone number from the console.
              </p>
              <p>
                <strong>Phone Number Format:</strong> Always include the country code (e.g., +1 for US/Canada).
              </p>
              <p>
                <strong>Cost Information:</strong> SMS costs vary by destination. Check Twilio's pricing page for details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}