
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
  Zap,
  Crown,
  Shield,
  Sparkles,
  TrendingUp,
  Activity,
  DollarSign,
  FileText,
  Settings,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white hover:border-blue-300 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl"></div>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1f2937",
                fontFamily: '"Inter", system-ui, sans-serif',
                "::placeholder": {
                  color: "#9ca3af",
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading || setupIntentMutation.isPending}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
      >
        {isLoading || setupIntentMutation.isPending ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Adding Payment Method...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Add Payment Method</span>
          </div>
        )}
      </Button>
    </motion.form>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden"
    >
      <Card className={`relative border-2 transition-all duration-300 ${
        isDefault 
          ? 'border-gradient-to-r from-blue-500 to-purple-500 bg-gradient-to-br from-blue-50 to-purple-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isDefault 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">
                  {brandIcon} •••• {paymentMethod.card.last4}
                </div>
                <div className="text-sm text-gray-500">
                  Expires {paymentMethod.card.exp_month.toString().padStart(2, '0')}/
                  {paymentMethod.card.exp_year.toString().slice(-2)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isDefault ? (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSetDefault}
                  className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  Set Default
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InvoiceRow = ({ invoice }: { invoice: Invoice }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors">
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
    <motion.div 
      className="flex items-center justify-between p-6 border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300 group"
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1">
        <div className="font-semibold text-lg text-gray-900">#{invoice.number}</div>
        <div className="text-sm text-gray-500 mt-1">
          {format(new Date(invoice.created * 1000), "MMM dd, yyyy 'at' h:mm a")}
        </div>
        {invoice.period_start && invoice.period_end && (
          <div className="text-xs text-gray-400 mt-1 flex items-center">
            <CalendarIcon className="w-3 h-3 mr-1" />
            Service period: {format(new Date(invoice.period_start * 1000), "MMM dd")} - {format(new Date(invoice.period_end * 1000), "MMM dd, yyyy")}
          </div>
        )}
      </div>
      <div className="text-right space-y-2 mr-6">
        <div className="font-bold text-xl text-gray-900">
          ${(invoice.amount_paid / 100).toFixed(2)}
        </div>
        <div className="text-sm text-gray-500 uppercase tracking-wide">
          {invoice.currency}
        </div>
        {getStatusBadge(invoice.status)}
      </div>
      <div className="flex space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
        {invoice.hosted_invoice_url && (
          <Button variant="outline" size="sm" asChild className="hover:bg-blue-50 transition-colors">
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-4 w-4" />
            </a>
          </Button>
        )}
        {invoice.invoice_pdf && (
          <Button variant="outline" size="sm" asChild className="hover:bg-green-50 transition-colors">
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
    </motion.div>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8">
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-pulse"></div>
            <div className="grid gap-8">
              <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl animate-pulse"></div>
              <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const defaultPaymentMethod =
    billingInfo?.customer?.invoice_settings?.default_payment_method;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header Section */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Billing & Subscription
            </h1>
            <p className="text-gray-600 mt-2">Manage your subscription, payment methods, and billing history</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-full p-3 shadow-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="bg-white rounded-full p-3 shadow-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Subscription Status */}
        {subscriptionDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-full p-3">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Current Subscription</CardTitle>
                    <CardDescription className="text-gray-600">
                      Manage your subscription plan and billing preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-2xl text-gray-900">
                        {subscriptionDetails.plan?.name || "Free Trial"}
                      </div>
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-lg text-gray-600">
                      {subscriptionDetails.plan
                        ? `$${(subscriptionDetails.plan.price / 100).toFixed(2)}/${subscriptionDetails.plan.interval}`
                        : "No active subscription"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`px-4 py-2 text-sm font-semibold ${
                        subscriptionDetails.tenant.subscriptionStatus === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : subscriptionDetails.tenant.subscriptionStatus === "trial"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-red-100 text-red-800 border-red-200"
                      }`}
                    >
                      <Activity className="w-3 h-3 mr-1" />
                      {subscriptionDetails.tenant.subscriptionStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {subscriptionDetails.tenant.subscriptionEndDate && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {subscriptionDetails.tenant.subscriptionStatus === "cancelled"
                        ? "Expires"
                        : "Next billing"}
                      :{" "}
                      {format(
                        new Date(subscriptionDetails.tenant.subscriptionEndDate),
                        "MMM dd, yyyy",
                      )}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  {subscriptionDetails.tenant.subscriptionStatus === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => cancelSubscriptionMutation.mutate()}
                      disabled={cancelSubscriptionMutation.isPending}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                    >
                      {cancelSubscriptionMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      )}
                      {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                    </Button>
                  )}

                  {subscriptionDetails.tenant.subscriptionStatus === "cancelled" && subscriptionDetails.tenant.subscriptionEndDate && (
                    <div className="space-y-4 w-full">
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
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
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                      >
                        {reactivateSubscriptionMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription"}
                      </Button>
                    </div>
                  )}

                  {subscriptionDetails.tenant.subscriptionStatus !== "active" && 
                   subscriptionDetails.tenant.subscriptionStatus !== "trial" && 
                   subscriptionDetails.tenant.subscriptionStatus !== "cancelled" && 
                   subscriptionDetails.plan && (
                    <Button
                      onClick={() => reactivateSubscriptionMutation.mutate()}
                      disabled={reactivateSubscriptionMutation.isPending}
                      variant="outline"
                      className="hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all duration-200"
                    >
                      {reactivateSubscriptionMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription"}
                    </Button>
                  )}
                </div>

                {/* Subscription Usage Statistics */}
                {subscriptionDetails.plan && (
                  <div className="space-y-6 border-t pt-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-lg text-gray-900">Current Usage</h4>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Tables</span>
                          <span className="font-bold text-gray-900">
                            {subscriptionDetails.usage?.totalTables || 0} / {subscriptionDetails.plan.maxTables}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-700 ${
                              (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables * 0.8 
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500'
                            }`}
                            style={{ 
                              width: `${Math.min(((subscriptionDetails.usage?.totalTables || 0) / subscriptionDetails.plan.maxTables) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Bookings This Month</span>
                          <span className="font-bold text-gray-900">
                            {subscriptionDetails.usage?.bookingsThisMonth || 0} / {subscriptionDetails.plan.maxBookingsPerMonth}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-700 ${
                              (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth * 0.8 
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500'
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
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          You've reached your plan limits. Consider upgrading to continue using all features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Available Subscription Plans */}
        {subscriptionPlans.length > 0 && (
          <PaymentMethodGuard requiredFor="subscription upgrade">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-0 shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-6 w-6" />
                    <div>
                      <CardTitle className="text-2xl font-bold">Subscription Plans</CardTitle>
                      <CardDescription className="text-blue-100">
                        Choose the plan that fits your restaurant's needs
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {subscriptionPlans.map((plan: any, index: number) => {
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
                          <motion.div 
                            key={plan.id}
                            className={`relative border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg transform hover:scale-105 ${
                              isCurrentPlan 
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl' 
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                          >
                            {isCurrentPlan && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Current Plan
                                </Badge>
                              </div>
                            )}
                            
                            <div className="text-center mb-6">
                              <h3 className="font-bold text-xl text-gray-900 mb-2">{plan.name}</h3>
                              <div className="flex items-baseline justify-center">
                                <span className="text-4xl font-bold text-gray-900">
                                  ${(plan.price / 100).toFixed(0)}
                                </span>
                                <span className="text-gray-500 ml-1">/{plan.interval}</span>
                              </div>
                            </div>

                            <div className="space-y-4 mb-6">
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Tables</span>
                                <span className="font-semibold text-gray-900">{plan.maxTables}</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Bookings/month</span>
                                <span className="font-semibold text-gray-900">{plan.maxBookingsPerMonth}</span>
                              </div>
                            </div>

                            {features.length > 0 && (
                              <div className="mb-6">
                                <div className="text-sm font-semibold text-gray-700 mb-3">Features:</div>
                                <ul className="space-y-2">
                                  {features.slice(0, 3).map((feature: string, featureIndex: number) => (
                                    <li key={featureIndex} className="text-sm text-gray-600 flex items-center">
                                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                  {features.length > 3 && (
                                    <li className="text-xs text-gray-500 italic">
                                      +{features.length - 3} more features
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {!isCurrentPlan && (
                              <Button 
                                className={`w-full h-12 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                                  isDowngrade 
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                                }`}
                                onClick={() => upgradeSubscriptionMutation.mutate(plan.id)}
                                disabled={upgradeSubscriptionMutation.isPending}
                              >
                                {upgradeSubscriptionMutation.isPending ? (
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Zap className="w-4 h-4 mr-2" />
                                )}
                                {upgradeSubscriptionMutation.isPending ? "Updating..." : 
                                 isDowngrade ? `Downgrade to ${plan.name}` : 
                                 isUpgrade ? `Upgrade to ${plan.name}` : 
                                 `Switch to ${plan.name}`}
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </PaymentMethodGuard>
        )}

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-0 shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-2xl font-bold">Payment Methods</CardTitle>
                    <CardDescription className="text-green-100">
                      Manage your saved payment methods securely
                    </CardDescription>
                  </div>
                </div>
                <Dialog
                  open={addPaymentDialogOpen}
                  onOpenChange={setAddPaymentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-white text-green-600 hover:bg-gray-100 transition-colors">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span>Add Payment Method</span>
                      </DialogTitle>
                      <DialogDescription>
                        Add a new payment method to your account securely
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
            <CardContent className="p-8">
              {billingInfo?.paymentMethods?.length ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {billingInfo.paymentMethods.map((pm, index) => (
                      <motion.div
                        key={pm.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <PaymentMethodCard
                          paymentMethod={pm}
                          isDefault={pm.id === defaultPaymentMethod}
                          onSetDefault={() =>
                            setDefaultPaymentMethodMutation.mutate(pm.id)
                          }
                          onDelete={() => deletePaymentMethodMutation.mutate(pm.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No payment methods yet</h3>
                  <p className="text-gray-500 mb-6">
                    Add a payment method to manage your subscription and billing
                  </p>
                  <Button
                    onClick={() => setAddPaymentDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Payment Method
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Invoice */}
        {billingInfo?.upcomingInvoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Upcoming Invoice</CardTitle>
                    <CardDescription className="text-gray-600">Your next billing cycle</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="font-bold text-2xl text-gray-900">
                      ${(billingInfo.upcomingInvoice.amount_due / 100).toFixed(2)}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        {billingInfo.upcomingInvoice.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        Due: {format(new Date(billingInfo.upcomingInvoice.period_end * 1000), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-full p-4 shadow-lg">
                    <FileText className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Invoice History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="border-0 shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center space-x-3">
                <Download className="h-6 w-6" />
                <div>
                  <CardTitle className="text-2xl font-bold">Invoice History</CardTitle>
                  <CardDescription className="text-purple-100">
                    View and download your past invoices
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {/* Modern Filters Section */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="space-y-6 mb-8"
              >
                {/* Filter Controls Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-12 px-6 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 flex items-center space-x-2 font-medium rounded-xl"
                        >
                          <Filter className="w-4 h-4" />
                          <span>Filters</span>
                          {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
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

                      <CollapsibleContent className="mt-6">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Search Input */}
                            <div className="relative">
                              <label className="block text-sm font-semibold text-gray-700 mb-3">Search Invoices</label>
                              <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                <Input
                                  placeholder="Search by invoice number..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-12 h-12 border-2 border-gray-200 focus:border-purple-500 focus:ring-0 rounded-xl transition-all duration-200"
                                />
                              </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-purple-500 rounded-xl transition-all duration-200">
                                  <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-200">
                                  <SelectItem value="all" className="rounded-lg">All Statuses</SelectItem>
                                  <SelectItem value="paid" className="rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span>Paid</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="open" className="rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                      <span>Open</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="void" className="rounded-lg">
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
                              <label className="block text-sm font-semibold text-gray-700 mb-3">Date Range</label>
                              <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-purple-500 rounded-xl transition-all duration-200">
                                  <SelectValue placeholder="All Time" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-200">
                                  <SelectItem value="all" className="rounded-lg">All Time</SelectItem>
                                  <SelectItem value="last30" className="rounded-lg">Last 30 Days</SelectItem>
                                  <SelectItem value="last90" className="rounded-lg">Last 90 Days</SelectItem>
                                  <SelectItem value="thisYear" className="rounded-lg">This Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-end">
                              <Button 
                                variant="outline" 
                                className="h-12 flex items-center space-x-2 hover:bg-purple-50 hover:border-purple-500 transition-all duration-200 rounded-xl font-semibold"
                              >
                                <Download className="w-4 h-4" />
                                <span>Export All</span>
                              </Button>
                            </div>
                          </div>

                          {/* Filter Actions */}
                          {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <span className="font-medium">Active filters:</span>
                                {searchTerm && (
                                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                                    Search: "{searchTerm}"
                                  </span>
                                )}
                                {statusFilter !== 'all' && (
                                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                                    Status: {statusFilter}
                                  </span>
                                )}
                                {dateFilter !== 'all' && (
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
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
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                              >
                                Clear all filters
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Invoice List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="space-y-4"
              >
                {invoicesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
                    <span className="text-gray-600 font-medium">Loading invoices...</span>
                  </div>
                ) : paginatedInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                        ? "Try adjusting your filters to see more results" 
                        : "Your invoices will appear here once you start using our services"}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {paginatedInvoices.map((invoice: Invoice, index: number) => (
                      <motion.div 
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <InvoiceRow invoice={invoice} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 font-medium">Show</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-10 border-2 border-gray-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600 font-medium">entries</span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-sm text-gray-600 font-medium">
                      {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 h-10 text-sm rounded-lg border-2 hover:border-purple-300"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-10 h-10 p-0 rounded-lg border-2 hover:border-purple-300"
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
                              className={`w-10 h-10 p-0 rounded-lg border-2 ${
                                currentPage === pageNum 
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-purple-500" 
                                  : "hover:border-purple-300 hover:bg-purple-50"
                              }`}
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
                        className="w-10 h-10 p-0 rounded-lg border-2 hover:border-purple-300"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 h-10 text-sm rounded-lg border-2 hover:border-purple-300"
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoice Detail Modal */}
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-2">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span>Invoice Details - #{selectedInvoice?.number}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Information */}
                <Card className="border-2 border-gray-100">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-gray-600" />
                      Invoice Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Invoice Number</label>
                        <p className="text-xl font-bold text-gray-900">#{selectedInvoice.number}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Amount</label>
                        <p className="text-xl font-bold text-gray-900">
                          ${(selectedInvoice.amount_paid / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</label>
                        <div className="mt-1">{getInvoiceStatusBadge(selectedInvoice.status)}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Created</label>
                        <p className="text-xl font-bold text-gray-900">
                          {format(new Date(selectedInvoice.created * 1000), "MMM dd, yyyy")}
                        </p>
                      </div>
                      {selectedInvoice.period_start && selectedInvoice.period_end && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Service Period</label>
                          <p className="text-lg text-gray-900">
                            {format(new Date(selectedInvoice.period_start * 1000), "MMM dd")} - {format(new Date(selectedInvoice.period_end * 1000), "MMM dd, yyyy")}
                          </p>
                        </div>
                      )}
                      {selectedInvoice.amount_due !== selectedInvoice.amount_paid && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Amount Due</label>
                          <p className="text-xl font-bold text-red-600">
                            ${(selectedInvoice.amount_due / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {selectedInvoice.hosted_invoice_url && (
                    <Button asChild className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
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
                    <Button variant="outline" asChild className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300">
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
    </div>
  );
}
