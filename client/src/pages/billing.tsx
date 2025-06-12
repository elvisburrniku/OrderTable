import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Download,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Check,
} from "lucide-react";
import { format } from "date-fns";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key",
);

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface Invoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
  number: string;
  description: string;
}

interface BillingInfo {
  customer: any;
  paymentMethods: PaymentMethod[];
  upcomingInvoice: any;
  subscriptionStatus: string;
  stripeSubscriptionId: string;
}

const AddPaymentMethodForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/setup-intent");
      if (!response.ok) {
        throw new Error("Failed to create setup intent");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (!stripe || !elements) return;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      setIsLoading(true);
      
      const { error } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      setIsLoading(false);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setupIntentMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading || setupIntentMutation.isPending}
        className="w-full"
      >
        {isLoading || setupIntentMutation.isPending
          ? "Adding..."
          : "Add Payment Method"}
      </Button>
    </form>
  );
};

const PaymentMethodCard = ({
  paymentMethod,
  isDefault,
  onSetDefault,
  onDelete,
}: {
  paymentMethod: PaymentMethod;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) => {
  const brandIcon = paymentMethod.card.brand.toUpperCase();

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {brandIcon} •••• {paymentMethod.card.last4}
              </div>
              <div className="text-sm text-muted-foreground">
                Expires {paymentMethod.card.exp_month}/
                {paymentMethod.card.exp_year}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isDefault && (
              <Badge
                variant="secondary"
                className="flex items-center space-x-1"
              >
                <Star className="h-3 w-3" />
                <span>Default</span>
              </Badge>
            )}
            {!isDefault && (
              <Button variant="outline" size="sm" onClick={onSetDefault}>
                Set Default
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InvoiceRow = ({ invoice }: { invoice: Invoice }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 border-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "void":
        return <Badge variant="secondary">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">#{invoice.number}</div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(invoice.created * 1000), "MMM dd, yyyy")}
        </div>
        {invoice.period_start && invoice.period_end && (
          <div className="text-xs text-muted-foreground">
            Service period:{" "}
            {format(new Date(invoice.period_start * 1000), "MMM dd")} -{" "}
            {format(new Date(invoice.period_end * 1000), "MMM dd, yyyy")}
          </div>
        )}
      </div>
      <div className="text-right space-y-1">
        <div className="font-medium">
          ${(invoice.amount_paid / 100).toFixed(2)}{" "}
          {invoice.currency.toUpperCase()}
        </div>
        {getStatusBadge(invoice.status)}
      </div>
      <div className="ml-4 space-x-2">
        {invoice.hosted_invoice_url && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View
            </a>
          </Button>
        )}
        {invoice.invoice_pdf && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={invoice.invoice_pdf}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);

  const { data: billingInfo, isLoading: billingLoading } =
    useQuery<BillingInfo>({
      queryKey: ["/api/billing/info"],
    });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{
    invoices: Invoice[];
  }>({
    queryKey: ["/api/billing/invoices"],
  });

  const { data: subscriptionDetails } = useQuery({
    queryKey: ["/api/subscription/details"],
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest("DELETE", `/api/billing/payment-method/${paymentMethodId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment method removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest("PUT", "/api/billing/default-payment-method", {
        paymentMethodId,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default payment method updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing/cancel-subscription"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/details"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/billing/reactivate-subscription"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Reactivated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/details"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: (planId: number) =>
      apiRequest("POST", "/api/subscription/subscribe", { planId }),
    onSuccess: (data: any) => {
      if (data.requiresPaymentMethod) {
        toast({
          title: "Payment Method Required",
          description: data.message || "Please add a payment method first to upgrade to a paid plan",
          variant: "destructive",
        });
        setAddPaymentDialogOpen(true);
      } else if (data.checkoutUrl) {
        // Redirect to Stripe checkout for new subscriptions
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Subscription Updated",
          description: data.message || "Your subscription has been updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/subscription/details"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      }
    },
    onError: (error: any) => {
      // Handle detailed downgrade validation errors
      if (error.validationFailures) {
        const failures = error.validationFailures;
        const tableFailure = failures.find((f: any) => f.type === "table_limit");
        const bookingFailure = failures.find((f: any) => f.type === "booking_limit");
        
        let detailedMessage = error.message;
        
        if (tableFailure && bookingFailure) {
          detailedMessage += `\n\nActions required:\n• ${tableFailure.action}\n• ${bookingFailure.action}`;
        } else if (tableFailure) {
          detailedMessage += `\n\nAction required: ${tableFailure.action}`;
        } else if (bookingFailure) {
          detailedMessage += `\n\nAction required: ${bookingFailure.action}`;
        }
        
        toast({
          title: "Downgrade Blocked",
          description: detailedMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update subscription",
          variant: "destructive",
        });
      }
    },
  });

  const handlePaymentMethodSuccess = () => {
    setAddPaymentDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
  };

  if (billingLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const defaultPaymentMethod =
    billingInfo?.customer?.invoice_settings?.default_payment_method;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
      </div>

      {/* Subscription Status */}
      {subscriptionDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-lg">
                  {subscriptionDetails.plan?.name || "Free Trial"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {subscriptionDetails.plan
                    ? `$${(subscriptionDetails.plan.price / 100).toFixed(2)}/${subscriptionDetails.plan.interval}`
                    : "No active subscription"}
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    subscriptionDetails.tenant.subscriptionStatus === "active"
                      ? "default"
                      : "secondary"
                  }
                  className={
                    subscriptionDetails.tenant.subscriptionStatus === "active"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : subscriptionDetails.tenant.subscriptionStatus ===
                          "trial"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-red-100 text-red-800 border-red-200"
                  }
                >
                  {subscriptionDetails.tenant.subscriptionStatus}
                </Badge>
              </div>
            </div>

            {subscriptionDetails.tenant.subscriptionEndDate && (
              <div className="text-sm text-muted-foreground">
                {subscriptionDetails.tenant.subscriptionStatus === "cancelled"
                  ? "Expires"
                  : "Next billing"}
                :{" "}
                {format(
                  new Date(subscriptionDetails.tenant.subscriptionEndDate),
                  "MMM dd, yyyy",
                )}
              </div>
            )}

            {subscriptionDetails.tenant.subscriptionStatus === "active" && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  {cancelSubscriptionMutation.isPending
                    ? "Cancelling..."
                    : "Cancel Subscription"}
                </Button>
              </div>
            )}



            {subscriptionDetails.tenant.subscriptionStatus === "cancelled" && subscriptionDetails.tenant.subscriptionEndDate && (
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will end on{" "}
                    {format(
                      new Date(subscriptionDetails.tenant.subscriptionEndDate),
                      "MMM dd, yyyy",
                    )}
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                >
                  {reactivateSubscriptionMutation.isPending
                    ? "Reactivating..."
                    : "Reactivate Subscription"}
                </Button>
              </div>
            )}

            {/* Show reactivate button for any non-active status with subscription (excluding cancelled which has its own section) */}
            {subscriptionDetails.tenant.subscriptionStatus !== "active" && 
             subscriptionDetails.tenant.subscriptionStatus !== "trial" && 
             subscriptionDetails.tenant.subscriptionStatus !== "cancelled" && 
             subscriptionDetails.plan && (
              <div className="space-y-2">
                <Button
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                  variant="outline"
                >
                  {reactivateSubscriptionMutation.isPending
                    ? "Reactivating..."
                    : "Reactivate Subscription"}
                </Button>
              </div>
            )}

            {/* Subscription Usage Statistics */}
            {subscriptionDetails.plan && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Current Usage</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tables</span>
                      <span>{subscriptionDetails.usage?.totalTables || 0} / {subscriptionDetails.plan.maxTables}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables 
                            ? 'bg-red-500' 
                            : (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables * 0.8 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(((subscriptionDetails.usage?.totalTables || 0) / subscriptionDetails.plan.maxTables) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bookings This Month</span>
                      <span>{subscriptionDetails.usage?.bookingsThisMonth || 0} / {subscriptionDetails.plan.maxBookingsPerMonth}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth 
                            ? 'bg-red-500' 
                            : (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth * 0.8 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(((subscriptionDetails.usage?.bookingsThisMonth || 0) / subscriptionDetails.plan.maxBookingsPerMonth) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
                {((subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables || 
                  (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You've reached your plan limits. Consider upgrading to continue using all features.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Available Subscription Plans */}
      {subscriptionPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Choose the plan that fits your restaurant's needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subscriptionPlans.map((plan: any) => {
                const isCurrentPlan = subscriptionDetails?.plan?.id === plan.id;
                const features = JSON.parse(plan.features || '[]');
                
                return (
                  <div 
                    key={plan.id}
                    className={`border rounded-lg p-4 ${
                      isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      {isCurrentPlan && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Current Plan
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-2xl font-bold">
                        ${(plan.price / 100).toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.interval}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-muted-foreground">
                        Up to {plan.maxTables} tables
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {plan.maxBookingsPerMonth} bookings/month
                      </div>
                    </div>

                    {features.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">Features:</div>
                        <ul className="space-y-1">
                          {features.slice(0, 3).map((feature: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center">
                              <Check className="h-3 w-3 text-green-500 mr-2" />
                              {feature}
                            </li>
                          ))}
                          {features.length > 3 && (
                            <li className="text-xs text-muted-foreground">
                              +{features.length - 3} more features
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {!isCurrentPlan && (
                      <Button 
                        className="w-full"
                        onClick={() => upgradeSubscriptionMutation.mutate(plan.id)}
                        disabled={upgradeSubscriptionMutation.isPending}
                      >
                        {upgradeSubscriptionMutation.isPending ? "Updating..." : "Upgrade to this Plan"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payment methods
              </CardDescription>
            </div>
            <Dialog
              open={addPaymentDialogOpen}
              onOpenChange={setAddPaymentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new payment method to your account
                  </DialogDescription>
                </DialogHeader>
                <Elements stripe={stripePromise}>
                  <AddPaymentMethodForm
                    onSuccess={handlePaymentMethodSuccess}
                  />
                </Elements>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {billingInfo?.paymentMethods?.length ? (
            <div className="space-y-3">
              {billingInfo.paymentMethods.map((pm) => (
                <PaymentMethodCard
                  key={pm.id}
                  paymentMethod={pm}
                  isDefault={pm.id === defaultPaymentMethod}
                  onSetDefault={() =>
                    setDefaultPaymentMethodMutation.mutate(pm.id)
                  }
                  onDelete={() => deletePaymentMethodMutation.mutate(pm.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment methods added yet</p>
              <p className="text-sm">
                Add a payment method to manage your subscription
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Invoice */}
      {billingInfo?.upcomingInvoice && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Invoice</CardTitle>
            <CardDescription>Your next billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  Next charge: $
                  {(billingInfo.upcomingInvoice.amount_due / 100).toFixed(2)}{" "}
                  {billingInfo.upcomingInvoice.currency.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Due:{" "}
                  {format(
                    new Date(billingInfo.upcomingInvoice.period_end * 1000),
                    "MMM dd, yyyy",
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center justify-between p-4 border rounded"
                >
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : invoicesData?.invoices?.length ? (
            <div className="space-y-3">
              {invoicesData.invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-12 w-12 mx-auto mb-4 opacity-50">📄</div>
              <p>No invoices found</p>
              <p className="text-sm">Your billing history will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
