import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PaymentMethodGuard } from "@/components/payment-method-guard";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Filter,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

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
  
  // Auto scroll to top when page loads
  useScrollToTop();
  
  // Invoice History filters and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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

  // Filter and pagination logic for invoices
  const filteredInvoices = (invoicesData?.invoices || []).filter((invoice: Invoice) => {
    const matchesSearch = searchTerm === "" || 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const invoiceDate = new Date(invoice.created * 1000);
      const now = new Date();
      switch (dateFilter) {
        case "last30":
          matchesDate = (now.getTime() - invoiceDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
          break;
        case "last90":
          matchesDate = (now.getTime() - invoiceDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
          break;
        case "thisYear":
          matchesDate = invoiceDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination for invoices
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "void":
        return <Badge className="bg-gray-500 text-white">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
      console.log("Subscription error:", error);
      
      // Handle detailed downgrade validation errors
      // The error might be nested in the response
      const errorData = error.response?.data || error;
      
      if (errorData.validationFailures) {
        const failures = errorData.validationFailures;
        const tableFailure = failures.find((f: any) => f.type === "table_limit");
        const bookingFailure = failures.find((f: any) => f.type === "booking_limit");
        
        let detailedMessage = errorData.message || error.message;
        
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
        // Show the server error message if available
        const message = errorData.message || error.message || "Failed to update subscription";
        toast({
          title: "Error",
          description: message,
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
        <PaymentMethodGuard requiredFor="subscription upgrade">
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
                
                // Determine if this is an upgrade or downgrade
                const currentPlan = subscriptionDetails?.plan;
                const isUpgrade = currentPlan && (plan.price > currentPlan.price || 
                  (plan.maxTables > currentPlan.maxTables) || 
                  (plan.maxBookingsPerMonth > currentPlan.maxBookingsPerMonth));
                const isDowngrade = currentPlan && (plan.price < currentPlan.price || 
                  (plan.maxTables < currentPlan.maxTables) || 
                  (plan.maxBookingsPerMonth < currentPlan.maxBookingsPerMonth));
                
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
                        variant={isDowngrade ? "destructive" : "default"}
                      >
                        {upgradeSubscriptionMutation.isPending ? "Updating..." : 
                         isDowngrade ? `Downgrade to ${plan.name}` : 
                         isUpgrade ? `Upgrade to ${plan.name}` : 
                         `Switch to ${plan.name}`}
                      </Button>
                    )}
                  </div>
                );
                })}
              </div>
            </CardContent>
          </Card>
        </PaymentMethodGuard>
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
          <CardTitle className="flex items-center gap-2">
            <Download className="h-6 w-6 text-green-600" />
            Invoice History
          </CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing History</h2>

          {/* Modern Filters Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6 mb-8"
          >
            {/* Filter Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filters</span>
                      {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                          {[
                            statusFilter !== 'all' ? 1 : 0,
                            dateFilter !== 'all' ? 1 : 0,
                            searchTerm ? 1 : 0
                          ].reduce((a, b) => a + b, 0)}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <Input
                              placeholder="Search by invoice number..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                            />
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-gray-200">
                              <SelectItem value="all" className="rounded-md">All Statuses</SelectItem>
                              <SelectItem value="paid" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Paid</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="open" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span>Open</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="void" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  <span>Void</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                          <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                              <SelectValue placeholder="All Time" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-gray-200">
                              <SelectItem value="all" className="rounded-md">All Time</SelectItem>
                              <SelectItem value="last30" className="rounded-md">Last 30 Days</SelectItem>
                              <SelectItem value="last90" className="rounded-md">Last 90 Days</SelectItem>
                              <SelectItem value="thisYear" className="rounded-md">This Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-end">
                          <Button variant="outline" className="h-11 flex items-center space-x-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                          </Button>
                        </div>
                      </div>

                      {/* Filter Actions */}
                      {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Active filters:</span>
                            {searchTerm && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                Search: "{searchTerm}"
                              </span>
                            )}
                            {statusFilter !== 'all' && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                Status: {statusFilter}
                              </span>
                            )}
                            {dateFilter !== 'all' && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                Date: {dateFilter.replace('last', 'Last ').replace('thisYear', 'This Year')}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setDateFilter("all");
                            }}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            Clear all
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm mt-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">INVOICE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">AMOUNT</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">STATUS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">DATE</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PERIOD</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                          <span className="text-gray-500 font-medium">Loading invoices...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <Download className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-medium">No invoices found</h3>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or check back later</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((invoice: Invoice, index: number) => (
                      <motion.tr 
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`group hover:bg-blue-50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              #
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">#{invoice.number}</div>
                              <div className="text-sm text-gray-500">Invoice ID: {invoice.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              ${(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                            </div>
                            {invoice.amount_due !== invoice.amount_paid && (
                              <div className="text-gray-500">
                                Due: ${(invoice.amount_due / 100).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getInvoiceStatusBadge(invoice.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {format(new Date(invoice.created * 1000), "MMM dd, yyyy")}
                            </div>
                            <div className="text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(invoice.created * 1000), "HH:mm")}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {invoice.period_start && invoice.period_end ? (
                              <>
                                {format(new Date(invoice.period_start * 1000), "MMM dd")} - {format(new Date(invoice.period_end * 1000), "MMM dd, yyyy")}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvoiceDetails(invoice)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {invoice.hosted_invoice_url && (
                              <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
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
                              <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0">
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
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-between px-6 py-4 border-t bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 h-8 text-sm"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "w-8 h-8 p-0 bg-green-600 hover:bg-green-700 text-white" : "w-8 h-8 p-0 hover:bg-green-50"}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 h-8 text-sm"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Invoice Details - #{selectedInvoice?.number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5" />
                    Invoice Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Invoice Number</label>
                      <p className="text-lg">#{selectedInvoice.number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Amount</label>
                      <p className="text-lg">${(selectedInvoice.amount_paid / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">{getInvoiceStatusBadge(selectedInvoice.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-lg">
                        {format(new Date(selectedInvoice.created * 1000), "MMM dd, yyyy")}
                      </p>
                    </div>
                    {selectedInvoice.period_start && selectedInvoice.period_end && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Service Period</label>
                          <p className="text-lg">
                            {format(new Date(selectedInvoice.period_start * 1000), "MMM dd")} - {format(new Date(selectedInvoice.period_end * 1000), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </>
                    )}
                    {selectedInvoice.amount_due !== selectedInvoice.amount_paid && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Amount Due</label>
                        <p className="text-lg">${(selectedInvoice.amount_due / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {selectedInvoice.hosted_invoice_url && (
                  <Button asChild className="flex items-center gap-2">
                    <a
                      href={selectedInvoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="w-4 h-4" />
                      View Invoice
                    </a>
                  </Button>
                )}
                {selectedInvoice.invoice_pdf && (
                  <Button variant="outline" asChild className="flex items-center gap-2">
                    <a
                      href={selectedInvoice.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                  </Button>
                )}
                <Button onClick={handleCloseInvoiceModal} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
