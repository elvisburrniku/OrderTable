import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CreditCard, Calendar, Clock } from "lucide-react";

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

  const isOverdue = subscriptionDetails?.tenant?.subscriptionStatus === 'past_due';
  const isBillingPage = location.includes('/billing');

  useEffect(() => {
    // Redirect to billing if overdue and not already on billing page
    if (isOverdue && !isBillingPage && subscriptionDetails?.tenant?.id) {
      setLocation(`/${subscriptionDetails.tenant.id}/billing`);
    }
  }, [isOverdue, isBillingPage, setLocation, subscriptionDetails?.tenant?.id]);

  // If overdue, show the overdue warning on billing page or block other pages
  if (isOverdue) {
    if (isBillingPage) {
      return (
        <div className="container mx-auto p-6 space-y-6">
          <OverduePaymentBanner subscriptionDetails={subscriptionDetails} />
          {children}
        </div>
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

const OverduePaymentBanner = ({ subscriptionDetails }: { subscriptionDetails?: SubscriptionDetails }) => {
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

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <CardTitle className="text-red-800 dark:text-red-200">
              {willBeSuspended ? "Account Suspended" : "Payment Overdue"}
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              {willBeSuspended 
                ? "Your account has been suspended due to non-payment"
                : "Your subscription payment is past due"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {!willBeSuspended && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>What happens next?</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Pay your outstanding invoice below to restore normal access</li>
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