import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, CreditCard, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  status: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export default function PaymentGateway() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentGateway, setPaymentGateway] = useState("Stripe");
  const tenantId = restaurant?.tenantId;

  // Fetch Stripe Connect status
  const { data: connectStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["stripe-connect-status", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await apiRequest("GET", `/api/tenants/${tenantId}/stripe-connect/status`);
      return response.json() as Promise<StripeConnectStatus>;
    },
    enabled: !!tenantId,
    staleTime: 30000,
    retry: 2,
  });

  // Start Stripe Connect onboarding
  const onboardMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID not available");
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/stripe-connect/onboard`, {});
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.onboardingUrl;
    },
    onError: async (error) => {
      console.error("Stripe Connect error:", error);
      
      // Try to get the error details from the response
      let errorMessage = "Failed to start Stripe Connect onboarding";
      let errorDetails = "Please try again or contact support";
      
      try {
        const response = await fetch(`/api/tenants/${tenantId}/stripe-connect/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorDetails = errorData.details || errorDetails;
        }
      } catch (fetchError) {
        // Ignore fetch errors, use default messages
      }
      
      toast({
        title: errorMessage,
        description: errorDetails,
        variant: "destructive",
      });
    },
  });

  // Refresh account status
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID not available");
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/stripe-connect/refresh`);
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      toast({
        title: "Success",
        description: "Account status refreshed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to refresh account status",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "restricted":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Restricted</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Connected</Badge>;
    }
  };

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Gateway</CardTitle>
            <p className="text-sm text-gray-600">
              Below, you can pick a payment gateway, which is required to use
              our payment setups. Credit card payments is handled via the chosen
              gateway.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Payment Gateway
              </label>
              <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                  <SelectItem value="Square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Stripe Connect
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Secure payment processing with direct payouts to your bank account
                    </p>
                  </div>
                  {statusLoading ? (
                    <Badge variant="outline">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading...
                    </Badge>
                  ) : (
                    getStatusBadge(connectStatus?.status || "not_connected")
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : !connectStatus?.connected ? (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Connect your Stripe account to start accepting payments from customers. 
                        We use Stripe Connect to securely process payments and transfer funds directly to your bank account.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="font-medium text-blue-900 mb-2">What you get with Stripe Connect:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Secure credit card processing</li>
                        <li>• Direct payouts to your bank account</li>
                        <li>• Comprehensive fraud protection</li>
                        <li>• Real-time transaction monitoring</li>
                        <li>• Support for all major payment methods</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        onClick={() => onboardMutation.mutate()}
                        disabled={onboardMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {onboardMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Connect with Stripe
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {connectStatus.chargesEnabled && connectStatus.payoutsEnabled ? (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Connected!</strong> Your Stripe account is successfully connected. 
                          You can now accept payments from customers.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Setup Required:</strong> Your Stripe account is connected but needs additional information to enable charges and payouts. 
                          Click "Complete Setup" to finish the onboarding process.
                        </AlertDescription>
                      </Alert>
                    )}

                    {(!connectStatus.chargesEnabled || !connectStatus.payoutsEnabled) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="font-medium text-blue-900 mb-2">To enable charges and payouts:</h4>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          <li>Click "Complete Setup" to continue the Stripe onboarding process</li>
                          <li>Provide your business information and bank account details</li>
                          <li>Verify your identity with Stripe</li>
                          <li>Once approved, charges and payouts will be automatically enabled</li>
                        </ol>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Account ID</div>
                        <div className="text-gray-600 font-mono text-xs">
                          {connectStatus.accountId?.substring(0, 20)}...
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Status</div>
                        <div className="text-gray-600 capitalize">{connectStatus.status}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Charges Enabled</div>
                        <div className={connectStatus.chargesEnabled ? "text-green-600" : "text-red-600"}>
                          {connectStatus.chargesEnabled ? "Yes" : "No"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Payouts Enabled</div>
                        <div className={connectStatus.payoutsEnabled ? "text-green-600" : "text-red-600"}>
                          {connectStatus.payoutsEnabled ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!connectStatus.chargesEnabled || !connectStatus.payoutsEnabled ? (
                        <Button 
                          onClick={() => onboardMutation.mutate()}
                          disabled={onboardMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {onboardMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Complete Setup
                        </Button>
                      ) : null}
                      <Button 
                        variant="outline"
                        onClick={() => refreshMutation.mutate()}
                        disabled={refreshMutation.isPending}
                      >
                        {refreshMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Status
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Stripe Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
