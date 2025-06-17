import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt, Settings, Calendar, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { WalletManagement } from "@/components/wallet-management";

export default function BillingPage() {
  const { data: session } = useQuery({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscription/details"],
    enabled: !!session,
    retry: false,
  });

  const tenant = subscriptionData?.tenant;
  const plan = subscriptionData?.plan;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'unpaid':
      case 'past_due':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'trial':
        return 'Trial';
      case 'unpaid':
        return 'Payment Required';
      case 'past_due':
        return 'Past Due';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Payments</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your subscription, payment methods, and billing information
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Receipt className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Payment Methods</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Plan</span>
                {tenant?.subscriptionStatus && (
                  <Badge className={getStatusColor(tenant.subscriptionStatus)}>
                    {formatStatus(tenant.subscriptionStatus)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Your current subscription details and usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {plan ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {plan.name} Plan
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(plan.price)}
                      <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                        /month
                      </span>
                    </p>
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Features included:</h4>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {JSON.parse(plan.features || '[]').map((feature: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Usage Limits</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tables</span>
                          <span>? / {plan.maxTables}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly Bookings</span>
                          <span>? / {plan.maxBookingsPerMonth}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Restaurants</span>
                          <span>1 / {plan.maxRestaurants}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(100, (1 / plan.maxRestaurants) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Loading subscription details...</p>
                </div>
              )}

              {plan?.price > 0 && tenant?.subscriptionStatus === 'trial' && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 dark:text-amber-100">Trial Period Active</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Your {plan.trialDays}-day trial is currently active. Add a payment method to continue after the trial ends.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tenant?.subscriptionStatus === 'unpaid' && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 dark:text-red-100">Payment Required</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Your subscription requires payment to continue. Please add a payment method or update your existing one.
                      </p>
                      <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700">
                        Update Payment Method
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Your recent billing history and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices available</p>
                <p className="text-sm">Invoices will appear here after your first payment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <WalletManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>
                Manage your billing preferences and account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Billing Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600 dark:text-gray-400">Email</label>
                    <p className="font-medium">{session.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 dark:text-gray-400">Company</label>
                    <p className="font-medium">{tenant?.name || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Plan Management</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Change Plan
                  </Button>
                  {plan?.price > 0 && (
                    <Button variant="outline" className="w-full sm:w-auto text-red-600 hover:text-red-700">
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Download</h4>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download Invoice History</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}