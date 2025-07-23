import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, CreditCard, ExternalLink, RefreshCw, TrendingUp, Users, Calendar, DollarSign, BarChart3, Activity, Receipt, Clock, Banknote, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

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

interface PaymentStatistics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  averagePaymentAmount: number;
  paymentsByDay: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  paymentsByCurrency: Record<string, { count: number; amount: number }>;
  topCustomers: Array<{ 
    customerId: string;
    name: string;
    email: string; 
    totalAmount: number;
    paymentCount: number;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    customerEmail?: string;
    customerName?: string;
    bookingId?: string;
    description?: string;
    receiptUrl?: string;
  }>;
  monthlyRevenue: Record<string, number>;
  payoutSummary: {
    totalPayouts: number;
    totalPayoutAmount: number;
    pendingPayouts: number;
    completedPayouts: number;
  };
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrivalDate: string;
    created: string;
  }>;
  accountBalance: {
    available: number;
    pending: number;
  };
}

export default function StripeConnectSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurant } = useAuth();
  const tenantId = restaurant?.tenantId;
  const [dateRange, setDateRange] = useState("30days");
  
  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "7days":
        startDate = subDays(endDate, 7);
        break;
      case "30days":
        startDate = subDays(endDate, 30);
        break;
      case "thisMonth":
        startDate = startOfMonth(endDate);
        endDate.setDate(endOfMonth(endDate).getDate());
        break;
      case "90days":
        startDate = subDays(endDate, 90);
        break;
      case "all":
        startDate = new Date("2020-01-01"); // Far past date
        break;
    }
    
    return { 
      startDate: format(startDate, "yyyy-MM-dd"), 
      endDate: format(endDate, "yyyy-MM-dd") 
    };
  };

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

  // Fetch payment statistics with real-time updates
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["stripe-payment-statistics", tenantId, dateRange, restaurant?.id],
    queryFn: async () => {
      if (!tenantId) return null;
      const { startDate, endDate } = getDateRange();
      const response = await apiRequest(
        "GET", 
        `/api/tenants/${tenantId}/stripe-payments/statistics?startDate=${startDate}&endDate=${endDate}&restaurantId=${restaurant?.id}`
      );
      return response.json() as Promise<PaymentStatistics>;
    },
    enabled: !!tenantId && connectStatus?.connected,
    staleTime: 30000, // 30 seconds for more real-time data
    refetchInterval: 60000, // Auto-refresh every minute
  });

  // Start Stripe Connect onboarding
  const onboardMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID not available");
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/stripe-connect/onboard`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    },
    onError: (error) => {
      console.error("Stripe Connect error:", error);
      toast({
        title: "Stripe Connect Setup Required",
        description: "Please enable Stripe Connect on your Stripe dashboard first. Visit https://dashboard.stripe.com/connect/overview to get started.",
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

  const formatCurrency = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "text-green-600";
      case "processing": return "text-yellow-600";
      case "failed": return "text-red-600";
      case "canceled": return "text-gray-600";
      default: return "text-gray-500";
    }
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

        {/* Payment Statistics and History */}
        {connectStatus?.connected && (
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Payment Analytics</h2>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Key Metrics Cards */}
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-800">{formatCurrency(statistics.totalRevenue)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-green-600">
                        Net: {formatCurrency(statistics.netRevenue)} after fees
                      </p>
                      <p className="text-xs text-green-500">
                        Conversion: {statistics.conversionRate?.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                        <p className="text-2xl font-bold">{statistics.totalPayments}</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-green-600">{statistics.successfulPayments} successful</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average Payment</p>
                        <p className="text-2xl font-bold">{formatCurrency(statistics.averagePaymentAmount)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Per transaction</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-700">Account Balance</p>
                        <p className="text-2xl font-bold text-orange-800">{formatCurrency(statistics.accountBalance.available)}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-orange-600">
                        Pending: {formatCurrency(statistics.accountBalance.pending)}
                      </p>
                      <p className="text-xs text-orange-500">
                        {statistics.accountBalance.currency}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Enhanced Statistics Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="payments">Recent Payments</TabsTrigger>
                <TabsTrigger value="customers">Top Customers</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Payment Overview
                    </CardTitle>
                    <CardDescription>
                      Detailed breakdown of your payment statistics with real-time data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statistics && (
                      <div className="space-y-6">
                        {/* Enhanced Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-700 mb-1">Platform Fees</h4>
                            <p className="text-lg font-bold text-blue-800">{formatCurrency(statistics.totalApplicationFees || 0)}</p>
                            <p className="text-xs text-blue-600">From successful payments</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="text-sm font-medium text-purple-700 mb-1">Processing Fees</h4>
                            <p className="text-lg font-bold text-purple-800">{formatCurrency(statistics.totalFees)}</p>
                            <p className="text-xs text-purple-600">Stripe processing fees</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Success Rate</h4>
                            <p className="text-lg font-bold text-gray-800">{statistics.conversionRate?.toFixed(1)}%</p>
                            <p className="text-xs text-gray-600">{statistics.successfulPayments} of {statistics.totalPayments} payments</p>
                          </div>
                        </div>

                        {/* Payment Status Breakdown */}
                        <div>
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Payment Status Distribution
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(statistics.paymentsByStatus).map(([status, count]) => (
                              <div key={status} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    status === 'succeeded' ? 'bg-green-500' :
                                    status === 'processing' ? 'bg-yellow-500' :
                                    status === 'failed' ? 'bg-red-500' :
                                    'bg-gray-500'
                                  }`} />
                                  <span className="text-sm capitalize">{status}</span>
                                </div>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Currency Breakdown */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">Revenue by Currency</h4>
                          <div className="space-y-2">
                            {Object.entries(statistics.paymentsByCurrency).map(([currency, data]) => (
                              <div key={currency} className="flex items-center justify-between">
                                <span className="text-sm uppercase">{currency}</span>
                                <div className="text-sm">
                                  <span className="font-medium">{formatCurrency(data.amount, currency)}</span>
                                  <span className="text-muted-foreground ml-2">({data.count} payments)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Monthly Trend */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">Monthly Revenue</h4>
                          <div className="space-y-2">
                            {Object.entries(statistics.monthlyRevenue).slice(-6).map(([month, amount]) => (
                              <div key={month} className="flex items-center justify-between">
                                <span className="text-sm">{month}</span>
                                <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
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
                    ) : statistics?.recentPayments?.length ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {statistics.recentPayments.map((payment: any) => (
                          <div key={payment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant={payment.status === 'succeeded' ? 'default' : 
                                          payment.status === 'failed' ? 'destructive' : 'secondary'}
                                >
                                  {payment.status}
                                </Badge>
                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                <span className="text-sm text-muted-foreground">{payment.currency}</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {payment.customerName || payment.customerEmail || 'Guest'}
                                </p>
                                {payment.bookingId && (
                                  <p className="text-xs text-muted-foreground">
                                    Booking #{payment.bookingId} • Restaurant #{payment.restaurantId}
                                  </p>
                                )}
                                {payment.paymentMethod && (
                                  <p className="text-xs text-blue-600">
                                    {payment.brand?.toUpperCase()} •••• {payment.last4}
                                  </p>
                                )}
                                {payment.applicationFeeAmount > 0 && (
                                  <p className="text-xs text-purple-600">
                                    Platform fee: {formatCurrency(payment.applicationFeeAmount)}
                                  </p>
                                )}
                                {payment.stripeProcessingFee > 0 && (
                                  <p className="text-xs text-gray-600">
                                    Processing fee: {formatCurrency(payment.stripeProcessingFee)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {format(new Date(payment.created), "MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.created), "h:mm a")}
                              </p>
                              {payment.receiptUrl && (
                                <a 
                                  href={payment.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  View Receipt
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-muted-foreground">No payments found for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>
                      Your most valuable customers by revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statistics && statistics.topCustomers && statistics.topCustomers.length > 0 ? (
                      <div className="space-y-4">
                        {statistics.topCustomers.map((customer, index) => (
                          <div key={customer.customerId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(customer.totalAmount)}</p>
                              <p className="text-sm text-muted-foreground">{customer.paymentCount} payments</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No customer data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Payouts & Transfers
                    </CardTitle>
                    <CardDescription>
                      Your recent payout history and transfer details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statistics?.payoutSummary ? (
                      <div className="space-y-6">
                        {/* Payout Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="text-sm font-medium text-green-700 mb-1">Total Payouts</h4>
                            <p className="text-lg font-bold text-green-800">{formatCurrency(statistics.payoutSummary.totalPayoutAmount)}</p>
                            <p className="text-xs text-green-600">{statistics.payoutSummary.totalPayouts} transfers</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-700 mb-1">Completed</h4>
                            <p className="text-lg font-bold text-blue-800">{statistics.payoutSummary.completedPayouts}</p>
                            <p className="text-xs text-blue-600">Successful transfers</p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="text-sm font-medium text-yellow-700 mb-1">Pending</h4>
                            <p className="text-lg font-bold text-yellow-800">{statistics.payoutSummary.pendingPayouts}</p>
                            <p className="text-xs text-yellow-600">In progress</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Available Balance</h4>
                            <p className="text-lg font-bold text-gray-800">{formatCurrency(statistics.accountBalance.available)}</p>
                            <p className="text-xs text-gray-600">Ready for payout</p>
                          </div>
                        </div>

                        {/* Recent Payouts */}
                        {statistics.payoutSummary.recentPayouts && statistics.payoutSummary.recentPayouts.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Recent Payouts
                            </h4>
                            <div className="space-y-3">
                              {statistics.payoutSummary.recentPayouts.map((payout: any) => (
                                <div key={payout.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Badge 
                                      variant={
                                        payout.status === "paid" ? "default" : 
                                        payout.status === "pending" ? "secondary" : 
                                        "outline"
                                      }
                                    >
                                      {payout.status}
                                    </Badge>
                                    <div>
                                      <p className="font-medium">{formatCurrency(payout.amount)}</p>
                                      <p className="text-sm text-muted-foreground">{payout.currency}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">
                                      {format(new Date(payout.arrivalDate), "MMM d, yyyy")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Created: {format(new Date(payout.created), "MMM d")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-muted-foreground">No payouts available for the selected period</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-muted-foreground">No payout data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
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