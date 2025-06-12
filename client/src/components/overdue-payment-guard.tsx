import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CreditCard, Calendar, Clock, ExternalLink, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionDetails {
  tenant: {
    id: number;
    name: string;
    subscriptionStatus: string;
    subscriptionEndDate: string;
  };
  plan: any;
}

export const OverduePaymentGuard = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useLocation();
  
  const { data: subscriptionDetails } = useQuery<SubscriptionDetails>({
    queryKey: ["/api/subscription/details"],
  });

  const { data: billingInfo } = useQuery({
    queryKey: ["/api/billing/info"],
  });

  const { data: invoicesData } = useQuery<{
    invoices: Array<{
      id: string;
      amount_due: number;
      currency: string;
      status: string;
      hosted_invoice_url: string;
      created: number;
    }>;
  }>({
    queryKey: ["/api/billing/invoices"],
  });

  const isOverdue = subscriptionDetails?.tenant?.subscriptionStatus === 'past_due';
  const isEnded = subscriptionDetails?.tenant?.subscriptionStatus === 'ended' || 
                  subscriptionDetails?.tenant?.subscriptionStatus === 'canceled';
  const isTrialExpired = subscriptionDetails?.tenant?.subscriptionStatus === 'trialing' && 
                         subscriptionDetails?.tenant?.subscriptionEndDate && 
                         new Date(subscriptionDetails.tenant.subscriptionEndDate) < new Date();
  const isBlocked = isOverdue || isEnded || isTrialExpired;
  const isBillingPage = location.includes('/billing');

  useEffect(() => {
    // Redirect to billing if blocked (overdue or ended) and not already on billing page
    if (isBlocked && !isBillingPage && subscriptionDetails?.tenant?.id) {
      setLocation(`/${subscriptionDetails.tenant.id}/billing`);
    }
  }, [isBlocked, isBillingPage, setLocation, subscriptionDetails?.tenant?.id]);

  // If blocked (overdue, ended, or trial expired), show appropriate warning on billing page or block other pages
  if (isBlocked) {
    if (isBillingPage) {
      return (
        <>
          <OverduePaymentBanner 
            subscriptionDetails={subscriptionDetails} 
            isEnded={isEnded}
            isTrialExpired={Boolean(isTrialExpired)}
          />
          {children}
        </>
      );
    } else {
      // Block access to other pages
      return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Redirecting to billing...</div>
      </div>;
    }
  }

  return <>{children}</>;
};

