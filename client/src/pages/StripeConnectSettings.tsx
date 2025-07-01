import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  status: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface Payment {
  id: number;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  createdAt: string;
}

export default function StripeConnectSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurant } = useAuth();
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
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  // Fetch payment history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["stripe-payments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await apiRequest("GET", `/api/tenants/${tenantId}/payments`);
      return response.json() as Promise<Payment[]>;
    },
    enabled: !!tenantId && connectStatus?.connected,
  });

  // Start Stripe Connect onboarding
  const onboardMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID not available");
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/stripe-connect/onboard`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe OAuth authorization
      window.location.href = data.onboardingUrl;
    },
    onError: (error) => {
      console.error("Stripe Connect error:", error);
      toast({
        title: "Stripe Connect Setup Required",
        description: "Please ensure Stripe Connect is enabled on your Stripe dashboard and STRIPE_CLIENT_ID is configured.",
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
      queryClient.invalidateQueries({ queryKey: ["stripe-payments", tenantId] });
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

  const handleConnect = () => {
    onboardMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      not_connected: { label: "Not Connected", variant: "secondary" as const },
      pending: { label: "Pending", variant: "outline" as const },
      connected: { label: "Connected", variant: "default" as const },
      restricted: { label: "Restricted", variant: "destructive" as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.not_connected;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // If no tenant ID, show error state
  if (!tenantId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load tenant information. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading only briefly
  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Payment Gateway Settings</h1>
          <p className="text-muted-foreground">
            Connect your Stripe account to accept payments from customers
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Payment Gateway Settings</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to accept payments from customers
        </p>
      </div>

      <div className="grid gap-6">
        {/* Stripe Connect Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Connect Status
                </CardTitle>
                <CardDescription>
                  Manage your Stripe Connect integration to accept payments
                </CardDescription>
              </div>
              {getStatusBadge(connectStatus?.status || "not_connected")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connectStatus?.connected ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connect your Stripe account to start accepting payments from customers. 
                    We use Stripe Connect to securely process payments and transfer funds to your account.
                  </AlertDescription>
                </Alert>
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Setup Required:</strong> Before connecting, ensure Stripe Connect is enabled on your Stripe account. 
                    Visit <a href="https://dashboard.stripe.com/connect/overview" target="_blank" className="underline hover:no-underline">
                      Stripe Connect Dashboard
                    </a> to get started.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleConnect}
                  disabled={onboardMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {onboardMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect Stripe Account
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your Stripe account is connected and ready to accept payments!
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account ID</label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {connectStatus.accountId}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Charges Enabled</label>
                    <p className="text-sm">
                      {connectStatus.chargesEnabled ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payouts Enabled</label>
                    <p className="text-sm">
                      {connectStatus.payoutsEnabled ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  {refreshMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Status
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History Card */}
        {connectStatus?.connected && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                View your recent payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments yet. Start accepting payments from your customers!
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.slice(0, 10).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                          <Badge 
                            variant={payment.status === "succeeded" ? "default" : "secondary"}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.customerName || payment.customerEmail}
                        </p>
                        {payment.description && (
                          <p className="text-sm text-muted-foreground">
                            {payment.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Platform Fee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Fees</CardTitle>
            <CardDescription>
              Understand how our payment processing works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Fee</label>
                  <p className="text-sm text-muted-foreground">
                    5% of each transaction
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stripe Processing</label>
                  <p className="text-sm text-muted-foreground">
                    2.9% + 30¢ per successful charge
                  </p>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Funds are automatically transferred to your connected Stripe account according to 
                  your payout schedule. Our platform fee covers infrastructure, security, and support.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}