const OverduePaymentBanner = ({ subscriptionDetails, isEnded, isTrialExpired }: { subscriptionDetails?: SubscriptionDetails; isEnded?: boolean; isTrialExpired?: boolean }) => {
  const { data: invoicesData } = useQuery<{
    invoices: Array<{
      id: string;
      amount_due: number;
      currency: string;
      status: string;
      hosted_invoice_url: string;
      created: number;
    }>;
  }>({
    queryKey: ["/api/billing/invoices"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/account/delete"),
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });
      // Redirect to home/login page
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const calculateDaysOverdue = () => {
    if (!subscriptionDetails?.tenant?.subscriptionEndDate) return 0;
    const endDate = new Date(subscriptionDetails.tenant.subscriptionEndDate);
    const today = new Date();
    const timeDiff = today.getTime() - endDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  const daysOverdue = calculateDaysOverdue();
  const daysUntilSuspension = Math.max(0, 15 - daysOverdue);
  const willBeSuspended = daysUntilSuspension === 0;

  // Find the most recent unpaid invoice
  const unpaidInvoice = invoicesData?.invoices?.find(invoice => 
    invoice.status === 'open' && invoice.amount_due > 0
  );

  const handlePayNow = () => {
    if (unpaidInvoice?.hosted_invoice_url) {
      window.open(unpaidInvoice.hosted_invoice_url, '_blank');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccountMutation.mutate();
    }
  };

  const getCardStyle = () => {
    if (isTrialExpired) return "border-orange-400 bg-orange-50 dark:bg-orange-950 dark:border-orange-600";
    if (isEnded) return "border-gray-400 bg-gray-50 dark:bg-gray-950 dark:border-gray-600";
    return "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800";
  };

  const getIconColor = () => {
    if (isTrialExpired) return 'text-orange-600';
    if (isEnded) return 'text-gray-600';
    return 'text-red-600';
  };

  const getTitleColor = () => {
    if (isTrialExpired) return 'text-orange-800 dark:text-orange-200';
    if (isEnded) return 'text-gray-800 dark:text-gray-200';
    return 'text-red-800 dark:text-red-200';
  };

  const getDescriptionColor = () => {
    if (isTrialExpired) return 'text-orange-600 dark:text-orange-400';
    if (isEnded) return 'text-gray-600 dark:text-gray-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTitle = () => {
    if (isTrialExpired) return "Trial Period Expired";
    if (isEnded) return "Subscription Ended";
    if (willBeSuspended) return "Account Suspended";
    return "Payment Overdue";
  };

  const getDescription = () => {
    if (isTrialExpired) return "Your free trial has ended. Subscribe to continue using the service.";
    if (isEnded) return "Your subscription has ended. Choose to reactivate or delete your account.";
    if (willBeSuspended) return "Your account has been suspended due to non-payment";
    return "Your subscription payment is past due";
  };

  return (
    <Card className={getCardStyle()}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`h-8 w-8 ${getIconColor()}`} />
          <div>
            <CardTitle className={getTitleColor()}>
              {getTitle()}
            </CardTitle>
            <CardDescription className={getDescriptionColor()}>
              {getDescription()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnded ? (
          <Alert className="border-gray-300 bg-gray-100 dark:bg-gray-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-gray-800 dark:text-gray-200">
              <div className="space-y-2">
                <div className="font-semibold">
                  Your subscription has ended
                </div>
                <div>
                  Your subscription ended on{" "}
                  {subscriptionDetails?.tenant?.subscriptionEndDate && 
                    new Date(subscriptionDetails.tenant.subscriptionEndDate).toLocaleDateString()}.
                  You can reactivate your subscription below or delete your account if you no longer need our services.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-red-300 bg-red-100 dark:bg-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <div className="space-y-2">
                <div className="font-semibold">
                  {willBeSuspended 
                    ? "Your account has been suspended"
                    : `Payment overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`}
                </div>
                <div>
                  {willBeSuspended ? (
                    "Access to your restaurant management system has been suspended. Please pay your outstanding invoice to restore access."
                  ) : (
                    <>
                      Your subscription payment was due on{" "}
                      {subscriptionDetails?.tenant?.subscriptionEndDate && 
                        new Date(subscriptionDetails.tenant.subscriptionEndDate).toLocaleDateString()}.
                      {daysUntilSuspension > 0 && (
                        <> You have <strong>{daysUntilSuspension} day{daysUntilSuspension !== 1 ? 's' : ''}</strong> remaining before your account is suspended.</>
                      )}
                    </>
                  )}
                </div>
                {!willBeSuspended && (
                  <div className="text-sm">
                    <strong>Important:</strong> If payment is not received within 15 days of the due date, 
                    your account will be automatically suspended and access to all restaurant management 
                    features will be blocked.
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Deletion Section for Ended Subscriptions */}
        {isEnded && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Delete Account
                </h3>
                <p className="text-red-700 dark:text-red-300">
                  If you no longer need our services, you can permanently delete your account.
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Warning: This action cannot be undone and will delete all your data.
                </p>
              </div>
              <Button 
                onClick={handleDeleteAccount}
                variant="destructive"
                size="lg"
                disabled={deleteAccountMutation.isPending}
                className="px-8 py-3 font-semibold"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        )}

        {!isEnded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <Calendar className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-sm font-medium">Due Date</div>
              <div className="text-sm text-muted-foreground">
                {subscriptionDetails?.tenant?.subscriptionEndDate && 
                  new Date(subscriptionDetails.tenant.subscriptionEndDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-sm font-medium">Days Overdue</div>
              <div className="text-sm text-muted-foreground font-semibold">
                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium">
                {willBeSuspended ? "Suspended" : "Days Until Suspension"}
              </div>
              <div className="text-sm text-muted-foreground font-semibold">
                {willBeSuspended ? "Account Suspended" : `${daysUntilSuspension} day${daysUntilSuspension !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Payment Action Section */}
        {unpaidInvoice && !isEnded && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Outstanding Invoice
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  Amount Due: <span className="font-bold">
                    ${(unpaidInvoice.amount_due / 100).toFixed(2)} {unpaidInvoice.currency.toUpperCase()}
                  </span>
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Pay now to restore full access to your account
                </p>
              </div>
              <Button 
                onClick={handlePayNow}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-semibold"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Pay Now
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {isTrialExpired && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Choose a subscription plan to continue:</strong>
              <p className="mt-2">Your free trial has ended. Select a plan below to continue using all restaurant management features.</p>
            </div>
          </div>
        )}

        {!willBeSuspended && !isTrialExpired && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>What happens next?</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Pay your outstanding invoice above to restore normal access</li>
                <li>Your account remains functional during the 15-day grace period</li>
                <li>After 15 days, all restaurant management features will be suspended</li>
                <li>Contact support if you need assistance with payment</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};